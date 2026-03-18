const { EmbedBuilder } = require('discord.js');
const Warning = require('../../models/Warning');

module.exports = {
    name: 'delwarn',
    aliases: ['deletewarn', 'removewarn', 'rw'],
    description: 'Delete a warning by its ID',
    usage: 'delwarn <warning_id>',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ModerateMembers'],
    botPermissions: ['ModerateMembers'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        const warningId = args[0];
        if (!warningId) {
            return message.reply('❌ Please provide a warning ID to delete.');
        }

        try {
            const warning = await Warning.findOne({
                warningId: warningId.toUpperCase(),
                guildId: message.guild.id
            });

            if (!warning) {
                return message.reply('❌ Warning not found. Please check the ID and try again.');
            }

            const target = await client.users.fetch(warning.userId).catch(() => null);

            await Warning.deleteOne({ warningId: warningId.toUpperCase() });

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Warning Deleted')
                .setDescription(`Warning \`${warningId.toUpperCase()}\` has been deleted.`)
                .addFields(
                    { name: '👤 User', value: target ? `${target.tag} (${warning.userId})` : warning.userId, inline: true },
                    { name: '👮 Deleted By', value: `${message.author.tag}`, inline: true },
                    { name: '📝 Original Reason', value: warning.reason, inline: false }
                )
                .setColor('#00FF00')
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error deleting warning:', error);
            message.reply('❌ An error occurred while trying to delete the warning.');
        }
    }
};
