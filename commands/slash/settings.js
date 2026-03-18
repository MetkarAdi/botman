const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../settings/settings');
module.exports = {
    data: new SlashCommandBuilder().setName('settings').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(o => o.setName('setting').setDescription('Setting to change'))
        .addStringOption(o => o.setName('value').setDescription('New value')),
    category: 'settings',
    async execute(interaction, client, guildData) {
        const setting = interaction.options.getString('setting');
        const value = interaction.options.getString('value');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { channels: { first: () => null }, roles: { first: () => null } } };
        await cmd.execute(m, [setting, value].filter(Boolean), client, guildData);
    }
};