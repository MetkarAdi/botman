const fs = require('fs');
const path = require('path');
const FootballCard = require('../models/FootballCard');
const FCCooldown = require('../models/FCCooldown');
const { logCritical } = require('./errorLogger');

const MAX_CHARGES = 5;
const RESET_HOURS_UTC = [0, 4, 8, 12, 16, 20];
const PLAYER_POOL_PATH = path.join(__dirname, '..', 'data', 'playerPool.json');

function getCurrentWindowStart() {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const resetHour = [...RESET_HOURS_UTC].reverse().find((hour) => hour <= currentHour);
    const windowStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        resetHour ?? RESET_HOURS_UTC[RESET_HOURS_UTC.length - 1],
        0,
        0,
        0
    ));

    if (resetHour === undefined) {
        windowStart.setUTCDate(windowStart.getUTCDate() - 1);
    }

    return windowStart;
}

function getNextReset() {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const nextHour = RESET_HOURS_UTC.find((hour) => hour > currentHour);
    const nextReset = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        nextHour ?? RESET_HOURS_UTC[0],
        0,
        0,
        0
    ));

    if (nextHour === undefined) {
        nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    }

    return nextReset;
}

function getAvailableCharges(doc) {
    if (!doc || !doc.lastResetAt || doc.lastResetAt < getCurrentWindowStart()) {
        return MAX_CHARGES;
    }

    return clamp(MAX_CHARGES - (doc.chargesUsed || 0), 0, MAX_CHARGES);
}

async function drawCard(userId, client) {
    let cooldown = await FCCooldown.findOne({ userId });
    const currentWindowStart = getCurrentWindowStart();

    if (!cooldown) {
        cooldown = new FCCooldown({
            userId,
            chargesUsed: 0,
            lastResetAt: currentWindowStart
        });
    }

    if (!cooldown.lastResetAt || cooldown.lastResetAt < currentWindowStart) {
        cooldown.chargesUsed = 0;
        cooldown.lastResetAt = currentWindowStart;
        await cooldown.save();
    }

    if ((cooldown.chargesUsed || 0) >= MAX_CHARGES) {
        throw new Error(`COOLDOWN:${getNextReset().getTime()}`);
    }

    if (!Array.isArray(client.fcPlayerPool) || client.fcPlayerPool.length === 0) {
        await logCritical(
            client,
            new Error('fcPlayerPool is empty — run node scripts/buildPool.js'),
            'fcDraw - player pool'
        );
        throw new Error('NO_PLAYER');
    }

    const entry = randomItem(client.fcPlayerPool);
    const playerId = entry.playerId ?? entry.player?.id;

    if (!playerId) {
        throw new Error('PLAYER_POOL_INVALID');
    }

    const card = buildFootballCard(userId, normalizePlayerData(entry));

    cooldown.chargesUsed = (cooldown.chargesUsed || 0) + 1;
    await cooldown.save();

    return card.save();
}

async function awardFootballCard(userId, cardRequest, client) {
    const resolved = typeof cardRequest === 'string'
        ? await resolveFootballCard(cardRequest, client)
        : cardRequest;

    if (!resolved?.playerData) {
        return null;
    }

    return buildFootballCard(userId, resolved.playerData).save();
}

async function resolveFootballCard(query, client) {
    const normalizedQuery = stripWrappingQuotes(query).trim();

    if (!normalizedQuery) {
        return null;
    }

    const existingById = await FootballCard.findOne({ cardId: normalizedQuery.toUpperCase() }).lean();

    if (existingById) {
        return {
            source: 'collection',
            playerData: normalizeCardData(existingById),
            existingCard: existingById
        };
    }

    const existingByName = await FootballCard.findOne({
        playerName: { $regex: escapeRegex(normalizedQuery), $options: 'i' }
    }).lean();

    if (existingByName) {
        return {
            source: 'collection',
            playerData: normalizeCardData(existingByName),
            existingCard: existingByName
        };
    }

    const poolEntry = getPlayerPool(client).find((player) => (
        getPoolPlayerName(player).toLowerCase().includes(normalizedQuery.toLowerCase())
    ));

    if (!poolEntry) {
        return null;
    }

    return {
        source: 'pool',
        playerData: normalizePlayerData(poolEntry),
        poolEntry
    };
}

