const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { logError } = require('../../utils/errorLogger');

const JOLPICA_RESULTS_URL = 'https://api.jolpi.ca/ergast/f1/current/last/results.json';
const OPENF1_BASE_URL = 'https://api.openf1.org/v1';
const API_SPORTS_BASE_URL = 'https://v1.formula-1.api-sports.io';

module.exports = {
    name: 'f1results',
    aliases: ['f1r'],
    description: 'Get the latest Formula 1 race results',
    usage: 'f1results',
    category: 'api',
    cooldown: 10,

    async execute(message, args, client) {
        const loading = await message.reply('🏎️ Fetching F1 race results...');

        try {
            const results = await fetchJolpicaResults();
            const embed = buildJolpicaEmbed(results);
            return loading.edit({ content: null, embeds: [embed] });
        } catch (error) {
            await logError(client, error, 'f1results — jolpica');
        }

        try {
            const results = await fetchOpenF1FallbackResults();
            const embed = buildOpenF1Embed(results);
            return loading.edit({ content: null, embeds: [embed] });
        } catch (error) {
            await logError(client, error, 'f1results — openf1');
        }

        try {
            const results = await fetchApiSportsResults();
            const embed = buildApiSportsEmbed(results);
            return loading.edit({ content: null, embeds: [embed] });
        } catch (error) {
            await logError(client, error, 'f1results — api-sports');
            return loading.edit('❌ Could not fetch race results.');
        }
    }
};

async function fetchJolpicaResults() {
    const res = await axios.get(JOLPICA_RESULTS_URL, { timeout: 10000 });
    const race = res.data?.MRData?.RaceTable?.Races?.[0];
    const raceResults = race?.Results;

    if (!race?.raceName || !race?.round || !race?.date || !Array.isArray(raceResults) || raceResults.length === 0) {
        throw new Error('Invalid Jolpica race results response');
    }

    const topResults = raceResults.slice(0, 10).map((result) => {
        const driver = result.Driver || {};
        const constructor = result.Constructor || {};

        return {
            position: result.position,
            driverCode: driver.code || driver.permanentNumber || driver.driverId || 'UNK',
            driverName: [driver.givenName, driver.familyName].filter(Boolean).join(' ') || driver.driverId || 'Unknown Driver',
            constructorName: constructor.name || 'Unknown Constructor',
            resultText: result.Time?.time || result.status || 'No time'
        };
    });

    return {
        raceName: race.raceName,
        round: race.round,
        date: race.date,
        results: topResults,
        fastestLap: getFastestLap(raceResults)
    };
}

async function fetchOpenF1FallbackResults() {
    const currentYear = new Date().getFullYear();
    const sessionRes = await axios.get(`${OPENF1_BASE_URL}/sessions`, {
        params: {
            session_name: 'Race',
            year: currentYear
        },
        timeout: 10000
    });

    const sessions = Array.isArray(sessionRes.data) ? sessionRes.data : [];
    const latestRace = sessions
        .filter((session) => session.session_key && session.date_end)
        .sort((a, b) => new Date(b.date_end) - new Date(a.date_end))[0];

    if (!latestRace?.session_key || !latestRace?.date_end) {
        throw new Error('No latest OpenF1 race session found');
    }

    const [positionRes, driversRes] = await Promise.all([
        axios.get(`${OPENF1_BASE_URL}/position`, {
            params: {
                session_key: latestRace.session_key,
                'date>=': latestRace.date_end
            },
            timeout: 10000
        }),
        axios.get(`${OPENF1_BASE_URL}/drivers`, {
            params: { session_key: latestRace.session_key },
            timeout: 10000
        })
    ]);

    const positions = Array.isArray(positionRes.data) ? positionRes.data : [];
    const drivers = Array.isArray(driversRes.data) ? driversRes.data : [];

    if (positions.length === 0 || drivers.length === 0) {
        throw new Error('Invalid OpenF1 position or driver response');
    }

    const driversByNumber = new Map(drivers.map((driver) => [Number(driver.driver_number), driver]));
    const latestPositions = new Map();

    for (const position of positions) {
        const driverNumber = Number(position.driver_number);
        const current = latestPositions.get(driverNumber);

        if (!current || new Date(position.date) > new Date(current.date)) {
            latestPositions.set(driverNumber, position);
        }
    }

    const results = [...latestPositions.values()]
        .filter((position) => driversByNumber.has(Number(position.driver_number)))
        .sort((a, b) => Number(a.position) - Number(b.position))
        .slice(0, 10)
        .map((position) => {
            const driver = driversByNumber.get(Number(position.driver_number));

            return {
                position: position.position,
                driverCode: driver.name_acronym || driver.broadcast_name || `#${position.driver_number}`,
                constructorName: driver.team_name || 'Unknown Constructor',
                resultText: 'Finished'
            };
        });

    if (results.length === 0) {
        throw new Error('No OpenF1 fallback results found');
    }

    return {
        raceName: latestRace.meeting_name || latestRace.location || 'Latest Race',
        date: latestRace.date_end.slice(0, 10),
        results
    };
}

