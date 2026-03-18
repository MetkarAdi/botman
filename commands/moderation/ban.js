const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ban',
    description: 'Ban a user from the server',
    usage: 'ban @user [reason]',
    category: 'moderation',
    guildOnly: true,
    permissions: ['BanMembers'],
    botPermissions: ['BanMembers'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply('❌ Please mention a user to ban.');
        }

        if (!target.bannable) {
            return message.reply('❌ I cannot ban this user. They may have higher permissions than me.');
        }

        if (target.id === message.author.id) {
            return message.reply('❌ You cannot ban yourself.');
        }

        if (target.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply('❌ You cannot ban a user with equal or higher role than you.');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await target.ban({ reason: `${message.author.tag}: ${reason}` });

            const embed = new EmbedBuilder()
                .setTitle('🔨 User Banned')
                .setDescription(`**${target.user.tag}** has been banned from the server.`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: '👮 Moderator', value: `${message.author.tag}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                )
                .setColor('#FF0000')
                .setTimestamp()
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }));

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error banning user:', error);
            message.reply('❌ An error occurred while trying to ban the user.');
        }
    }
};
