const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../utility/help');
module.exports = {
    data: new SlashCommandBuilder().setName('help').setDescription('Show all commands or info about a specific command')
        .addStringOption(o => o.setName('command').setDescription('Command to look up')),
    category: 'utility',
    async execute(interaction, client, guildData) {
        const arg = interaction.options.getString('command') || '';
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, channel: interaction.channel };
        await cmd.execute(m, arg ? [arg] : [], client, guildData);
    }
};