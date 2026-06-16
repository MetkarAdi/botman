const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'https://api.sofascore.com/api/v1';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'playerPool.json');
const REQUEST_DELAY_MS = 1000;

const LEAGUES = [
    { name: 'Premier League', tid: 17, sid: 52186 },
    { name: 'La Liga', tid: 8, sid: 52376 },
    { name: 'Serie A', tid: 23, sid: 52760 },
    { name: 'Bundesliga', tid: 35, sid: 52608 },
    { name: 'Ligue 1', tid: 34, sid: 52571 }
];

const TOP_PLAYER_CATEGORIES = ['rating', 'goals', 'assists'];

main().catch((error) => {
    console.error('[FCDraw] Failed to build player pool:', error);
    process.exitCode = 1;
});

async function main() {
    const playersById = new Map();
    const countsByLeague = new Map();

    for (const league of LEAGUES) {
        const beforeCount = playersById.size;

        for (const category of TOP_PLAYER_CATEGORIES) {
            const data = await apiGet(buildTopPlayersUrl(league, category));
            const topPlayers = Array.isArray(data.topPlayers) ? data.topPlayers : [];

            for (const entry of topPlayers) {
                const playerData = mapPlayerEntry(entry, league.name);

                if (!playerData || playersById.has(playerData.playerId) || !isValidPlayer(playerData)) {
                    continue;
                }

                playersById.set(playerData.playerId, playerData);
            }

            console.log(`[FCDraw] ${league.name} ${category}: ${topPlayers.length} players`);
            await delay(REQUEST_DELAY_MS);
        }

        countsByLeague.set(league.name, playersById.size - beforeCount);
    }

    const pool = Array.from(playersById.values());
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(pool, null, 2)}\n`);

    for (const [leagueName, count] of countsByLeague.entries()) {
        console.log(`[FCDraw] ${leagueName}: ${count} valid unique players`);
    }

    console.log(`[FCDraw] Wrote ${pool.length} total valid players to ${OUTPUT_PATH}`);
}

async function apiGet(url) {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'application/json',
            Referer: 'https://www.sofascore.com/'
        }
    });

    if (!response.ok) {
        throw new Error(`Sofascore request failed with status ${response.status} for ${url}`);
    }

    return response.json();
}

function buildTopPlayersUrl(league, category) {
    return `${API_BASE_URL}/unique-tournament/${league.tid}/season/${league.sid}/top-players/${category}`;
}

function mapPlayerEntry(entry, leagueName) {
    const player = entry.player;
    const statistics = entry.statistics || {};

    if (!player?.id) {
        return null;
    }

    return {
        playerId: player.id,
        playerName: player.name,
        playerPhoto: `${API_BASE_URL}/player/${player.id}/image`,
        club: player.team?.name || 'Unknown',
        clubLogo: player.team?.id ? `${API_BASE_URL}/team/${player.team.id}/image` : null,
        league: leagueName,
        position: player.position || 'Unknown',
        rating: statistics.rating || null,
        stats: {
            goals: statistics.goals || 0,
            assists: statistics.goalAssist || 0,
            appearances: statistics.appearances || 0,
            passAccuracy: statistics.accuratePasses || 0,
            dribbles: statistics.successfulDribbles || 0,
            keyPasses: statistics.keyPasses || 0,
            yellowCards: statistics.yellowCards || 0,
            redCards: statistics.redCards || 0
        }
    };
}

function isValidPlayer(playerData) {
    return playerData.rating !== null && playerData.stats.appearances >= 5;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
