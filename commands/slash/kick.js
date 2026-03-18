const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/kick');
module.exports = {
    data: new SlashCommandBuilder().setName('kick').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason')),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const t = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { members: { first: () => t } } };
        await cmd.execute(m, [null, ...reason.split(' ')], client, guildData);
    }
};