const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'roll',
    aliases: ['dice', 'rolldice'],
    description: 'Roll a dice (default: 6 sides)',
    usage: 'roll [sides]',
    category: 'fun',
    cooldown: 3,

    async execute(message, args) {
        const sides = parseInt(args[0]) || 6;

        if (sides < 2 || sides > 1000) {
            return message.reply('❌ Please choose a number between 2 and 1000.');
        }

        const result = Math.floor(Math.random() * sides) + 1;

        const embed = new EmbedBuilder()
            .setTitle('🎲 Dice Roll')
            .setDescription(`Rolling a **${sides}**-sided dice...`)
            .addFields(
                { name: '🎯 Result', value: `**${result}**`, inline: true }
            )
            .setColor('#00FF00')
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
