const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/slowmode');
module.exports = {
    data: new SlashCommandBuilder().setName('slowmode').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 30s, 1m, off').setRequired(true))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to apply to')),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const ch = interaction.options.getChannel('channel');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, channel: interaction.channel, member: interaction.member, mentions: { channels: { first: () => ch } } };
        await cmd.execute(m, [interaction.options.getString('duration')], client, guildData);
    }
};