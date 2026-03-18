const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../utility/poll');
module.exports = {
    data: new SlashCommandBuilder().setName('poll').setDescription(cmd.description)
        .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true))
        .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
        .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
        .addStringOption(o => o.setName('option3').setDescription('Option 3'))
        .addStringOption(o => o.setName('option4').setDescription('Option 4')),
    category: 'utility',
    async execute(interaction, client, guildData) {
        const parts = ['question','option1','option2','option3','option4'].map(k => interaction.options.getString(k)).filter(Boolean).join(' | ');
        const m = { reply: o => interaction.reply(o), channel: interaction.channel, author: interaction.user, guild: interaction.guild, member: interaction.member };
        await cmd.execute(m, parts.split(' '), client, guildData);
    }
};