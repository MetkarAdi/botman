const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../levelling/leaderboard');
module.exports = {
    data: new SlashCommandBuilder().setName('leaderboard').setDescription(cmd.description)
        .addIntegerOption(o => o.setName('page').setDescription('Page number').setMinValue(1)),
    category: 'levelling',
    async execute(interaction, client, guildData) {
        const page = interaction.options.getInteger('page');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member };
        await cmd.execute(m, page ? [String(page)] : [], client, guildData);
    }
};