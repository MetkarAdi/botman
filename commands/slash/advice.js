const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../api/advice');
module.exports = {
    data: new SlashCommandBuilder().setName('advice').setDescription(cmd.description)
        .addStringOption(o => o.setName('search').setDescription('Search for advice on a topic')),
    category: 'api',
    async execute(interaction, client) {
        const search = interaction.options.getString('search') || '';
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild };
        await cmd.execute(m, search.split(' ').filter(Boolean), client);
    }
};