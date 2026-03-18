const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'untimeout',
    aliases: ['unmute', 'unto'],
    description: 'Remove timeout from a user',
    usage: 'untimeout @user [reason]',
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
            return message.reply('❌ Please mention a user to remove timeout from.');
        }

        if (!target.isCommunicationDisabled()) {
            return message.reply('❌ This user is not timed out.');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await target.timeout(null, `${message.author.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setTitle('🔊 Timeout Removed')
                .setDescription(`**${target.user.tag}**\'s timeout has been removed.`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: '👮 Moderator', value: `${message.author.tag}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                )
                .setColor('#00FF00')
                .setTimestamp()
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }));

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error removing timeout:', error);
            message.reply('❌ An error occurred while trying to remove the timeout.');
        }
    }
};
