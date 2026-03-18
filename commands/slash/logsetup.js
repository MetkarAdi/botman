const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../settings/logsetup');
module.exports = {
    data: new SlashCommandBuilder().setName('logsetup').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o => o.setName('action').setDescription('Action e.g. enable, disable, channel'))
        .addStringOption(o => o.setName('value').setDescription('Value')),
    category: 'settings',
    async execute(interaction, client, guildData) {
        const action = interaction.options.getString('action');
        const value = interaction.options.getString('value');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { channels: { first: () => null } } };
        await cmd.execute(m, [action, value].filter(Boolean), client, guildData);
    }
};