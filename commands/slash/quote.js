const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../api/quote');
module.exports = {
    data: new SlashCommandBuilder().setName('quote').setDescription(cmd.description),
    category: 'api',
    async execute(interaction, client) {
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild };
        await cmd.execute(m, [], client);
    }
};