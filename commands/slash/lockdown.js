const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/lockdown');
module.exports = {
    data: new SlashCommandBuilder().setName('lockdown').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(o => o.setName('action').setDescription('Action').setRequired(true).addChoices(
            { name: 'Lock channel', value: 'lock' },
            { name: 'Unlock channel', value: 'unlock' },
            { name: 'Lock entire server', value: 'server' }
        ))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to lock/unlock'))
        .addStringOption(o => o.setName('reason').setDescription('Reason')),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const ch = interaction.options.getChannel('channel');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, channel: interaction.channel, member: interaction.member, mentions: { channels: { first: () => ch } } };
        await cmd.execute(m, [interaction.options.getString('action'), null, ...reason.split(' ')], client, guildData);
    }
};