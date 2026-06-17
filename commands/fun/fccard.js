const { EmbedBuilder } = require('discord.js');
const { resolveFootballCard } = require('../../utils/fcDraw');
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
    description: 'View a football card by card ID or player name',
    usage: 'fccard <cardId|player name>',
    category: 'fun',
    cooldown: 3,

    async execute(message, args, client) {
        const arg = args.join(' ').trim();

        if (!arg) {
            return message.reply('Usage: `>>fccard <cardId|player name>`');
        }

        try {
            const resolved = await resolveFootballCard(arg, client);

            if (resolved?.existingCard) {
                return message.reply({ embeds: [buildCardEmbed(resolved.existingCard)] });
            }

            if (resolved?.playerData) {
                return message.reply({ embeds: [buildPoolCardEmbed(resolved.playerData)] });
            }

            return message.reply(`\u274c No card or player found matching ${arg}. Try a player name or card ID.`);
        } catch (error) {
            await logError(client, error, 'fccard');
            return message.reply('Something went wrong.');
        }
    }
};

function buildCardEmbed(card) {
    const rarity = card.rarity || getRarity(card.rating);
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
            { name: 'Owner', value: card.userId ? `<@${card.userId}>` : 'N/A', inline: true },
            { name: 'Card ID', value: `#${card.cardId}`, inline: true }
        )
        .setFooter({ text: `${rarity} Card` });

    if (card.playerPhoto) {
        embed.setThumbnail(card.playerPhoto);
    }

    return embed;
}

function buildPoolCardEmbed(player) {
    const rarity = getRarity(player.rating);
    const stats = player.stats || {};
    const embed = new EmbedBuilder()
        .setColor(RARITY_COLORS[rarity] || RARITY_COLORS.Basic)
        .setTitle(`${RARITY_EMOJIS[rarity] || RARITY_EMOJIS.Basic} ${formatValue(player.playerName)}`)
        .addFields(
            { name: 'Club', value: formatValue(player.club), inline: true },
            { name: 'League', value: formatValue(player.league), inline: true },
            { name: 'Position', value: formatValue(player.position), inline: true },
            { name: 'Rating', value: formatValue(player.rating), inline: true },
            { name: 'Goals', value: formatValue(stats.goals), inline: true },
            { name: 'Assists', value: formatValue(stats.assists), inline: true },
            { name: 'Appearances', value: formatValue(stats.appearances), inline: true },
            { name: 'Key Passes', value: formatValue(stats.keyPasses), inline: true },
            { name: 'Dribbles', value: formatValue(stats.dribbles), inline: true },
            { name: 'Yellow Cards', value: formatValue(stats.yellowCards), inline: true },
            { name: 'Red Cards', value: formatValue(stats.redCards), inline: true },
            { name: 'Owner', value: '\u274c Nobody owns this card yet', inline: true },
            { name: 'Card ID', value: 'Not yet collected', inline: true }
        )
        .setFooter({ text: `${rarity} Card` });

    if (player.playerPhoto) {
        embed.setThumbnail(player.playerPhoto);
    }

    return embed;
}

function getRarity(rating) {
    if (rating === null || rating === undefined || rating < 6) return 'Basic';
    if (rating < 7) return 'Common';
    if (rating < 8) return 'Rare';
    if (rating < 9) return 'Epic';
    return 'Legendary';
}

function formatValue(value) {
    return value === null || value === undefined || value === '' ? 'N/A' : String(value);
}
