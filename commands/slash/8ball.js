const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../fun/8ball');
module.exports = {
    data: new SlashCommandBuilder().setName('8ball').setDescription(cmd.description)
        .addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true)),
    category: 'fun',
    async execute(interaction, client) {
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild };
        await cmd.execute(m, interaction.options.getString('question').split(' '), client);
    }
};