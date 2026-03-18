const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/editrole');
module.exports = {
    data: new SlashCommandBuilder().setName('editrole').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addRoleOption(o => o.setName('role').setDescription('Role to edit').setRequired(true))
        .addStringOption(o => o.setName('property').setDescription('Property').setRequired(true).addChoices(
            { name: 'Name', value: 'name' },
            { name: 'Color', value: 'color' },
            { name: 'Hoist', value: 'hoist' },
            { name: 'Mentionable', value: 'mentionable' }
        ))
        .addStringOption(o => o.setName('value').setDescription('New value').setRequired(true)),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const r = interaction.options.getRole('role');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { roles: { first: () => r } } };
        await cmd.execute(m, [null, interaction.options.getString('property'), ...interaction.options.getString('value').split(' ')], client, guildData);
    }
};