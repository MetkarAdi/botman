const { EmbedBuilder } = require('discord.js');
const LogConfig = require('../models/LogConfig');

module.exports = {
    name: 'guildBanRemove',
    async execute(ban, client) {
        try {
            const logConfig = await LogConfig.findOne({ guildId: ban.guild.id });
            if (!logConfig?.enabled || !logConfig.banRemove || !logConfig.logChannel) return;

            const logChannel = ban.guild.channels.cache.get(logConfig.logChannel);
            if (!logChannel) return;

            // Fetch audit log to get who unbanned
            const auditLogs = await ban.guild.fetchAuditLogs({
                type: 23, // MEMBER_BAN_REMOVE
                limit: 1
            });
            const unbanLog = auditLogs.entries.first();
            const executor = unbanLog?.executor;

            const embed = new EmbedBuilder()
                .setTitle('🔓 Member Unbanned')
                .setColor('#00FF00')
                .addFields(
                    { name: '👤 User', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                    { name: '👮 Unbanned By', value: executor ? `${executor.tag} (${executor.id})` : 'Unknown', inline: true }
                )
                .setThumbnail(ban.user.displayAvatarURL())
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error logging ban remove:', error);
        }
    }
};
