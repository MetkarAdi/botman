const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const FootballCard = require('../../models/FootballCard');
const generateCard = require('../../utils/cardGenerator');
const { logError } = require('../../utils/errorLogger');

const RARITY_COLORS = {
    Basic: '#aaaaaa',
    Common: '#2ecc71',
    Rare: '#3498db',
    Epic: '#9b59b6',
    Legendary: '#f1c40f'
};

module.exports = {
    name: 'fccard',
    description: 'View a football card by card ID',
    usage: 'fccard <cardId>',
    category: 'fun',
    cooldown: 3,

    async execute(message, args, client) {
        const rawCardId = args[0];

        if (!rawCardId) {
            return message.reply('Usage: `>>fccard <cardId>`');
        }

        const cardId = rawCardId.toUpperCase();

        try {
            const card = await FootballCard.findOne({ cardId });

            if (!card) {
                return message.reply(`❌ Card #${rawCardId} not found.`);
            }

            const image = await generateCard(card);
            const attachment = new AttachmentBuilder(image, { name: `${card.cardId}.png` });
            const stats = card.stats || {};
            const embed = new EmbedBuilder()
                .setColor(RARITY_COLORS[card.rarity] || RARITY_COLORS.Basic)
                .setTitle(`${card.playerName || 'Unknown Player'} · #${card.cardId}`)
                .setDescription(`Owned by <@${card.userId}>`)
                .setImage(`attachment://${card.cardId}.png`)
                .addFields(
                    { name: 'Rarity', value: formatValue(card.rarity), inline: true },
                    { name: 'Club', value: formatValue(card.club), inline: true },
                    { name: 'League', value: formatValue(card.league), inline: true },
                    { name: 'Position', value: formatValue(card.position), inline: true },
                    { name: 'Rating', value: formatValue(card.rating), inline: true },
                    { name: 'Card ID', value: `#${card.cardId}`, inline: true },
                    { name: 'Goals', value: formatValue(stats.goals), inline: true },
                    { name: 'Assists', value: formatValue(stats.assists), inline: true },
                    { name: 'Appearances', value: formatValue(stats.appearances), inline: true },
                    { name: 'Pass Accuracy', value: formatValue(stats.passAccuracy), inline: true },
                    { name: 'Dribbles', value: formatValue(stats.dribbles), inline: true },
                    { name: 'Key Passes', value: formatValue(stats.keyPasses), inline: true },
                    { name: 'Yellow Cards', value: formatValue(stats.yellowCards), inline: true },
                    { name: 'Red Cards', value: formatValue(stats.redCards), inline: true }
                );

            return message.reply({ embeds: [embed], files: [attachment] });
        } catch (error) {
            await logError(client, error, 'fccard');
            return message.reply('❌ Something went wrong.');
        }
    }
};

function formatValue(value) {
    return value === null || value === undefined || value === '' ? 'N/A' : String(value);
}
