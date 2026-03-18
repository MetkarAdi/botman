const { EmbedBuilder } = require('discord.js');
const Snipe = require('../../models/Snipe');

module.exports = {
    name: 'snipe',
    aliases: ['s', 'deleted'],
    description: 'View the last deleted message in this channel',
    usage: 'snipe',
    category: 'utility',
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client, guildData) {
        try {
            const snipeData = await Snipe.findOne({ channelId: message.channel.id });

            if (!snipeData) {
                return message.reply('❌ No deleted messages found in this channel. Delete a message and try again.');
            }

            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (snipeData.timestamp < oneHourAgo) {
                return message.reply('❌ The last deleted message is too old to snipe (over 1 hour).');
            }

            const embed = new EmbedBuilder()
                .setTitle('🎯 Sniped Message')
                .setColor('#00FFFF')
                .addFields(
                    { name: '👤 Author', value: snipeData.authorTag, inline: true },
                    { name: '⏰ Deleted', value: `<t:${Math.floor(snipeData.timestamp.getTime() / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: `Sniped by ${message.author.tag}` })
                .setTimestamp();

            if (snipeData.authorAvatar) embed.setThumbnail(snipeData.authorAvatar);
            if (snipeData.content) embed.addFields({ name: '📝 Content', value: snipeData.content.substring(0, 1024), inline: false });

            if (snipeData.attachments?.length > 0) {
                embed.addFields({
                    name: '📎 Attachments',
                    value: snipeData.attachments.map(url => `[Attachment](${url})`).join('\n'),
                    inline: false
                });
                embed.setImage(snipeData.attachments[0]);
            }

            if (snipeData.embeds > 0) {
                embed.addFields({ name: '📊 Embeds', value: `${snipeData.embeds} embed(s)`, inline: true });
            }

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[Snipe] Error fetching snipe:', error);
            message.reply('❌ An error occurred while trying to snipe the message.');
        }
    }
};