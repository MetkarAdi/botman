const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency and API response time'),
    category: 'utility',
    async execute(interaction, client) {
        await interaction.deferReply();
        const sent = await interaction.fetchReply();
        const bot = (sent.createdTimestamp - interaction.createdTimestamp) / 10;
        const api = client.ws.ping === -1 ? bot : client.ws.ping / 10;
        const color = bot < 100 ? '#00FF00' : bot < 200 ? '#FFFF00' : '#FF0000';
        const embed = new EmbedBuilder().setTitle('🏓 Pong!')
            .addFields({ name: '🤖 Bot Latency', value: formatLatency(bot) + 'ms', inline: true }, { name: '📡 API Latency', value: formatLatency(api) + 'ms', inline: true })
            .setColor(color).setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    }
};

function formatLatency(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
