const { EmbedBuilder, ChannelType } = require('discord.js');
const LogConfig = require('../models/LogConfig');

module.exports = {
    name: 'channelCreate',
    async execute(channel, client) {
        if (!channel.guild) return;

        try {
            const logConfig = await LogConfig.findOne({ guildId: channel.guild.id });
            if (!logConfig?.enabled || !logConfig.channelCreate || !logConfig.logChannel) return;

            const logChannel = channel.guild.channels.cache.get(logConfig.logChannel);
            if (!logChannel) return;

            // Fetch audit log to get who created the channel
            const auditLogs = await channel.guild.fetchAuditLogs({
                type: 10, // CHANNEL_CREATE
                limit: 1
            });
            const createLog = auditLogs.entries.first();
            const executor = createLog?.executor;

            const channelTypeNames = {
                [ChannelType.GuildText]: 'Text Channel',
                [ChannelType.GuildVoice]: 'Voice Channel',
                [ChannelType.GuildCategory]: 'Category',
                [ChannelType.GuildAnnouncement]: 'Announcement Channel',
                [ChannelType.GuildForum]: 'Forum Channel',
                [ChannelType.GuildStageVoice]: 'Stage Channel'
            };

            const embed = new EmbedBuilder()
                .setTitle('📺 Channel Created')
                .setColor('#00FF00')
                .addFields(
                    { name: '📝 Name', value: channel.name, inline: true },
                    { name: '📂 Type', value: channelTypeNames[channel.type] || 'Unknown', inline: true },
                    { name: '🆔 Channel ID', value: channel.id, inline: true },
                    { name: '👮 Created By', value: executor ? `${executor.tag} (${executor.id})` : 'Unknown', inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error logging channel create:', error);
        }
    }
};
