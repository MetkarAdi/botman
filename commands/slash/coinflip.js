const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../fun/coinflip');
module.exports = {
    data: new SlashCommandBuilder().setName('coinflip').setDescription(cmd.description),
    category: 'fun',
    async execute(interaction, client) {
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild };
        await cmd.execute(m, [], client);
    }
};