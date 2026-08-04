const { SlashCommandBuilder } = require('discord.js');
const { getBotStats, buildEmbed } = require('../info/botinfo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('View bot server and user statistics'),
    category: 'info',

    async execute(interaction, client) {
        const stats = await getBotStats(client);
        return interaction.reply({ embeds: [buildEmbed(client, stats)] });
    }
};
