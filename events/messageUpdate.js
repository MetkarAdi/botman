const { EmbedBuilder } = require('discord.js');
const LogConfig = require('../models/LogConfig');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage, client) {
        // Ignore DMs, bots, and messages with no content change
        if (!newMessage.guild || newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        try {
            const logConfig = await LogConfig.findOne({ guildId: newMessage.guild.id });
            if (!logConfig?.enabled || !logConfig.messageEdit || !logConfig.logChannel) return;

            const logChannel = newMessage.guild.channels.cache.get(logConfig.logChannel);
            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setTitle('✏️ Message Edited')
                .setColor('#FFFF00')
                .addFields(
                    { name: '👤 Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
                    { name: '📺 Channel', value: `${newMessage.channel} (${newMessage.channel.id})`, inline: true },
                    { name: '🔗 Jump to Message', value: `[Click Here](${newMessage.url})`, inline: true },
                    { name: '📝 Before', value: oldMessage.content ? oldMessage.content.substring(0, 1024) : '*No text content*', inline: false },
                    { name: '📝 After', value: newMessage.content ? newMessage.content.substring(0, 1024) : '*No text content*', inline: false }
                )
                .setThumbnail(newMessage.author.displayAvatarURL())
                .setFooter({ text: `Message ID: ${newMessage.id}` })
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error logging message edit:', error);
        }
    }
};
