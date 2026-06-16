const FootballCard = require('../models/FootballCard');
const FCCooldown = require('../models/FCCooldown');
const FCPlayerCache = require('../models/FCPlayerCache');

const API_BASE_URL = 'https://v3.football.api-sports.io';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CHARGES = 5;
const RESET_HOURS_UTC = [0, 4, 8, 12, 16, 20];
const LEAGUE_IDS = [39, 140, 135, 78, 61];
const SEASON = 2024;
const MAX_PLAYER_ATTEMPTS = 5;

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

async function drawCard(userId) {
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

    const entry = await fetchRandomRatedPlayer();
    const playerId = entry.player?.id;

    if (!playerId) {
        throw new Error('NO_PLAYER');
    }

    const cachedPlayer = await getCachedPlayer(playerId);
    const playerData = cachedPlayer || await cachePlayer(entry);
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

async function fetchRandomRatedPlayer() {
    const leagueId = randomItem(LEAGUE_IDS);
    const page = randomInt(1, 5);
    const data = await apiGet('/players', {
        league: leagueId,
        season: SEASON,
        page
    });
    const players = Array.isArray(data.response) ? data.response : [];

    const candidates = [...players];

    for (let attempt = 0; attempt < MAX_PLAYER_ATTEMPTS && candidates.length; attempt += 1) {
        const index = randomInt(0, candidates.length - 1);
        const [entry] = candidates.splice(index, 1);
        const rating = parseRating(entry.statistics?.[0]?.games?.rating);

        if (rating !== null) {
            return entry;
        }
    }

    throw new Error('NO_PLAYER');
}

async function getCachedPlayer(playerId) {
    const cached = await FCPlayerCache.findOne({ playerId });

    if (!cached?.cachedAt) return null;

    if (Date.now() - cached.cachedAt.getTime() >= CACHE_TTL_MS) {
        return null;
    }

    if (cached.rating === null || cached.rating === undefined) {
        return null;
    }

    return {
        playerId: cached.playerId,
        playerName: cached.playerName,
        playerPhoto: cached.playerPhoto,
        club: cached.club,
        clubLogo: cached.clubLogo,
        league: cached.league,
        position: cached.position,
        rating: cached.rating,
        rarity: getRarity(cached.rating),
        stats: cached.stats
    };
}

async function cachePlayer(entry) {
    const playerData = normalizePlayer(entry);

    await FCPlayerCache.findOneAndUpdate(
        { playerId: playerData.playerId },
        {
            ...playerData,
            cachedAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return playerData;
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

async function apiGet(path, params) {
    const apiKey = getApiKey();
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(buildUrl(path, params), {
        headers: { 'x-apisports-key': apiKey }
    });

    if (!response.ok) {
        throw new Error(`Football API request failed with status ${response.status}`);
    }

    return response.json();
}

function getApiKey() {
    const apiKey = process.env.FOOTBALL_API_KEY?.replace(/[\r\n]/g, '').trim();

    if (!apiKey) {
        throw new Error('FOOTBALL_API_KEY is not set');
    }

    return apiKey;
}

function buildUrl(path, params) {
    const url = new URL(`${API_BASE_URL}${path}`);

    Object.entries(params)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .forEach(([key, value]) => url.searchParams.set(key, String(value)));

    return url.toString();
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

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

module.exports = drawCard;
module.exports.drawCard = drawCard;
module.exports.getCurrentWindowStart = getCurrentWindowStart;
module.exports.getNextReset = getNextReset;
module.exports.getAvailableCharges = getAvailableCharges;
