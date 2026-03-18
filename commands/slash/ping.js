const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency and API response time'),
    category: 'utility',
    async execute(interaction, client) {
        await interaction.deferReply();
        const sent = await interaction.fetchReply();
        const bot = sent.createdTimestamp - interaction.createdTimestamp;
        const api = Math.round(client.ws.ping);
        const color = bot < 100 ? '#00FF00' : bot < 200 ? '#FFFF00' : '#FF0000';
        const embed = new EmbedBuilder().setTitle('🏓 Pong!')
            .addFields({ name: '🤖 Bot Latency', value: bot + 'ms', inline: true }, { name: '📡 API Latency', value: api + 'ms', inline: true })
            .setColor(color).setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    }
};