const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

const JOLPICA_URL = 'https://api.jolpi.ca/ergast/f1/current/driverStandings.json';
const OPENF1_BASE_URL = 'https://api.openf1.org/v1';
const API_SPORTS_BASE_URL = 'https://v1.formula-1.api-sports.io';

module.exports = {
    name: 'f1standings',
    aliases: ['f1s'],
    description: 'Get the current Formula 1 driver standings',
    usage: 'f1standings',
    category: 'api',
    cooldown: 10,

    async execute(message, args, client) {
        const loading = await message.reply('🏎️ Fetching F1 driver standings...');

        try {
            const standings = await fetchJolpicaStandings();
            const embed = buildStandingsEmbed(standings, 'Source: Jolpica');
            return loading.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('Jolpica F1 standings error:', error.response?.data || error.message);
        }

        try {
            const standings = await fetchOpenF1FallbackStandings();
            const embed = buildStandingsEmbed(standings, 'Source: OpenF1 (fallback)');
            return loading.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('OpenF1 fallback standings error:', error.response?.data || error.message);
        }

        try {
            const standings = await fetchApiSportsStandings();
            const embed = buildStandingsEmbed(standings, 'Source: API-Sports (fallback)');
            return loading.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('API-Sports fallback standings error:', error.response?.data || error.message);
            return loading.edit('❌ Could not fetch F1 standings right now.');
        }
    }
};

async function fetchJolpicaStandings() {
    const res = await axios.get(JOLPICA_URL, { timeout: 10000 });
    const standingsList = res.data?.MRData?.StandingsTable?.StandingsLists?.[0];
    const driverStandings = standingsList?.DriverStandings;

    if (!standingsList?.season || !Array.isArray(driverStandings) || driverStandings.length === 0) {
        throw new Error('Invalid Jolpica standings response');
    }

    return {
        season: standingsList.season,
        drivers: driverStandings.slice(0, 10).map((standing) => {
            const driver = standing.Driver || {};
            const constructor = standing.Constructors?.[0] || {};
            const driverName = [driver.givenName, driver.familyName].filter(Boolean).join(' ') || driver.driverId || 'Unknown Driver';

            return {
                position: standing.position,
                driverName,
                points: standing.points,
                constructorName: constructor.name || 'Unknown Constructor'
            };
        })
    };
}

async function fetchOpenF1FallbackStandings() {
    const [sessionRes, driversRes] = await Promise.all([
        axios.get(`${OPENF1_BASE_URL}/sessions`, {
            params: { session_key: 'latest' },
            timeout: 10000
        }),
        axios.get(`${OPENF1_BASE_URL}/drivers`, {
            params: { session_key: 'latest' },
            timeout: 10000
        })
    ]);

    const session = Array.isArray(sessionRes.data) ? sessionRes.data[0] : null;
    const drivers = Array.isArray(driversRes.data) ? driversRes.data : [];

    if (!session?.date_start || drivers.length === 0) {
        throw new Error('Invalid OpenF1 session or driver response');
    }

    const positionRes = await axios.get(`${OPENF1_BASE_URL}/position`, {
        params: {
            session_key: 'latest',
            'date>=': session.date_start
        },
        timeout: 10000
    });

    const positions = Array.isArray(positionRes.data) ? positionRes.data : [];
    if (positions.length === 0) {
        throw new Error('Invalid OpenF1 position response');
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

    const orderedDrivers = [...latestPositions.values()]
        .filter((position) => driversByNumber.has(Number(position.driver_number)))
        .sort((a, b) => Number(a.position) - Number(b.position))
        .slice(0, 10)
        .map((position, index) => {
            const driver = driversByNumber.get(Number(position.driver_number));

            return {
                position: position.position || String(index + 1),
                driverName: driver.full_name || driver.broadcast_name || driver.name_acronym || `Driver #${position.driver_number}`,
                points: 'N/A',
                constructorName: driver.team_name || 'Unknown Constructor'
            };
        });

    if (orderedDrivers.length === 0) {
        throw new Error('No OpenF1 fallback drivers found');
    }

    return {
        season: new Date(session.date_start).getUTCFullYear(),
        drivers: orderedDrivers
    };
}

async function fetchApiSportsStandings() {
    const season = new Date().getFullYear();
    const res = await axios.get(`${API_SPORTS_BASE_URL}/rankings/drivers`, {
        params: { season },
        headers: getApiSportsHeaders(),
        timeout: 10000
    });
    const rankings = res.data?.response;

    if (!Array.isArray(rankings) || rankings.length === 0) {
        throw new Error('Invalid API-Sports driver rankings response');
    }

    return {
        season,
        drivers: rankings.slice(0, 10).map((ranking, index) => ({
            position: ranking.position || index + 1,
            driverName: ranking.driver?.name || ranking.driver?.abbr || 'Unknown Driver',
            points: ranking.points ?? 'N/A',
            constructorName: ranking.team?.name || 'Unknown Constructor'
        }))
    };
}

function buildStandingsEmbed(standings, footerText) {
    const embed = new EmbedBuilder()
        .setTitle(`🏎️ F1 Driver Standings — ${standings.season}`)
        .setColor('#e8002d')
        .setFooter({ text: footerText });

    for (const driver of standings.drivers) {
        embed.addFields({
            name: `#${driver.position} ${driver.driverName}`,
            value: `${driver.points} pts — ${driver.constructorName}`,
            inline: false
        });
    }

    return embed;
}

function getApiSportsHeaders() {
    if (!process.env.FOOTBALL_API_KEY) {
        throw new Error('FOOTBALL_API_KEY is not set');
    }

    return { 'x-apisports-key': process.env.FOOTBALL_API_KEY };
}
