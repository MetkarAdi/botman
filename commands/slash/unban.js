const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/unban');
module.exports = {
    data: new SlashCommandBuilder().setName('unban').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(o => o.setName('userid').setDescription('User ID to unban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason')),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { members: { first: () => null }, users: { first: () => null } } };
        await cmd.execute(m, [userId, ...reason.split(' ')], client, guildData);
    }
};