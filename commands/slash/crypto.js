const { SlashCommandBuilder } = require('discord.js');
const cmd = require('../api/crypto');
module.exports = {
    data: new SlashCommandBuilder().setName('crypto').setDescription(cmd.description)
        .addStringOption(o => o.setName('coin').setDescription('Coin e.g. bitcoin, ethereum').setRequired(true))
        .addStringOption(o => o.setName('currency').setDescription('vs currency').addChoices(
            { name: 'USD', value: 'usd' }, { name: 'EUR', value: 'eur' },
            { name: 'GBP', value: 'gbp' }, { name: 'JPY', value: 'jpy' }, { name: 'BTC', value: 'btc' }
        )),
    category: 'api',
    async execute(interaction, client) {
        const m = { reply: o => interaction.reply(o), author: interaction.user, guild: interaction.guild };
        await cmd.execute(m, [interaction.options.getString('coin'), interaction.options.getString('currency') || 'usd'], client);
    }
};