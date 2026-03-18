const { EmbedBuilder } = require('discord.js');
const LogConfig = require('../models/LogConfig');

module.exports = {
    name: 'roleCreate',
    async execute(role, client) {
        try {
            const logConfig = await LogConfig.findOne({ guildId: role.guild.id });
            if (!logConfig?.enabled || !logConfig.roleCreate || !logConfig.logChannel) return;

            const logChannel = role.guild.channels.cache.get(logConfig.logChannel);
            if (!logChannel) return;

            // Fetch audit log to get who created the role
            const auditLogs = await role.guild.fetchAuditLogs({
                type: 30, // ROLE_CREATE
                limit: 1
            });
            const createLog = auditLogs.entries.first();
            const executor = createLog?.executor;

            const embed = new EmbedBuilder()
                .setTitle('🎭 Role Created')
                .setColor(role.color || '#00FF00')
                .addFields(
                    { name: '📝 Name', value: role.name, inline: true },
                    { name: '🎨 Color', value: role.hexColor, inline: true },
                    { name: '🆔 Role ID', value: role.id, inline: true },
                    { name: '📌 Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
                    { name: '👮 Created By', value: executor ? `${executor.tag} (${executor.id})` : 'Unknown', inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error logging role create:', error);
        }
    }
};
