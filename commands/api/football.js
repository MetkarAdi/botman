const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { logError } = require('../../utils/errorLogger');

const BASE_URL = 'https://v3.football.api-sports.io';
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();

const LEAGUES = new Map([
    ['premier league', { id: 39, name: 'Premier League' }],
    ['epl', { id: 39, name: 'Premier League' }],
    ['la liga', { id: 140, name: 'La Liga' }],
    ['laliga', { id: 140, name: 'La Liga' }],
    ['serie a', { id: 135, name: 'Serie A' }],
    ['bundesliga', { id: 78, name: 'Bundesliga' }],
    ['ligue 1', { id: 61, name: 'Ligue 1' }],
    ['champions league', { id: 2, name: 'Champions League' }],
    ['ucl', { id: 2, name: 'Champions League' }],
    ['europa league', { id: 3, name: 'Europa League' }],
    ['uel', { id: 3, name: 'Europa League' }],
    ['world cup', { id: 1, name: 'World Cup' }]
]);

const SUPPORTED_LEAGUES = 'Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Europa League, World Cup';

module.exports = {
    name: 'football',
    aliases: ['fifa', 'soccer', 'fl'],
    description: 'Get football live scores, results, standings, fixtures, teams, and players',
    usage: 'football <live|scores|standings|next|team|player> [query]',
    category: 'api',
    cooldown: 10,

    async execute(message, args, client) {
        const subcommand = args.shift()?.toLowerCase();

        if (!subcommand) {
            return message.reply(getUsage());
        }

        try {
            switch (subcommand) {
                case 'live':
                    return await handleLive(message);
                case 'scores':
                    return await handleScores(message, args);
                case 'standings':
                    return await handleStandings(message, args);
                case 'next':
                    return await handleNext(message, args);
                case 'team':
                    return await handleTeam(message, args);
                case 'player':
                    return await handlePlayer(message, args);
                default:
                    return message.reply(getUsage());
            }
        } catch (error) {
            await logError(client, error, `football — ${subcommand || 'main'}`);
            return message.reply(`❌ Could not fetch football data. Try again shortly.\n\`\`\`${error.message}\`\`\``);
        }
    }
};

async function handleLive(message) {
    const loading = await message.reply('⚽ Fetching live matches...');
    const data = await apiGet('/fixtures', { live: 'all' });
    const fixtures = Array.isArray(data.response) ? data.response.slice(0, 10) : [];

    const description = fixtures.length
        ? fixtures.map((fixture) => {
            const homeTeam = fixture.teams?.home?.name || 'Home';
            const awayTeam = fixture.teams?.away?.name || 'Away';
            const homeScore = fixture.goals?.home ?? 0;
            const awayScore = fixture.goals?.away ?? 0;
            const elapsed = fixture.fixture?.status?.elapsed ?? 0;

            return `${homeTeam} ${homeScore} — ${awayScore} ${awayTeam} (${elapsed}')`;
        }).join('\n')
        : 'No live matches right now.';

    const embed = new EmbedBuilder()
        .setTitle('⚽ Live Matches')
        .setColor('#00ff00')
        .setDescription(description)
        .setFooter({ text: 'Source: API-Sports' });

    return loading.edit({ content: null, embeds: [embed] });
}

async function handleScores(message, args) {
    const league = resolveLeague(args);
    if (!league) return message.reply(`❌ Unknown league. Supported: ${SUPPORTED_LEAGUES}.`);

    const loading = await message.reply(`⚽ Fetching recent results for ${league.name}...`);
    const data = await apiGet('/fixtures', {
        league: league.id,
        season: new Date().getFullYear(),
        last: 10
    });
    const fixtures = Array.isArray(data.response) ? data.response : [];
    const description = fixtures.length
        ? fixtures.map(formatScoreLine).join('\n')
        : 'No recent results found.';

    const embed = new EmbedBuilder()
        .setTitle(`⚽ Recent Results — ${league.name}`)
        .setColor('#3498db')
        .setDescription(description)
        .setFooter({ text: 'Source: API-Sports' });

    return loading.edit({ content: null, embeds: [embed] });
}

