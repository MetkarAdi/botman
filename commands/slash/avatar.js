const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../utility/avatar');
module.exports = {
    data: new SlashCommandBuilder().setName('avatar').setDescription(cmd.description)
        .addUserOption(o => o.setName('user').setDescription('The user')),
    category: 'utility',
    async execute(interaction, client) {
        const t = interaction.options.getUser('user');
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, mentions: { users: { first: () => t } } };
        await cmd.execute(m, [], client);
    }
};