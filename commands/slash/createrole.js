const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/createrole');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('createrole').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addStringOption(o => o.setName('name').setDescription('Role name').setRequired(true))
        .addStringOption(o => o.setName('color').setDescription('Hex color e.g. #FF0000'))
        .addBooleanOption(o => o.setName('hoist').setDescription('Show separately in member list')),
    category: cmd.category,
    async execute(interaction, client, guildData) {
        const name = interaction.options.getString('name');
        const color = interaction.options.getString('color') || '';
        const hoist = interaction.options.getBoolean('hoist') ?? false;
        const fakeMsg = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member };
        await cmd.execute(fakeMsg, [name, color, hoist ? 'true' : 'false'], client, guildData);
    }
};