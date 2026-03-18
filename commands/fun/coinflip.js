const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'coinflip',
    aliases: ['flip', 'coin'],
    description: 'Flip a coin',
    usage: 'coinflip',
    category: 'fun',
    cooldown: 3,

    async execute(message) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        const emoji = result === 'Heads' ? '👑' : '🪙';

        const embed = new EmbedBuilder()
            .setTitle('🪙 Coin Flip')
            .setDescription(`The coin landed on... **${emoji} ${result}!**`)
            .setColor(result === 'Heads' ? '#FFD700' : '#C0C0C0')
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
