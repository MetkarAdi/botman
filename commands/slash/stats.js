const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../info/stats');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription(cmd.description),
    category: 'info',

    async execute(interaction, client, guildData) {
        const m = {
            reply: o => interaction.reply(o),
            author: interaction.user,
            guild: interaction.guild,
            member: interaction.member
        };

        await cmd.execute(m, [], client, guildData);
    }
};
