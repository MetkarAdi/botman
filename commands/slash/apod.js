const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../api/apod');
module.exports = {
    data: new SlashCommandBuilder().setName('apod').setDescription(cmd.description)
        .addStringOption(o => o.setName('date').setDescription('Date in YYYY-MM-DD format')),
    category: 'api',
    async execute(interaction, client) {
        const date = interaction.options.getString('date');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild };
        await cmd.execute(m, date ? [date] : [], client);
    }
};