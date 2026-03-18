const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const cmd = require('../mafia/mafia');
module.exports = {
    data: new SlashCommandBuilder().setName('mafia').setDescription('Manage a Mafia game')
        .addSubcommand(s => s.setName('start').setDescription('Start a new Mafia game lobby')
            .addIntegerOption(o => o.setName('jointimer').setDescription('Join timer in seconds (default 120)').setMinValue(30).setMaxValue(600)))
        .addSubcommand(s => s.setName('stop').setDescription('Force stop the current game'))
        .addSubcommand(s => s.setName('config').setDescription('Configure Mafia settings')
            .addStringOption(o => o.setName('setting').setDescription('Setting').setRequired(true).addChoices(
                { name: 'Category ID', value: 'categoryid' },
                { name: 'Discussion Time', value: 'discussiontime' },
                { name: 'Night Time', value: 'nighttime' },
                { name: 'Vote Time', value: 'votetime' }
            ))
            .addStringOption(o => o.setName('value').setDescription('New value').setRequired(true))),
    category: 'mafia',
    async execute(interaction, client, guildData) {
        const sub = interaction.options.getSubcommand();
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild, member: interaction.member, channel: interaction.channel };
        if (sub === 'start') {
            const timer = interaction.options.getInteger('jointimer');
            await cmd.execute(m, ['start', ...(timer ? [String(timer)] : [])], client, guildData);
        } else if (sub === 'stop') {
            await cmd.execute(m, ['stop'], client, guildData);
        } else {
            await cmd.execute(m, ['config', interaction.options.getString('setting'), interaction.options.getString('value')], client, guildData);
        }
    }
};