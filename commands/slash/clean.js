const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/clean');
module.exports = {
    data: new SlashCommandBuilder().setName('clean').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(o => o.setName('amount').setDescription('Max messages to scan (default 50)').setMinValue(1).setMaxValue(100)),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const amount = interaction.options.getInteger('amount') || 50;
        const m = { reply: o => interaction.reply(o), delete: () => Promise.resolve(), channel: interaction.channel, author: interaction.user, guild: interaction.guild, member: interaction.member, content: '' };
        await cmd.execute(m, [String(amount)], client, guildData);
    }
};