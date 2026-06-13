const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../info/serverinfo');
module.exports = {
    data: new SlashCommandBuilder().setName('serverinfo').setDescription(cmd.description)
        .addStringOption(o => o.setName('server-id').setDescription('Server ID to inspect').setRequired(false)),
    category: 'info',
    async execute(interaction, client, guildData) {
        const serverId = interaction.options.getString('server-id');
        if (serverId) await interaction.deferReply();

        const m = {
            reply: o => serverId ? interaction.editReply(o) : interaction.reply(o),
            author: interaction.user,
            guild: interaction.guild,
            member: interaction.member
        };
        await cmd.execute(m, serverId ? [serverId] : [], client, guildData);
    }
};