async function handleStandings(message, args) {
    const league = resolveLeague(args);
    if (!league) return message.reply(`❌ Unknown league. Supported: ${SUPPORTED_LEAGUES}.`);

    const loading = await message.reply(`⚽ Fetching standings for ${league.name}...`);
    const standings = await fetchStandings(league.id, new Date().getFullYear());
    const description = standings.slice(0, 10).map((row) => {
        const rank = row.rank ?? '?';
        const teamName = row.team?.name || 'Unknown Team';
        const points = row.points ?? 0;
        const win = row.all?.win ?? 0;
        const draw = row.all?.draw ?? 0;
        const lose = row.all?.lose ?? 0;
        const goalsDiff = row.goalsDiff ?? 0;

        return `#${rank} ${teamName} — ${points}pts | W${win} D${draw} L${lose} | GD${goalsDiff}`;
    }).join('\n') || 'No standings found.';

    const embed = new EmbedBuilder()
        .setTitle(`⚽ ${league.name} Standings`)
        .setColor('#3498db')
        .setDescription(description)
        .setFooter({ text: 'Source: API-Sports' });

    return loading.edit({ content: null, embeds: [embed] });
}

async function handleNext(message, args) {
    const league = resolveLeague(args);
    if (!league) return message.reply(`❌ Unknown league. Supported: ${SUPPORTED_LEAGUES}.`);

    const loading = await message.reply(`⚽ Fetching upcoming fixtures for ${league.name}...`);
    const data = await apiGet('/fixtures', {
        league: league.id,
        season: new Date().getFullYear(),
        next: 5
    });
    const fixtures = Array.isArray(data.response) ? data.response : [];
    const description = fixtures.length
        ? fixtures.map((fixture) => {
            const homeTeam = fixture.teams?.home?.name || 'Home';
            const awayTeam = fixture.teams?.away?.name || 'Away';
            const kickoff = Math.floor(new Date(fixture.fixture?.date).getTime() / 1000);

            return `${homeTeam} vs ${awayTeam} — <t:${kickoff}:F>`;
        }).join('\n')
        : 'No upcoming fixtures found.';

    const embed = new EmbedBuilder()
        .setTitle(`⚽ Upcoming — ${league.name}`)
        .setColor('#3498db')
        .setDescription(description)
        .setFooter({ text: 'Source: API-Sports' });

    return loading.edit({ content: null, embeds: [embed] });
}

async function handleTeam(message, args) {
    const query = args.join(' ').trim();
    if (!query) return message.reply('❌ Provide a team name. E.g. `>>football team arsenal`');

    const loading = await message.reply(`⚽ Fetching team info for ${query}...`);
    const teamsData = await apiGet('/teams', { search: query });
    const teamEntry = Array.isArray(teamsData.response) ? teamsData.response[0] : null;
    if (!teamEntry?.team?.id) return loading.edit('❌ Team not found.');

    const team = teamEntry.team;
    const venue = teamEntry.venue || {};
    const fixturesData = await apiGet('/fixtures', { team: team.id, last: 5 });
    const fixtures = Array.isArray(fixturesData.response) ? fixturesData.response : [];
    const currentLeague = fixtures[0]?.league || {};
    const standings = currentLeague.id
        ? await fetchStandings(currentLeague.id, new Date().getFullYear(), team.id).catch(() => [])
        : [];
    const standing = standings.find((row) => row.team?.id === team.id) || standings[0] || {};

    const embed = new EmbedBuilder()
        .setTitle(team.name || 'Football Team')
        .setColor('#3498db')
        .setThumbnail(team.logo || null)
        .addFields(
            { name: 'League', value: currentLeague.name || 'N/A', inline: true },
            { name: 'Position', value: standing.rank ? `#${standing.rank}` : 'N/A', inline: true },
            { name: 'Form', value: getForm(fixtures, team.id) || 'N/A', inline: true },
            { name: 'Last 5', value: fixtures.length ? fixtures.map(formatScoreLine).join('\n') : 'N/A', inline: false },
            { name: 'Founded', value: team.founded ? String(team.founded) : 'N/A', inline: true },
            { name: 'Country', value: team.country || 'N/A', inline: true },
            { name: 'Venue', value: formatVenue(venue), inline: false }
        )
        .setFooter({ text: 'Source: API-Sports' });

    return loading.edit({ content: null, embeds: [embed] });
}

