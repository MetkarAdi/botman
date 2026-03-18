const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { parseTime, formatDuration } = require('../../utils/helpers');

module.exports = {
    name: 'slowmode',
    aliases: ['slow', 'sm', 'cooldown'],
    description: 'Set or remove slowmode on a channel',
    usage: 'slowmode <time|off> [#channel]',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ManageChannels'],
    botPermissions: ['ManageChannels'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!args[0]) {
            const current = message.channel.rateLimitPerUser;
            return message.reply(`⏱️ Current slowmode: **${current > 0 ? formatDuration(current * 1000) : 'Off'}**\nUsage: \`slowmode <time|off> [#channel]\``);
        }

        const channel = message.mentions.channels.first() || message.channel;

        if (!channel.isTextBased()) {
            return message.reply('❌ That channel is not a text channel.');
        }

        // Off
        if (args[0].toLowerCase() === 'off' || args[0] === '0') {
            await channel.setRateLimitPerUser(0, `Slowmode removed by ${message.author.tag}`);
            const embed = new EmbedBuilder()
                .setDescription(`✅ Slowmode removed in ${channel}`)
                .setColor('#00FF00')
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        const duration = parseTime(args[0]);
        if (!duration || duration <= 0) {
            return message.reply('❌ Invalid time. Use formats like `5s`, `30s`, `1m`, `6h`. Max is 6 hours.');
        }

        const seconds = Math.floor(duration / 1000);
        if (seconds > 21600) {
            return message.reply('❌ Slowmode cannot exceed 6 hours (21600 seconds).');
        }

        await channel.setRateLimitPerUser(seconds, `Slowmode set by ${message.author.tag}`);

        const embed = new EmbedBuilder()
            .setTitle('⏱️ Slowmode Set')
            .addFields(
                { name: '📢 Channel', value: `${channel}`, inline: true },
                { name: '⏱️ Duration', value: formatDuration(duration), inline: true },
                { name: '👮 Set By', value: message.author.tag, inline: true }
            )
            .setColor('#FFAA00')
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};