const { EmbedBuilder } = require('discord.js');
const FootballCard = require('../../models/FootballCard');
const { logError } = require('../../utils/errorLogger');

const RARITY_COLORS = {
    Basic: '#aaaaaa',
    Common: '#2ecc71',
    Rare: '#3498db',
    Epic: '#9b59b6',
    Legendary: '#f1c40f'
};

const RARITY_EMOJIS = {
    Basic: '\u26aa',
    Common: '\u2b50',
    Rare: '\u2b50',
    Epic: '\u2b50',
    Legendary: '\u2b50'
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
                return message.reply(`Card #${rawCardId} not found.`);
            }

            return message.reply({ embeds: [buildCardEmbed(card, message.author.tag)] });
        } catch (error) {
            await logError(client, error, 'fccard');
            return message.reply('Something went wrong.');
        }
    }
};

function buildCardEmbed(card, drawnBy) {
    const rarity = card.rarity || 'Basic';
    const stats = card.stats || {};
    const embed = new EmbedBuilder()
        .setColor(RARITY_COLORS[rarity] || RARITY_COLORS.Basic)
        .setTitle(`${RARITY_EMOJIS[rarity] || RARITY_EMOJIS.Basic} ${formatValue(card.playerName)}`)
        .addFields(
            { name: 'Club', value: formatValue(card.club), inline: true },
            { name: 'League', value: formatValue(card.league), inline: true },
            { name: 'Position', value: formatValue(card.position), inline: true },
            { name: 'Rating', value: formatValue(card.rating), inline: true },
            { name: 'Goals', value: formatValue(stats.goals), inline: true },
            { name: 'Assists', value: formatValue(stats.assists), inline: true },
            { name: 'Appearances', value: formatValue(stats.appearances), inline: true },
            { name: 'Key Passes', value: formatValue(stats.keyPasses), inline: true },
            { name: 'Dribbles', value: formatValue(stats.dribbles), inline: true },
            { name: 'Yellow Cards', value: formatValue(stats.yellowCards), inline: true },
            { name: 'Red Cards', value: formatValue(stats.redCards), inline: true },
            { name: 'Card ID', value: `#${card.cardId}`, inline: true }
        )
        .setFooter({ text: `${rarity} Card · Drawn by ${drawnBy}` });

    if (card.playerPhoto) {
        embed.setThumbnail(card.playerPhoto);
    }

    return embed;
}

function formatValue(value) {
    return value === null || value === undefined || value === '' ? 'N/A' : String(value);
}
