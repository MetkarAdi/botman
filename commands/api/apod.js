const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'apod',
    aliases: ['nasa', 'astronomy', 'space'],
    description: "Get NASA's Astronomy Picture of the Day",
    usage: 'apod [date: YYYY-MM-DD]',
    category: 'api',
    cooldown: 10,

    async execute(message, args, client) {
        if (!process.env.NASA_API_KEY) {
            return message.reply('❌ `NASA_API_KEY` is not set in `.env`. Get a free key at https://api.nasa.gov');
        }

        const dateArg = args[0];
        if (dateArg && !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
            return message.reply('❌ Invalid date format. Use `YYYY-MM-DD`. E.g. `>>apod 2024-01-01`');
        }

        const loading = await message.reply('🔭 Fetching from NASA...');

        try {
            const params = { api_key: process.env.NASA_API_KEY };
            if (dateArg) params.date = dateArg;

            const res = await axios.get('https://api.nasa.gov/planetary/apod', { params });
            const data = res.data;

            const isVideo = data.media_type === 'video';

            const embed = new EmbedBuilder()
                .setTitle(`🌌 ${data.title}`)
                .setColor('#1A1A2E')
                .addFields(
                    { name: '📅 Date', value: data.date, inline: true },
                    { name: '📸 Media Type', value: isVideo ? '🎥 Video' : '🖼️ Image', inline: true }
                )
                .setFooter({ text: 'NASA Astronomy Picture of the Day' })
                .setTimestamp();

            // Trim explanation — can be very long
            const explanation = data.explanation.length > 1024
                ? data.explanation.slice(0, 1021) + '...'
                : data.explanation;
            embed.addFields({ name: '📝 Description', value: explanation, inline: false });

            if (data.copyright) {
                embed.addFields({ name: '©️ Copyright', value: data.copyright.trim(), inline: true });
            }

            if (isVideo) {
                embed.addFields({ name: '🎥 Watch', value: `[Click to watch](${data.url})`, inline: true });
                embed.setThumbnail('https://www.nasa.gov/wp-content/uploads/2023/02/nasa-logo-web-rgb.png');
            } else {
                embed.setImage(data.hdurl || data.url);
            }

            await loading.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('NASA APOD error:', error.response?.data || error.message);
            if (error.response?.status === 400) {
                return loading.edit('❌ Invalid date. APOD started on 1995-06-16, so use a date after that.');
            }
            loading.edit('❌ Failed to fetch APOD. Try again later.');
        }
    }
};