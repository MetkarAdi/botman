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

    const playerData = entry.playerId ? normalizePooledPlayer(entry) : normalizePlayer(entry);
    const cardId = generateCardId();
    const card = new FootballCard({
        userId,
        cardId,
        ...playerData
    });

    cooldown.chargesUsed = (cooldown.chargesUsed || 0) + 1;
    await cooldown.save();

    return card.save();
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

module.exports = drawCard;
module.exports.drawCard = drawCard;
module.exports.buildPlayerPool = buildPlayerPool;
module.exports.getCurrentWindowStart = getCurrentWindowStart;
module.exports.getNextReset = getNextReset;
module.exports.getAvailableCharges = getAvailableCharges;
