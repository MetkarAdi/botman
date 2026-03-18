const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/warnings');
module.exports = {
    data: new SlashCommandBuilder().setName('warnings').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true)),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const t = interaction.options.getUser('user');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { users: { first: () => t }, members: { first: () => interaction.options.getMember('user') } } };
        await cmd.execute(m, [], client, guildData);
    }
};