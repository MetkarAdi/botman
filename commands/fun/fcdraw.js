const { EmbedBuilder } = require('discord.js');
const { drawCard, getNextReset, getAvailableCharges } = require('../../utils/fcDraw');
const FCCooldown = require('../../models/FCCooldown');
const { logError } = require('../../utils/errorLogger');
const { resolveFootballImage } = require('../../utils/footballImage');

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
            await message.reply({ embeds: [await buildCardEmbed(card)] });

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

async function buildCardEmbed(card) {
    const rarity = card.rarity || 'Basic';
    const stats = card.stats || {};
    const embed = new EmbedBuilder()
        .setColor(RARITY_COLORS[rarity] || RARITY_COLORS.Basic)
        .setTitle(`${RARITY_EMOJIS[rarity] || RARITY_EMOJIS.Basic} ${formatValue(card.playerName)}`)
        .addFields(
            {
                name: '⚔️ Attack',
                value: `⚽ Goals: ${formatValue(stats.goals)} | Assists: ${formatValue(stats.assists)}\nKey Passes: ${formatValue(stats.keyPasses)} | Dribbles: ${formatValue(stats.dribbles)}`,
                inline: true
            },
            {
                name: '🛡️ Discipline',
                value: `🟨 Yellow: ${formatValue(stats.yellowCards)} | 🟥 Red: ${formatValue(stats.redCards)}\nAppearances: ${formatValue(stats.appearances)}`,
                inline: true
            },
            { name: '🏟️ Club · League', value: `${formatValue(card.club)} · ${formatValue(card.league)}`, inline: true }
        )
        .setFooter({ text: `${rarity} Card · #${card.cardId} · ${card.isDuplicate ? 'Duplicate' : 'New!'}` });

    const photo = await resolveFootballImage(card);
    if (photo) embed.setThumbnail(photo);

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
