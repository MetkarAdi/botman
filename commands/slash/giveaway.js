const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../giveaway/giveaway');
module.exports = {
    data: new SlashCommandBuilder().setName('giveaway').setDescription('Create and manage giveaways')
        .addSubcommand(s => s.setName('start').setDescription('Start a new giveaway')
            .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 1h, 24h, 7d').setRequired(true))
            .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true))
            .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1).setMaxValue(20))
            .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
            .addStringOption(o => o.setName('description').setDescription('Optional description'))
            .addRoleOption(o => o.setName('requiredrole').setDescription('Require users to have this role'))
            .addIntegerOption(o => o.setName('accountage').setDescription('Min account age in days'))
            .addIntegerOption(o => o.setName('serverage').setDescription('Min server membership in days')))
        .addSubcommand(s => s.setName('end').setDescription('End a giveaway early')
            .addStringOption(o => o.setName('messageid').setDescription('Giveaway message ID').setRequired(true)))
        .addSubcommand(s => s.setName('reroll').setDescription('Reroll giveaway winners')
            .addStringOption(o => o.setName('messageid').setDescription('Giveaway message ID').setRequired(true))
            .addIntegerOption(o => o.setName('winners').setDescription('How many winners to reroll')))
        .addSubcommand(s => s.setName('cancel').setDescription('Cancel a giveaway')
            .addStringOption(o => o.setName('messageid').setDescription('Giveaway message ID').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('List all active giveaways')),
    category: 'giveaway',
    async execute(interaction, client, guildData) {
        const sub = interaction.options.getSubcommand();
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, channel: interaction.channel };
        if (sub === 'start') {
            const ch = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('requiredrole');
            const accountAge = interaction.options.getInteger('accountage');
            const serverAge = interaction.options.getInteger('serverage');
            const desc = interaction.options.getString('description');
            const args = ['start', interaction.options.getString('duration'), '<#' + ch.id + '>', String(interaction.options.getInteger('winners')), interaction.options.getString('prize')];
            if (desc) args.push('--desc', ...desc.split(' '));
            if (role) args.push('--role', '<@&' + role.id + '>');
            if (accountAge) args.push('--accountage', String(accountAge));
            if (serverAge) args.push('--serverage', String(serverAge));
            await cmd.execute(m, args, client, guildData);
        } else if (sub === 'end') {
            await cmd.execute(m, ['end', interaction.options.getString('messageid')], client, guildData);
        } else if (sub === 'reroll') {
            const args = ['reroll', interaction.options.getString('messageid')];
            const w = interaction.options.getInteger('winners');
            if (w) args.push(String(w));
            await cmd.execute(m, args, client, guildData);
        } else if (sub === 'cancel') {
            await cmd.execute(m, ['cancel', interaction.options.getString('messageid')], client, guildData);
        } else {
            await cmd.execute(m, ['list'], client, guildData);
        }
    }
};