const { EmbedBuilder } = require('discord.js');
const FootballCard = require('../../models/FootballCard');
const { logError } = require('../../utils/errorLogger');

module.exports = {
    name: 'fcleaderboard',
    aliases: ['fclb'],
    description: 'View the football card leaderboard',
    usage: 'fcleaderboard',
    category: 'fun',
    cooldown: 5,

    async execute(message, args, client) {
        try {
            const leaders = await FootballCard.aggregate([
                {
                    $group: {
                        _id: '$userId',
                        total: { $sum: 1 },
                        legendary: {
                            $sum: { $cond: [{ $eq: ['$rarity', 'Legendary'] }, 1, 0] }
                        },
                        epic: {
                            $sum: { $cond: [{ $eq: ['$rarity', 'Epic'] }, 1, 0] }
                        }
                    }
                },
                { $sort: { legendary: -1, epic: -1, total: -1 } },
                { $limit: 10 }
            ]);
            const description = leaders.length
                ? leaders.map((row, index) => `#${index + 1} <@${row._id}> — 🏆 ${row.legendary} 💜 ${row.epic} | ${row.total} total`).join('\n')
                : 'No cards have been drawn yet.';
            const embed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('Football Card Leaderboard')
                .setDescription(description);

            return message.reply({ embeds: [embed] });
        } catch (error) {
            await logError(client, error, 'fcleaderboard');
            return message.reply('❌ Something went wrong.');
        }
    }
};
