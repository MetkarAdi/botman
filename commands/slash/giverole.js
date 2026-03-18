const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/giverole');
module.exports = {
    data: new SlashCommandBuilder().setName('giverole').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true)),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const t = interaction.options.getMember('user');
        const r = interaction.options.getRole('role');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { members: { first: () => t }, roles: { first: () => r } } };
        await cmd.execute(m, [], client, guildData);
    }
};