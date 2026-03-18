const { EmbedBuilder } = require('discord.js');
const LogConfig = require('../models/LogConfig');

module.exports = {
    name: 'guildBanAdd',
    async execute(ban, client) {
        try {
            const logConfig = await LogConfig.findOne({ guildId: ban.guild.id });
            if (!logConfig?.enabled || !logConfig.banAdd || !logConfig.logChannel) return;

            const logChannel = ban.guild.channels.cache.get(logConfig.logChannel);
            if (!logChannel) return;

            // Fetch audit log to get who banned
            const auditLogs = await ban.guild.fetchAuditLogs({
                type: 22, // MEMBER_BAN_ADD
                limit: 1
            });
            const banLog = auditLogs.entries.first();
            const executor = banLog?.executor;

            const embed = new EmbedBuilder()
                .setTitle('🔨 Member Banned')
                .setColor('#FF0000')
                .addFields(
                    { name: '👤 User', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                    { name: '👮 Banned By', value: executor ? `${executor.tag} (${executor.id})` : 'Unknown', inline: true }
                )
                .setThumbnail(ban.user.displayAvatarURL())
                .setTimestamp();

            if (ban.reason) {
                embed.addFields({ name: '📝 Reason', value: ban.reason, inline: false });
            }

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error logging ban add:', error);
        }
    }
};
