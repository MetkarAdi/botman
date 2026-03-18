const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'advice',
    aliases: ['tip', 'wisdom'],
    description: 'Get a random piece of advice from the Advice Slip API',
    usage: 'advice [search term]',
    category: 'api',
    cooldown: 5,

    async execute(message, args, client) {
        const query = args.join(' ').trim();
        const loading = await message.reply('🧠 Fetching advice...');

        try {
            let data;

            if (query) {
                const res = await axios.get(`https://api.adviceslip.com/advice/search/${encodeURIComponent(query)}`);
                const slips = res.data?.slips;
                if (!slips || slips === 'false' || !slips.length) {
                    return loading.edit(`❌ No advice found for **"${query}"**. Try a different keyword.`);
                }
                // Pick a random one from results
                data = slips[Math.floor(Math.random() * slips.length)];
            } else {
                const res = await axios.get('https://api.adviceslip.com/advice', {
                    headers: { 'Cache-Control': 'no-cache' }
                });
                data = res.data?.slip;
            }

            if (!data?.advice) return loading.edit('❌ Couldn\'t fetch advice right now. Try again.');

            const embed = new EmbedBuilder()
                .setTitle('💡 Advice')
                .setDescription(`*"${data.advice}"*`)
                .addFields({ name: '🆔 Slip #', value: `${data.id}`, inline: true })
                .setColor('#9B59B6')
                .setFooter({ text: 'Advice Slip API' })
                .setTimestamp();

            if (query) embed.addFields({ name: '🔍 Search', value: query, inline: true });

            await loading.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('Advice API error:', error.message);
            loading.edit('❌ Failed to fetch advice. Try again later.');
        }
    }
};