const { SlashCommandBuilder } = require('discord.js');
const { createPoll } = require('../utility/poll');

module.exports = {
    data: new SlashCommandBuilder().setName('poll').setDescription('Create a poll with buttons')
        .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true))
        .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
        .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
        .addStringOption(o => o.setName('option3').setDescription('Option 3'))
        .addStringOption(o => o.setName('option4').setDescription('Option 4')),
    category: 'utility',
    async execute(interaction) {
        const options = ['option1', 'option2', 'option3', 'option4']
            .map(name => interaction.options.getString(name))
            .filter(Boolean);
        await interaction.deferReply({ ephemeral: true });
        await createPoll(interaction.channel, interaction.user, interaction.options.getString('question'), options);
        await interaction.editReply('✅ Poll created.');
    }
};
