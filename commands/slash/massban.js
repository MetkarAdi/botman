const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/massban');
module.exports = {
    data: new SlashCommandBuilder().setName('massban').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(o => o.setName('ids').setDescription('Space-separated user IDs').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason')),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const ids = interaction.options.getString('ids').split(/s+/);
        const reason = interaction.options.getString('reason');
        const args = [...ids, ...(reason ? ['--reason', ...reason.split(' ')] : [])];
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { users: { first: () => null } } };
        await cmd.execute(m, args, client, guildData);
    }
};