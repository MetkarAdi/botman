const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../moderation/setnick');
module.exports = {
    data: new SlashCommandBuilder().setName('setnick').setDescription(cmd.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addUserOption(o => o.setName('user').setDescription('User to rename').setRequired(true))
        .addStringOption(o => o.setName('nickname').setDescription('New nickname or reset')),
    category: 'moderation',
    async execute(interaction, client, guildData) {
        const t = interaction.options.getMember('user');
        const nick = interaction.options.getString('nickname') || 'reset';
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { members: { first: () => t } } };
        await cmd.execute(m, [null, ...nick.split(' ')], client, guildData);
    }
};