async function fetchApiSportsResults() {
    const season = new Date().getFullYear();
    const racesRes = await axios.get(`${API_SPORTS_BASE_URL}/races`, {
        params: {
            season,
            type: 'Race'
        },
        headers: getApiSportsHeaders(),
        timeout: 10000
    });
    const races = Array.isArray(racesRes.data?.response) ? racesRes.data.response : [];
    const now = Date.now();
    const lastRace = races
        .filter((race) => race.id && race.date && new Date(race.date).getTime() <= now)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (!lastRace?.id) {
        throw new Error('No past API-Sports race found');
    }

    const resultsRes = await axios.get(`${API_SPORTS_BASE_URL}/results`, {
        params: { race: lastRace.id },
        headers: getApiSportsHeaders(),
        timeout: 10000
    });
    const apiResults = Array.isArray(resultsRes.data?.response) ? resultsRes.data.response : [];

    if (apiResults.length === 0) {
        throw new Error('Invalid API-Sports race results response');
    }

    const results = apiResults
        .slice()
        .sort((a, b) => Number(a.position || a.rank || 999) - Number(b.position || b.rank || 999))
        .slice(0, 10)
        .map((result, index) => ({
            position: result.position || result.rank || index + 1,
            driverCode: result.driver?.abbr || getDriverCode(result.driver?.name) || 'UNK',
            constructorName: result.team?.name || 'Unknown Constructor',
            resultText: result.time || result.status || result.gap || 'No time'
        }));

    return {
        raceName: lastRace.competition?.name || lastRace.name || 'Latest Race',
        round: lastRace.round || '?',
        date: lastRace.date ? lastRace.date.slice(0, 10) : 'Unknown date',
        results,
        fastestLap: getApiSportsFastestLap(lastRace)
    };
}

function buildJolpicaEmbed(race) {
    const embed = new EmbedBuilder()
        .setTitle(`🏎️ ${race.raceName} — Results`)
        .setColor('#e8002d')
        .setDescription(formatResults(race.results))
        .setFooter({ text: `Round ${race.round} · ${race.date} · Source: Jolpica` });

    if (race.fastestLap) {
        embed.addFields({
            name: 'Fastest Lap',
            value: `${race.fastestLap.driverName} — ${race.fastestLap.time}`,
            inline: false
        });
    }

    return embed;
}

function buildApiSportsEmbed(race) {
    const embed = new EmbedBuilder()
        .setTitle(`🏎️ ${race.raceName} — Results`)
        .setColor('#e8002d')
        .setDescription(formatResults(race.results))
        .setFooter({ text: `Round ${race.round} · ${race.date} · Source: API-Sports (fallback)` });

    if (race.fastestLap) {
        embed.addFields({
            name: 'Fastest Lap',
            value: `${race.fastestLap.driverName} — ${race.fastestLap.time}`,
            inline: false
        });
    }

    return embed;
}

function buildOpenF1Embed(race) {
    return new EmbedBuilder()
        .setTitle(`🏎️ ${race.raceName} — Results`)
        .setColor('#e8002d')
        .setDescription(formatResults(race.results))
        .setFooter({ text: `${race.date} · Source: OpenF1 (fallback)` });
}

function formatResults(results) {
    return results
        .map((result) => `#${result.position} ${result.driverCode} — ${result.constructorName} | ${result.resultText}`)
        .join('\n');
}

function getFastestLap(results) {
    const result = results.find((entry) => entry.FastestLap?.rank === '1') || results.find((entry) => entry.FastestLap?.Time?.time);

    if (!result?.FastestLap?.Time?.time) {
        return null;
    }

    const driver = result.Driver || {};
    return {
        driverName: [driver.givenName, driver.familyName].filter(Boolean).join(' ') || driver.driverId || 'Unknown Driver',
        time: result.FastestLap.Time.time
    };
}

function getApiSportsFastestLap(race) {
    const fastestLap = race.fastest_lap || race.fastestLap;

    if (!fastestLap?.time) {
        return null;
    }

    return {
        driverName: fastestLap.driver?.name || 'Unknown Driver',
        time: fastestLap.time
    };
}

function getDriverCode(name) {
    if (!name) {
        return null;
    }

    const parts = String(name).trim().split(/\s+/);
    return (parts[parts.length - 1] || name).slice(0, 3).toUpperCase();
}

function getApiSportsHeaders() {
    if (!process.env.FOOTBALL_API_KEY) {
        throw new Error('FOOTBALL_API_KEY is not set');
    }

    return { 'x-apisports-key': process.env.FOOTBALL_API_KEY };
}
