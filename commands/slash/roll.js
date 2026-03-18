const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../fun/roll');
module.exports = {
    data: new SlashCommandBuilder().setName('roll').setDescription(cmd.description)
        .addIntegerOption(o => o.setName('sides').setDescription('Number of sides (default 6)').setMinValue(2).setMaxValue(1000)),
    category: 'fun',
    async execute(interaction, client) {
        const sides = interaction.options.getInteger('sides');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild };
        await cmd.execute(m, sides ? [String(sides)] : [], client);
    }
};