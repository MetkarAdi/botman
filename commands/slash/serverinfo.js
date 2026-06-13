const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../info/serverinfo');
module.exports = {
    data: new SlashCommandBuilder().setName('serverinfo').setDescription(cmd.description)
        .addStringOption(o => o.setName('target').setDescription('Server ID or invite code/URL to inspect').setRequired(false)),
    category: 'info',
    async execute(interaction, client, guildData) {
        const target = interaction.options.getString('target');
        if (target) await interaction.deferReply();

        const m = {
            reply: o => target ? interaction.editReply(o) : interaction.reply(o),
            author: interaction.user,
            guild: interaction.guild,
            member: interaction.member
        };
        await cmd.execute(m, target ? [target] : [], client, guildData);
    }
};
