const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/deleterole');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('deleterole').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addRoleOption(o => o.setName('role').setDescription('Role to delete').setRequired(true)),
    category: cmd.category,
    async execute(interaction, client, guildData) {
        const role = interaction.options.getRole('role');
        const fakeMsg = {
            reply: o => interaction.reply(o), author: interaction.user,
            guild: interaction.guild, member: interaction.member,
            mentions: { roles: { first: () => role } }
        };
        await cmd.execute(fakeMsg, [], client, guildData);
    }
};