async function handlePlayer(message, args) {
    const query = args.join(' ').trim();
    if (!query) return message.reply('❌ Provide a player name. E.g. `>>football player messi`');

    const loading = await message.reply(`⚽ Fetching player info for ${query}...`);
    const data = await apiGet('/players', {
        search: query,
        season: new Date().getFullYear()
    });
    const playerEntry = Array.isArray(data.response) ? data.response[0] : null;
    if (!playerEntry?.player) return loading.edit('❌ Player not found.');

    const player = playerEntry.player;
    const stats = playerEntry.statistics?.[0] || {};
    const embed = new EmbedBuilder()
        .setTitle(player.name || 'Football Player')
        .setColor('#3498db')
        .setThumbnail(player.photo || null)
        .addFields(
            { name: 'Team', value: stats.team?.name || 'N/A', inline: true },
            { name: 'Position', value: stats.games?.position || 'N/A', inline: true },
            { name: 'Nationality', value: player.nationality || 'N/A', inline: true },
            { name: 'Age', value: player.age ? String(player.age) : 'N/A', inline: true },
            { name: 'Goals', value: statValue(stats.goals?.total), inline: true },
            { name: 'Assists', value: statValue(stats.goals?.assists), inline: true },
            { name: 'Appearances', value: statValue(stats.games?.appearences), inline: true },
            { name: 'Yellow Cards', value: statValue(stats.cards?.yellow), inline: true },
            { name: 'Red Cards', value: statValue(stats.cards?.red), inline: true }
        )
        .setFooter({ text: 'Source: API-Sports' });

    return loading.edit({ content: null, embeds: [embed] });
}

async function apiGet(path, params = {}) {
    if (!process.env.FOOTBALL_API_KEY) {
        throw new Error('FOOTBALL_API_KEY is not set');
    }

    const url = buildUrl(path, params);
    const cached = cache.get(url);

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        return cached.data;
    }

    const res = await axios.get(url, {
        headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY },
        timeout: 10000
    });
    console.log(`[Football] GET ${url} → ${res.status}`);

    cache.set(url, { data: res.data, fetchedAt: Date.now() });
    return res.data;
}

async function fetchStandings(leagueId, season, teamId = null) {
    const data = await apiGet('/standings', {
        league: leagueId,
        season,
        team: teamId
    });
    const standings = data.response?.[0]?.league?.standings?.[0];

    return Array.isArray(standings) ? standings : [];
}

function buildUrl(path, params) {
    const url = new URL(`${BASE_URL}${path}`);

    Object.entries(params)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, value]) => url.searchParams.set(key, String(value)));

    return url.toString();
}

function resolveLeague(args) {
    const query = args.join(' ').trim().toLowerCase();
    return LEAGUES.get(query) || null;
}

function formatScoreLine(fixture) {
    const homeTeam = fixture.teams?.home?.name || 'Home';
    const awayTeam = fixture.teams?.away?.name || 'Away';
    const homeScore = fixture.goals?.home ?? 0;
    const awayScore = fixture.goals?.away ?? 0;

    return `${homeTeam} ${homeScore}—${awayScore} ${awayTeam}`;
}

function getForm(fixtures, teamId) {
    return fixtures.map((fixture) => {
        const homeId = fixture.teams?.home?.id;
        const awayId = fixture.teams?.away?.id;
        const homeScore = fixture.goals?.home;
        const awayScore = fixture.goals?.away;

        if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) {
            return null;
        }

        const isHome = homeId === teamId;
        const teamScore = isHome ? homeScore : awayScore;
        const opponentScore = isHome ? awayScore : homeScore;

        if (teamScore > opponentScore) return 'W';
        if (teamScore < opponentScore) return 'L';
        return 'D';
    }).filter(Boolean).join('');
}

function formatVenue(venue) {
    const name = venue.name || 'N/A';
    const capacity = venue.capacity ? ` (${venue.capacity.toLocaleString()} capacity)` : '';

    return `${name}${capacity}`;
}

function statValue(value) {
    return value === null || value === undefined ? '0' : String(value);
}

function getUsage() {
    return [
        'Usage:',
        '`>>football live`',
        '`>>football scores <league>`',
        '`>>football standings <league>`',
        '`>>football next <league>`',
        '`>>football team <team name>`',
        '`>>football player <name>`'
    ].join('\n');
}
