const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../settings/prefix');
module.exports = {
    data: new SlashCommandBuilder().setName('prefix').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(o => o.setName('prefix').setDescription('New prefix (leave empty to view current)')),
    category: 'settings',
    async execute(interaction, client, guildData) {
        const np = interaction.options.getString('prefix');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member };
        await cmd.execute(m, np ? [np] : [], client, guildData);
    }
};