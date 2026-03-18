const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'unban',
    description: 'Unban a user from the server',
    usage: 'unban <user_id> [reason]',
    category: 'moderation',
    guildOnly: true,
    permissions: ['BanMembers'],
    botPermissions: ['BanMembers'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        const userId = args[0];
        if (!userId) {
            return message.reply('❌ Please provide a user ID to unban.');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            // Check if user is banned
            const banList = await message.guild.bans.fetch();
            const bannedUser = banList.get(userId);

            if (!bannedUser) {
                return message.reply('❌ This user is not banned from the server.');
            }

            await message.guild.members.unban(userId, `${message.author.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setTitle('🔓 User Unbanned')
                .setDescription(`**${bannedUser.user.tag}** has been unbanned.`)
                .addFields(
                    { name: '👤 User', value: `${bannedUser.user.tag} (${userId})`, inline: true },
                    { name: '👮 Moderator', value: `${message.author.tag}`, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                )
                .setColor('#00FF00')
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error unbanning user:', error);
            message.reply('❌ An error occurred while trying to unban the user. Make sure the ID is correct.');
        }
    }
};
