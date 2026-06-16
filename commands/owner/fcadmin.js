const { AttachmentBuilder } = require('discord.js');
const FootballCard = require('../../models/FootballCard');
const FCCooldown = require('../../models/FCCooldown');
const FCPlayerCache = require('../../models/FCPlayerCache');
const generateCard = require('../../utils/cardGenerator');
const { logError } = require('../../utils/errorLogger');

const API_BASE_URL = 'https://v3.football.api-sports.io';
const SEASON = 2024;

module.exports = {
    name: 'fcadmin',
    description: 'Manage football cards and draw cooldowns',
    usage: 'fcadmin <reset|give|resetall>',
    category: 'owner',
    ownerOnly: true,
    guildOnly: false,
    cooldown: 0,

    async execute(message, args, client) {
        const subcommand = args[0]?.toLowerCase();

        try {
            if (subcommand === 'reset') {
                return resetUserCooldown(message, args, client);
            }

            if (subcommand === 'give') {
                return giveCard(message, args, client);
            }

            if (subcommand === 'resetall') {
                return resetAllCooldowns(message);
            }

            return message.reply('Usage: `>>fcadmin reset @user`, `>>fcadmin give @user <playerName>`, or `>>fcadmin resetall`');
        } catch (error) {
            await logError(client, error, 'fcadmin');
            return message.reply('❌ Something went wrong.');
        }
    }
};

async function resetUserCooldown(message, args, client) {
    const target = await resolveTargetUser(message, args[1], client);

    if (!target) {
        return message.reply('❌ Please mention a user or provide a valid user ID.');
    }

    await FCCooldown.findOneAndUpdate(
        { userId: target.id },
        { chargesUsed: 0, lastResetAt: new Date(0) },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return message.reply(`✅ Reset draws for ${target.tag}. They now have 5 fresh charges.`);
}

async function giveCard(message, args, client) {
    const target = await resolveTargetUser(message, args[1], client);

    if (!target) {
        return message.reply('❌ Please mention a user or provide a valid user ID.');
    }

    const playerName = args.slice(2).join(' ').trim();

    if (!playerName) {
        return message.reply('Usage: `>>fcadmin give @user <playerName>`');
    }

    const playerData = await findPlayer(playerName);

    if (!playerData) {
        return message.reply('❌ Player not found.');
    }

    const card = await FootballCard.create({
        userId: target.id,
        cardId: generateCardId(),
        ...playerData,
        rarity: getRarity(playerData.rating)
    });
    const image = await generateCard(card);
    const attachment = new AttachmentBuilder(image, { name: `${card.cardId}.png` });

    return message.reply({
        content: `✅ Added **${card.playerName}** (${card.rarity}) to ${target.tag}'s collection.`,
        files: [attachment]
    });
}

async function resetAllCooldowns(message) {
    await FCCooldown.updateMany({}, { chargesUsed: 0, lastResetAt: new Date(0) });
    return message.reply('✅ Reset all draw cooldowns globally.');
}

async function resolveTargetUser(message, rawArg, client) {
    const mentionedUser = message.mentions.users.first();
    if (mentionedUser) return mentionedUser;

    const userId = rawArg?.replace(/[<@!>]/g, '');
    if (!userId || !/^\d{17,20}$/.test(userId)) return null;

    return client.users.fetch(userId).catch(() => null);
}

async function findPlayer(playerName) {
    const cached = await FCPlayerCache.findOne({
        playerName: { $regex: escapeRegex(playerName), $options: 'i' }
    }).lean();

    if (cached) {
        return normalizeCachedPlayer(cached);
    }

    const apiEntry = await fetchPlayerBySearch(playerName);

    if (!apiEntry) {
        return null;
    }

    return normalizeApiPlayer(apiEntry);
}

async function fetchPlayerBySearch(playerName) {
    const { default: fetch } = await import('node-fetch');
    const url = new URL(`${API_BASE_URL}/players`);
    url.searchParams.set('search', playerName);
    url.searchParams.set('season', String(SEASON));

    const response = await fetch(url.toString(), {
        headers: { 'x-apisports-key': getApiKey() }
    });

    if (!response.ok) {
        throw new Error(`Football API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const players = Array.isArray(data.response) ? data.response : [];
    return players[0] || null;
}

function normalizeCachedPlayer(cached) {
    return {
        playerId: cached.playerId,
        playerName: cached.playerName,
        playerPhoto: cached.playerPhoto,
        club: cached.club,
        clubLogo: cached.clubLogo,
        league: cached.league,
        position: cached.position,
        rating: parseRating(cached.rating),
        stats: cached.stats || {}
    };
}

function normalizeApiPlayer(entry) {
    const player = entry.player || {};
    const statistics = entry.statistics?.[0] || {};

    return {
        playerId: player.id,
        playerName: player.name,
        playerPhoto: player.photo,
        club: statistics.team?.name,
        clubLogo: statistics.team?.logo,
        league: statistics.league?.name,
        position: statistics.games?.position,
        rating: parseRating(statistics.games?.rating),
        stats: {
            goals: numberOrZero(statistics.goals?.total),
            assists: numberOrZero(statistics.goals?.assists),
            appearances: numberOrZero(statistics.games?.appearences),
            passAccuracy: numberOrZero(statistics.passes?.accuracy),
            dribbles: numberOrZero(statistics.dribbles?.success),
            keyPasses: numberOrZero(statistics.passes?.key),
            yellowCards: numberOrZero(statistics.cards?.yellow),
            redCards: numberOrZero(statistics.cards?.red)
        }
    };
}

function getApiKey() {
    const apiKey = process.env.FOOTBALL_API_KEY?.replace(/[\r\n]/g, '').trim();

    if (!apiKey) {
        throw new Error('FOOTBALL_API_KEY is not set');
    }

    return apiKey;
}

function getRarity(rating) {
    if (rating === null || rating === undefined || rating < 6) return 'Basic';
    if (rating < 7) return 'Common';
    if (rating < 8) return 'Rare';
    if (rating < 9) return 'Epic';
    return 'Legendary';
}

function parseRating(value) {
    const rating = Number.parseFloat(value);
    return Number.isNaN(rating) ? null : rating;
}

function numberOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function generateCardId() {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
