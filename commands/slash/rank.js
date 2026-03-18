const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../levelling/rank');
module.exports = {
    data: new SlashCommandBuilder().setName('rank').setDescription(cmd.description)
        .addUserOption(o => o.setName('user').setDescription('User to check rank for')),
    category: 'levelling',
    async execute(interaction, client, guildData) {
        const t = interaction.options.getUser('user');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, mentions: { users: { first: () => t } } };
        await cmd.execute(m, [], client, guildData);
    }
};