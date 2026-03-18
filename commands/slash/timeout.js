const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/timeout');
module.exports = {
    data: new SlashCommandBuilder().setName('timeout').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 1h').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason')),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const t = interaction.options.getMember('user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { members: { first: () => t } } };
        await cmd.execute(m, [null, duration, ...reason.split(' ')], client, guildData);
    }
};