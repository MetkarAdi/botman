const { EmbedBuilder } = require('discord.js');
const { parseTime, formatDuration } = require('../../utils/helpers');

module.exports = {
    name: 'timeout',
    aliases: ['mute', 'to'],
    description: 'Timeout a user for a specified duration',
    usage: 'timeout @user <duration> [reason]',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ModerateMembers'],
    botPermissions: ['ModerateMembers'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply('❌ Please mention a user to timeout.');
        }

        if (!target.moderatable) {
            return message.reply('❌ I cannot timeout this user. They may have higher permissions than me.');
        }

        if (target.id === message.author.id) {
            return message.reply('❌ You cannot timeout yourself.');
        }

        if (target.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply('❌ You cannot timeout a user with equal or higher role than you.');
        }

        const durationArg = args[1];
        if (!durationArg) {
            return message.reply('❌ Please specify a duration (e.g., 1h, 30m, 1d).');
        }

        const duration = parseTime(durationArg);
        if (duration === 0) {
            return message.reply('❌ Invalid duration format. Use format like: 1h, 30m, 1d, 1w');
        }

        // Max timeout is 28 days
        const maxTimeout = 28 * 24 * 60 * 60 * 1000;
        if (duration > maxTimeout) {
            return message.reply('❌ Timeout duration cannot exceed 28 days.');
        }

        const reason = args.slice(2).join(' ') || 'No reason provided';

        try {
            await target.timeout(duration, `${message.author.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setTitle('🔇 User Timed Out')
                .setDescription(`**${target.user.tag}** has been timed out.`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: '👮 Moderator', value: `${message.author.tag}`, inline: true },
                    { name: '⏱️ Duration', value: formatDuration(duration), inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                )
                .setColor('#FFFF00')
                .setTimestamp()
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }));

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error timing out user:', error);
            message.reply('❌ An error occurred while trying to timeout the user.');
        }
    }
};
