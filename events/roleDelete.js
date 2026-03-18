const { EmbedBuilder } = require('discord.js');
const LogConfig = require('../models/LogConfig');

module.exports = {
    name: 'roleDelete',
    async execute(role, client) {
        try {
            const logConfig = await LogConfig.findOne({ guildId: role.guild.id });
            if (!logConfig?.enabled || !logConfig.roleDelete || !logConfig.logChannel) return;

            const logChannel = role.guild.channels.cache.get(logConfig.logChannel);
            if (!logChannel) return;

            // Fetch audit log to get who deleted the role
            const auditLogs = await role.guild.fetchAuditLogs({
                type: 32, // ROLE_DELETE
                limit: 1
            });
            const deleteLog = auditLogs.entries.first();
            const executor = deleteLog?.executor;

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Role Deleted')
                .setColor(role.color || '#FF0000')
                .addFields(
                    { name: '📝 Name', value: role.name, inline: true },
                    { name: '🎨 Color', value: role.hexColor, inline: true },
                    { name: '🆔 Role ID', value: role.id, inline: true },
                    { name: '👮 Deleted By', value: executor ? `${executor.tag} (${executor.id})` : 'Unknown', inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error logging role delete:', error);
        }
    }
};
