const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../utility/snipe');
module.exports = {
    data: new SlashCommandBuilder().setName('snipe').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    category: 'utility',
    async execute(interaction, client, guildData) {
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, channel: interaction.channel, member: interaction.member };
        await cmd.execute(m, [], client, guildData);
    }
};