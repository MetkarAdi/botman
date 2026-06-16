const { EmbedBuilder } = require('discord.js');
const { drawCard, getNextReset, getAvailableCharges } = require('../../utils/fcDraw');
const FCCooldown = require('../../models/FCCooldown');
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
    name: 'fcdraw',
    aliases: ['fcpull', 'drawcard'],
    description: 'Draw a football player card',
    usage: 'fcdraw',
    category: 'fun',
    cooldown: 3,

    async execute(message, args, client) {
        try {
            let cooldown = await FCCooldown.findOne({ userId: message.author.id });

            if (!cooldown) {
                cooldown = await FCCooldown.create({ userId: message.author.id });
            }

            const availableCharges = getAvailableCharges(cooldown);

            if (availableCharges === 0) {
                return message.reply({ embeds: [buildCooldownEmbed()] });
            }

            const card = await drawCard(message.author.id, client);
            await message.reply({ embeds: [buildCardEmbed(card, message.author.tag)] });

            const updatedCooldown = await FCCooldown.findOne({ userId: message.author.id });
            const remaining = getAvailableCharges(updatedCooldown);
            return message.channel.send(`Draw used! **${remaining}/5** draws left this window. Next reset: <t:${Math.floor(getNextReset().getTime() / 1000)}:R>.`);
        } catch (error) {
            if (error.message?.startsWith('COOLDOWN:')) {
                return message.reply({ embeds: [buildCooldownEmbed(error.message)] });
            }

            if (error.message === 'NO_PLAYER') {
                return message.reply('Could not find a valid player. Ask the owner to run `node scripts/buildPool.js`.');
            }

            await logError(client, error, 'fcdraw');
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

function buildCooldownEmbed(errorMessage = null) {
    const parsedReset = Number(errorMessage?.split(':')[1]);
    const nextReset = Number.isFinite(parsedReset) ? parsedReset : getNextReset().getTime();

    return new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('No Draws Left')
        .setDescription(`You've used all 5 draws this window. Next reset: <t:${Math.floor(nextReset / 1000)}:R>\nYou get **5 draws per reset window**, **6 resets per day** (every 4 hours).`);
}

function formatValue(value) {
    return value === null || value === undefined || value === '' ? 'N/A' : String(value);
}
