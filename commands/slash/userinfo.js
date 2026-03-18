const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../info/userinfo');
module.exports = {
    data: new SlashCommandBuilder().setName('userinfo').setDescription(cmd.description)
        .addUserOption(o => o.setName('user').setDescription('User to look up')),
    category: 'info',
    async execute(interaction, client, guildData) {
        const t = interaction.options.getUser('user');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { users: { first: () => t } } };
        await cmd.execute(m, [], client, guildData);
    }
};