async function buildPlayerPool(client) {
    const file = fs.readFileSync(PLAYER_POOL_PATH, 'utf8');
    const players = JSON.parse(file);
    const pool = Array.isArray(players) ? players.filter(isRatedPlayerEntry) : [];

    client.fcPlayerPool = pool;
    console.log(`[FCDraw] Player pool built: ${pool.length} valid players`);

    return pool;
}

function isRatedPlayerEntry(entry) {
    if (entry.playerId) {
        return parseRating(entry.rating) !== null;
    }

    return parseRating(entry.statistics?.[0]?.games?.rating) !== null;
}

function normalizePooledPlayer(entry) {
    const rating = parseRating(entry.rating);

    return {
        playerId: entry.playerId,
        playerName: entry.playerName,
        playerPhoto: entry.playerPhoto,
        club: entry.club,
        clubLogo: entry.clubLogo,
        league: entry.league,
        position: entry.position,
        rating,
        rarity: getRarity(rating),
        stats: {
            goals: numberOrZero(entry.stats?.goals),
            assists: numberOrZero(entry.stats?.assists),
            appearances: numberOrZero(entry.stats?.appearances),
            passAccuracy: numberOrZero(entry.stats?.passAccuracy),
            dribbles: numberOrZero(entry.stats?.dribbles),
            keyPasses: numberOrZero(entry.stats?.keyPasses),
            yellowCards: numberOrZero(entry.stats?.yellowCards),
            redCards: numberOrZero(entry.stats?.redCards)
        }
    };
}

function normalizePlayerData(entry) {
    return entry.playerId ? normalizePooledPlayer(entry) : normalizePlayer(entry);
}

function normalizeCardData(card) {
    const rating = parseRating(card.rating);

    return {
        playerId: card.playerId,
        playerName: card.playerName,
        playerPhoto: card.playerPhoto,
        club: card.club,
        clubLogo: card.clubLogo,
        league: card.league,
        position: card.position,
        rating,
        rarity: card.rarity || getRarity(rating),
        stats: {
            goals: numberOrZero(card.stats?.goals),
            assists: numberOrZero(card.stats?.assists),
            appearances: numberOrZero(card.stats?.appearances),
            passAccuracy: numberOrZero(card.stats?.passAccuracy),
            dribbles: numberOrZero(card.stats?.dribbles),
            keyPasses: numberOrZero(card.stats?.keyPasses),
            yellowCards: numberOrZero(card.stats?.yellowCards),
            redCards: numberOrZero(card.stats?.redCards)
        }
    };
}

function normalizePlayer(entry) {
    const player = entry.player || {};
    const statistics = entry.statistics?.[0] || {};
    const rating = parseRating(statistics.games?.rating);

    return {
        playerId: player.id,
        playerName: player.name,
        playerPhoto: player.photo,
        club: statistics.team?.name,
        clubLogo: statistics.team?.logo,
        league: statistics.league?.name,
        position: statistics.games?.position,
        rating,
        rarity: getRarity(rating),
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

function generateCardId() {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function buildFootballCard(userId, playerData) {
    return new FootballCard({
        userId,
        cardId: generateCardId(),
        ...playerData
    });
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

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getPlayerPool(client) {
    if (Array.isArray(client?.fcPlayerPool) && client.fcPlayerPool.length > 0) {
        return client.fcPlayerPool;
    }

    return require('../data/playerPool.json');
}

function getPoolPlayerName(player) {
    return player.playerName || player.player?.name || '';
}

function stripWrappingQuotes(value) {
    return String(value || '').replace(/^["']|["']$/g, '');
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = drawCard;
module.exports.drawCard = drawCard;
module.exports.buildPlayerPool = buildPlayerPool;
module.exports.awardFootballCard = awardFootballCard;
module.exports.resolveFootballCard = resolveFootballCard;
module.exports.getCurrentWindowStart = getCurrentWindowStart;
module.exports.getNextReset = getNextReset;
module.exports.getAvailableCharges = getAvailableCharges;
