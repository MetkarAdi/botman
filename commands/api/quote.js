const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'quote',
    aliases: ['inspire', 'motivation', 'q'],
    description: 'Get a random inspirational quote from ZenQuotes',
    usage: 'quote',
    category: 'api',
    cooldown: 5,

    async execute(message, args, client) {
        const loading = await message.reply('💭 Finding a quote...');

        try {
            const res = await axios.get('https://zenquotes.io/api/random');
            const data = res.data[0];

            if (!data?.q || !data?.a) {
                return loading.edit('❌ Couldn\'t fetch a quote right now. Try again.');
            }

            const embed = new EmbedBuilder()
                .setDescription(`> *"${data.q}"*`)
                .addFields({ name: '— Author', value: data.a, inline: false })
                .setColor('#F5A623')
                .setFooter({ text: 'ZenQuotes.io' })
                .setTimestamp();

            await loading.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('Quote API error:', error.message);
            loading.edit('❌ Failed to fetch a quote. Try again later.');
        }
    }
};