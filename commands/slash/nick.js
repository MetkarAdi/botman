const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../utility/nick');
module.exports = {
    data: new SlashCommandBuilder().setName('nick').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addStringOption(o => o.setName('nickname').setDescription('New nickname or reset').setRequired(true)),
    category: 'utility',
    async execute(interaction, client, guildData) {
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member };
        await cmd.execute(m, interaction.options.getString('nickname').split(' '), client, guildData);
    }
};