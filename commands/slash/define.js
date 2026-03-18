const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../api/define');
module.exports = {
    data: new SlashCommandBuilder().setName('define').setDescription(cmd.description)
        .addStringOption(o => o.setName('word').setDescription('Word to look up').setRequired(true)),
    category: 'api',
    async execute(interaction, client) {
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild };
        await cmd.execute(m, interaction.options.getString('word').split(' '), client);
    }
};