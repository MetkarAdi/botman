const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../utility/remind');
module.exports = {
    data: new SlashCommandBuilder().setName('remind').setDescription(cmd.description)
        .addStringOption(o => o.setName('time').setDescription('When e.g. 10m, 2h, 1d').setRequired(true))
        .addStringOption(o => o.setName('message').setDescription('What to remind you').setRequired(true)),
    category: 'utility',
    async execute(interaction, client, guildData) {
        const m = {
            reply: o => interaction.reply(o),
            author: interaction.user,
            guild: interaction.guild,
            channel: interaction.channel,
            member: interaction.member,
            url: `https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}`
        };
        await cmd.execute(m, [interaction.options.getString('time'), ...interaction.options.getString('message').split(' ')], client, guildData);
    }
};
