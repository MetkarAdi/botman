const { EmbedBuilder } = require('discord.js');

/**
 * Keeps the bot alive by sending a status message to a private channel every 3 minutes.
 * Set PING_CHANNEL_ID in your .env to the channel ID you want it to post in.
 */
function startActivityPing(client) {
    const channelId = process.env.PING_CHANNEL_ID;
    if (!channelId) {
        console.log('[ActivityPing] No PING_CHANNEL_ID set in .env — skipping activity ping.');
        return;
    }

    const quotes = [
        'The only way to do great work is to love what you do.',
        'In the middle of every difficulty lies opportunity.',
        'It does not matter how slowly you go as long as you do not stop.',
        'Life is what happens when you are busy making other plans.',
        'The future belongs to those who believe in the beauty of their dreams.',
        'Success is not final, failure is not fatal — it is the courage to continue that counts.',
        'You miss 100% of the shots you do not take.',
        'Whether you think you can or think you cannot, you are right.',
        'The best time to plant a tree was 20 years ago. The second best time is now.',
        'An unexamined life is not worth living.',
    ];

    setInterval(async () => {
        try {
            const channel = client.channels.cache.get(channelId);
            if (!channel) return;

            const uptimeMs = client.uptime || 0;
            const hours = Math.floor(uptimeMs / 3600000);
            const minutes = Math.floor((uptimeMs % 3600000) / 60000);
            const seconds = Math.floor((uptimeMs % 60000) / 1000);
            const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

            const ping = Math.round(client.ws.ping);
            const quote = quotes[Math.floor(Math.random() * quotes.length)];

            const embed = new EmbedBuilder()
                .setTitle('🟢 Bot Status')
                .setDescription(`*"${quote}"*`)
                .addFields(
                    { name: '📡 API Ping', value: `${ping}ms`, inline: true },
                    { name: '⏱️ Uptime', value: uptimeStr, inline: true },
                    { name: '🏠 Servers', value: `${client.guilds.cache.size}`, inline: true }
                )
                .setColor('#00AA00')
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('[ActivityPing] Failed to send ping:', err.message);
        }
    }, 3 * 60 * 1000); // every 3 minutes

    console.log(`✅ Activity ping started — posting to channel ${channelId} every 3 minutes`);
}

module.exports = startActivityPing;