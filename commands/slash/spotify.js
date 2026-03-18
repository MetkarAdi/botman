const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../api/spotify');
module.exports = {
    data: new SlashCommandBuilder().setName('spotify').setDescription(cmd.description)
        .addSubcommand(s => s.setName('track').setDescription('Search for a track').addStringOption(o => o.setName('query').setDescription('Track name').setRequired(true)))
        .addSubcommand(s => s.setName('album').setDescription('Search for an album').addStringOption(o => o.setName('query').setDescription('Album name').setRequired(true)))
        .addSubcommand(s => s.setName('artist').setDescription('Search for an artist').addStringOption(o => o.setName('query').setDescription('Artist name').setRequired(true)))
        .addSubcommand(s => s.setName('playlist').setDescription('Search for a playlist').addStringOption(o => o.setName('query').setDescription('Playlist name').setRequired(true)))
        .addSubcommand(s => s.setName('new').setDescription('Show new releases')),
    category: 'api',
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const query = interaction.options.getString('query') || '';
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild };
        await cmd.execute(m, [sub, ...query.split(' ').filter(Boolean)], client);
    }
};