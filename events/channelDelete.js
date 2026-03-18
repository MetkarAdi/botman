const { EmbedBuilder, ChannelType } = require('discord.js');
const LogConfig = require('../models/LogConfig');

module.exports = {
    name: 'channelDelete',
    async execute(channel, client) {
        if (!channel.guild) return;

        try {
            const logConfig = await LogConfig.findOne({ guildId: channel.guild.id });
            if (!logConfig?.enabled || !logConfig.channelDelete || !logConfig.logChannel) return;

            const logChannel = channel.guild.channels.cache.get(logConfig.logChannel);
            if (!logChannel) return;

            // Fetch audit log to get who deleted the channel
            const auditLogs = await channel.guild.fetchAuditLogs({
                type: 12, // CHANNEL_DELETE
                limit: 1
            });
            const deleteLog = auditLogs.entries.first();
            const executor = deleteLog?.executor;

            const channelTypeNames = {
                [ChannelType.GuildText]: 'Text Channel',
                [ChannelType.GuildVoice]: 'Voice Channel',
                [ChannelType.GuildCategory]: 'Category',
                [ChannelType.GuildAnnouncement]: 'Announcement Channel',
                [ChannelType.GuildForum]: 'Forum Channel',
                [ChannelType.GuildStageVoice]: 'Stage Channel'
            };

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Channel Deleted')
                .setColor('#FF0000')
                .addFields(
                    { name: '📝 Name', value: channel.name, inline: true },
                    { name: '📂 Type', value: channelTypeNames[channel.type] || 'Unknown', inline: true },
                    { name: '🆔 Channel ID', value: channel.id, inline: true },
                    { name: '👮 Deleted By', value: executor ? `${executor.tag} (${executor.id})` : 'Unknown', inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error logging channel delete:', error);
        }
    }
};
