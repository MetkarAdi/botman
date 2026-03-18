const { EmbedBuilder } = require('discord.js');
const LogConfig = require('../models/LogConfig');
const Snipe = require('../models/Snipe');

module.exports = {
    name: 'messageDelete',
    async execute(message, client) {
        if (!message.guild) return;
        if (message.author?.bot) return;

        const isPartial = !message.author;

        // Store in snipe only if message is cached (has author info)
        if (!isPartial && message.content !== undefined) {
            try {
                await Snipe.findOneAndUpdate(
                    { channelId: message.channel.id },
                    {
                        $set: {
                            channelId: message.channel.id,
                            guildId: message.guild.id,
                            messageId: message.id,
                            authorId: message.author.id,
                            authorTag: message.author.tag,
                            authorAvatar: message.author.displayAvatarURL({ dynamic: true }),
                            content: message.content || null,
                            attachments: [...message.attachments.values()].map(a => a.url),
                            embeds: message.embeds.length,
                            timestamp: new Date()
                        }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                console.log(`[Snipe] Stored deleted message in #${message.channel.name} by ${message.author.tag}`);
            } catch (error) {
                console.error('[Snipe] Error storing snipe:', error.message);
            }
        } else {
            console.log(`[Snipe] Skipped — message was uncached (partial: ${isPartial})`);
        }

        // Log to log channel
        try {
            const logConfig = await LogConfig.findOne({ guildId: message.guild.id });
            if (!logConfig?.enabled || !logConfig.messageDelete || !logConfig.logChannel) return;

            const logChannel = message.guild.channels.cache.get(logConfig.logChannel);
            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Message Deleted')
                .setColor('#FF0000')
                .addFields(
                    {
                        name: '👤 Author',
                        value: isPartial ? '*Unknown (uncached)*' : `${message.author.tag} (${message.author.id})`,
                        inline: true
                    },
                    { name: '📺 Channel', value: `${message.channel} (${message.channel.id})`, inline: true },
                    {
                        name: '📄 Content',
                        value: message.content ? message.content.substring(0, 1024) : '*No text content*',
                        inline: false
                    }
                )
                .setFooter({ text: `Message ID: ${message.id}` })
                .setTimestamp();

            if (!isPartial) embed.setThumbnail(message.author.displayAvatarURL());

            if (message.attachments?.size > 0) {
                embed.addFields({
                    name: '📎 Attachments',
                    value: [...message.attachments.values()].map(a => `[${a.name}](${a.url})`).join('\n').substring(0, 1024),
                    inline: false
                });
            }

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('[Log] Error logging message delete:', error.message);
        }
    }
};