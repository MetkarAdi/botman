const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../mafia/mafiahelp');
module.exports = {
    data: new SlashCommandBuilder().setName('mafiahelp').setDescription('Browse all Mafia roles with descriptions'),
    category: 'mafia',
    async execute(interaction, client, guildData) {
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member };
        await cmd.execute(m, [], client, guildData);
    }
};