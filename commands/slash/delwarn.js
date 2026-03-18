const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/delwarn');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('delwarn').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addStringOption(o => o.setName('id').setDescription('Warning ID to delete').setRequired(true)),
    category: cmd.category,
    async execute(interaction, client, guildData) {
        const id = interaction.options.getString('id');
        const fakeMsg = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member };
        await cmd.execute(fakeMsg, [id], client, guildData);
    }
};