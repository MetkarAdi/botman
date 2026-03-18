const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'kick',
    description: 'Kick a user from the server',
    usage: 'kick @user [reason]',
    category: 'moderation',
    guildOnly: true,
    permissions: ['KickMembers'],
    botPermissions: ['KickMembers'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply('❌ Please mention a user to kick.');
        }

        if (!target.kickable) {
            return message.reply('❌ I cannot kick this user. They may have higher permissions than me.');
        }

        if (target.id === message.author.id) {
            return message.reply('❌ You cannot kick yourself.');
        }

        if (target.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply('❌ You cannot kick a user with equal or higher role than you.');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await target.kick(`${message.author.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setTitle('👢 User Kicked')
                .setDescription(`**${target.user.tag}** has been kicked from the server.`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: '👮 Moderator', value: `${message.author.tag}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                )
                .setColor('#FFA500')
                .setTimestamp()
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }));

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error kicking user:', error);
            message.reply('❌ An error occurred while trying to kick the user.');
        }
    }
};
