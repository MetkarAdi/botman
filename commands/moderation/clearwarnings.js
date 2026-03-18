const { EmbedBuilder } = require('discord.js');
const Warning = require('../../models/Warning');

module.exports = {
    name: 'clearwarnings',
    aliases: ['clearwarns', 'cw'],
    description: 'Clear all warnings for a user',
    usage: 'clearwarnings @user',
    category: 'moderation',
    guildOnly: true,
    permissions: ['Administrator'],
    botPermissions: ['ModerateMembers'],
    cooldown: 10,

    async execute(message, args, client, guildData) {
        if (!guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        const target = message.mentions.users.first();
        if (!target) {
            return message.reply('❌ Please mention a user to clear warnings for.');
        }

        try {
            const result = await Warning.deleteMany({
                userId: target.id,
                guildId: message.guild.id
            });

            const embed = new EmbedBuilder()
                .setTitle('🧹 Warnings Cleared')
                .setDescription(`All warnings for **${target.tag}** have been cleared.`)
                .addFields(
                    { name: '👤 User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: '👮 Cleared By', value: `${message.author.tag}`, inline: true },
                    { name: '📊 Warnings Removed', value: `${result.deletedCount}`, inline: true }
                )
                .setColor('#00FF00')
                .setTimestamp()
                .setThumbnail(target.displayAvatarURL({ dynamic: true }));

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error clearing warnings:', error);
            message.reply('❌ An error occurred while trying to clear warnings.');
        }
    }
};
