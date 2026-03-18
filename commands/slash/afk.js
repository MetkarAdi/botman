const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../utility/afk');
module.exports = {
    data: new SlashCommandBuilder().setName('afk').setDescription(cmd.description)
        .addStringOption(o => o.setName('reason').setDescription('AFK reason')),
    category: 'utility',
    async execute(interaction, client, guildData) {
        const reason = interaction.options.getString('reason') || 'AFK';
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member };
        await cmd.execute(m, reason.split(' '), client, guildData);
    }
};