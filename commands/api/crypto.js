const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
    name: 'crypto',
    aliases: ['coin', 'price', 'c'],
    description: 'Get live crypto price data from CoinGecko',
    usage: 'crypto <coin> [vs_currency]',
    category: 'api',
    cooldown: 10,

    async execute(message, args, client) {
        if (!args[0]) return message.reply('❌ Provide a coin. E.g. `>>crypto bitcoin` or `>>crypto eth gbp`');

        const coinId = args[0].toLowerCase();
        const currency = (args[1] || 'usd').toLowerCase();

        const loading = await message.reply('📡 Fetching price data...');

        try {
            const [marketRes, globalRes] = await Promise.all([
                axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                    params: {
                        vs_currency: currency,
                        ids: coinId,
                        order: 'market_cap_desc',
                        per_page: 1,
                        page: 1,
                        sparkline: false,
                        price_change_percentage: '1h,24h,7d'
                    }
                }),
                axios.get('https://api.coingecko.com/api/v3/global')
            ]);

            if (!marketRes.data.length) {
                // Try searching by symbol
                const searchRes = await axios.get('https://api.coingecko.com/api/v3/search', {
                    params: { query: coinId }
                });
                const match = searchRes.data.coins?.[0];
                if (!match) return loading.edit(`❌ Coin \`${coinId}\` not found. Try the full name like \`bitcoin\`, \`ethereum\`, \`solana\`.`);
                return loading.edit(`❌ Coin not found. Did you mean \`${match.id}\`?`);
            }

            const coin = marketRes.data[0];
            const currencySymbols = { usd: '$', eur: '€', gbp: '£', jpy: '¥', btc: '₿', eth: 'Ξ' };
            const sym = currencySymbols[currency] || currency.toUpperCase() + ' ';

            const change1h = coin.price_change_percentage_1h_in_currency;
            const change24h = coin.price_change_percentage_24h_in_currency;
            const change7d = coin.price_change_percentage_7d_in_currency;

            const fmt = (n) => n !== null && n !== undefined ? `${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(2)}%` : 'N/A';
            const color = change24h >= 0 ? '#00FF88' : '#FF4444';

            const formatPrice = (p) => {
                if (!p) return 'N/A';
                if (p < 0.01) return `${sym}${p.toFixed(8)}`;
                if (p < 1) return `${sym}${p.toFixed(4)}`;
                return `${sym}${formatNumber(p.toFixed(2))}`;
            };

            const embed = new EmbedBuilder()
                .setTitle(`${coin.name} (${coin.symbol.toUpperCase()})`)
                .setThumbnail(coin.image)
                .setColor(color)
                .addFields(
                    { name: '💰 Price', value: formatPrice(coin.current_price), inline: true },
                    { name: '🏆 Rank', value: `#${coin.market_cap_rank}`, inline: true },
                    { name: '📊 Market Cap', value: coin.market_cap ? `${sym}${formatNumber(coin.market_cap)}` : 'N/A', inline: true },
                    { name: '1h Change', value: fmt(change1h), inline: true },
                    { name: '24h Change', value: fmt(change24h), inline: true },
                    { name: '7d Change', value: fmt(change7d), inline: true },
                    { name: '📈 24h High', value: formatPrice(coin.high_24h), inline: true },
                    { name: '📉 24h Low', value: formatPrice(coin.low_24h), inline: true },
                    { name: '🔄 Volume 24h', value: coin.total_volume ? `${sym}${formatNumber(coin.total_volume)}` : 'N/A', inline: true },
                    { name: '🏦 Circulating Supply', value: coin.circulating_supply ? `${formatNumber(Math.round(coin.circulating_supply))} ${coin.symbol.toUpperCase()}` : 'N/A', inline: true },
                    { name: '🏅 All-Time High', value: formatPrice(coin.ath), inline: true },
                    { name: '📅 ATH Date', value: coin.ath_date ? `<t:${Math.floor(new Date(coin.ath_date).getTime() / 1000)}:d>` : 'N/A', inline: true }
                )
                .setFooter({ text: `Data from CoinGecko • Last updated` })
                .setTimestamp(coin.last_updated ? new Date(coin.last_updated) : new Date());

            await loading.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error('CoinGecko error:', error.response?.data || error.message);
            if (error.response?.status === 429) {
                return loading.edit('❌ Rate limited by CoinGecko. Try again in a minute.');
            }
            loading.edit('❌ Failed to fetch crypto data. Try again later.');
        }
    }
};