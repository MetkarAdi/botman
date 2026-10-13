const Guild = require('../models/Guild');
const AccessList = require('../models/AccessList');
const Afk = require('../models/Afk');

const USER_CACHE_TTL_MS = 60_000;
const MAX_USER_CACHE_ENTRIES = 10_000;

function caches(client) {
    client.runtimeCache ??= {
        guilds: new Map(),
        guildLoads: new Map(),
        blacklists: new Map(),
        blacklistLoads: new Map(),
        afks: new Map(),
        afkLoads: new Map()
    };
    return client.runtimeCache;
}

function userCacheKey(guildId, userId) {
    return `${guildId}:${userId}`;
}

function trimUserCache(cache) {
    if (cache.size < MAX_USER_CACHE_ENTRIES) return;

    const now = Date.now();
    for (const [key, entry] of cache) {
        if (entry.expiresAt <= now) cache.delete(key);
    }

    if (cache.size >= MAX_USER_CACHE_ENTRIES) cache.clear();
}

async function getGuildConfig(client, guildId) {
    const cache = caches(client);
    if (cache.guilds.has(guildId)) return cache.guilds.get(guildId);
    if (cache.guildLoads.has(guildId)) return cache.guildLoads.get(guildId);

    const load = Guild.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId, prefix: client.config.defaultPrefix } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).then((guildData) => {
        cache.guilds.set(guildId, guildData);
        return guildData;
    }).finally(() => cache.guildLoads.delete(guildId));

    cache.guildLoads.set(guildId, load);
    return load;
}

function cacheGuildConfig(client, guildData) {
    if (guildData?.guildId) caches(client).guilds.set(guildData.guildId, guildData);
}

async function isBlacklisted(client, userId) {
    const cache = caches(client);
    const cached = cache.blacklists.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cache.blacklistLoads.has(userId)) return cache.blacklistLoads.get(userId);

    const load = AccessList.exists({ userId, type: 'blacklist' }).then((entry) => {
        trimUserCache(cache.blacklists);
        const value = Boolean(entry);
        cache.blacklists.set(userId, { value, expiresAt: Date.now() + USER_CACHE_TTL_MS });
        return value;
    }).finally(() => cache.blacklistLoads.delete(userId));

    cache.blacklistLoads.set(userId, load);
    return load;
}

function cacheBlacklist(client, userId, value) {
    const cache = caches(client);
    trimUserCache(cache.blacklists);
    cache.blacklists.set(userId, { value, expiresAt: Date.now() + USER_CACHE_TTL_MS });
}

async function getAfk(client, guildId, userId) {
    const cache = caches(client);
    const key = userCacheKey(guildId, userId);
    const cached = cache.afks.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cache.afkLoads.has(key)) return cache.afkLoads.get(key);

    const load = Afk.findOne({ userId, guildId }).then((afk) => {
        trimUserCache(cache.afks);
        cache.afks.set(key, { value: afk, expiresAt: Date.now() + USER_CACHE_TTL_MS });
        return afk;
    }).finally(() => cache.afkLoads.delete(key));

    cache.afkLoads.set(key, load);
    return load;
}

function cacheAfk(client, guildId, userId, value) {
    const cache = caches(client);
    trimUserCache(cache.afks);
    cache.afks.set(userCacheKey(guildId, userId), {
        value,
        expiresAt: Date.now() + USER_CACHE_TTL_MS
    });
}

module.exports = {
    getGuildConfig,
    cacheGuildConfig,
    isBlacklisted,
    cacheBlacklist,
    getAfk,
    cacheAfk
};
