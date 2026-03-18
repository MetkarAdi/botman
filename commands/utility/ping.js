const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    aliases: ['latency'],
    description: 'Check bot latency and API response time',
    usage: 'ping',
    category: 'utility',
    cooldown: 5,

    async execute(message, args, client) {
        const sent = await message.reply('🏓 Pinging...');

        const botLatency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        const getLatencyColor = (latency) => {
            if (latency < 100) return '#00FF00';
            if (latency < 200) return '#FFFF00';
            return '#FF0000';
        };

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '🤖 Bot Latency', value: `${botLatency}ms`, inline: true },
                { name: '📡 API Latency', value: `${apiLatency}ms`, inline: true },
                { name: '💾 Uptime', value: formatUptime(client.uptime), inline: false }
            )
            .setColor(getLatencyColor(botLatency))
            .setTimestamp();

        try {
            await sent.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('Error editing ping message:', error);
            await sent.edit({ content: `🏓 Pong! Bot: ${botLatency}ms | API: ${apiLatency}ms` });
        }
    }
};

function formatUptime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
}