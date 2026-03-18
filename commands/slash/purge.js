const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/purge');
module.exports = {
    data: new SlashCommandBuilder().setName('purge').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(o => o.setName('amount').setDescription('Messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addStringOption(o => o.setName('filter').setDescription('Filter type').addChoices(
            { name: 'All messages', value: 'all' },
            { name: 'Bots only', value: '--bots' },
            { name: 'Humans only', value: '--humans' }
        ))
        .addUserOption(o => o.setName('user').setDescription('Delete from a specific user')),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const amount = interaction.options.getInteger('amount');
        const filter = interaction.options.getString('filter') || 'all';
        const user = interaction.options.getUser('user');
        const args = [String(amount)];
        if (user) { args.push('--user'); args.push(user.id); }
        else if (filter !== 'all') args.push(filter);
        const m = { reply: o => interaction.reply(o), delete: () => Promise.resolve(), channel: interaction.channel, author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { users: { first: () => user } } };
        await cmd.execute(m, args, client, guildData);
    }
};