const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { logError } = require('../../utils/errorLogger');

const OPENF1_BASE_URL = 'https://api.openf1.org/v1';
const API_SPORTS_BASE_URL = 'https://v1.formula-1.api-sports.io';

module.exports = {
    name: 'f1live',
    aliases: ['f1l'],
    description: 'Get live Formula 1 session positions from OpenF1',
    usage: 'f1live',
    category: 'api',
    cooldown: 10,

    async execute(message, args, client) {
        const loading = await message.reply('🏎️ Fetching live F1 session...');

        try {
            const session = await fetchLatestSession();

            if (!isLiveSession(session)) {
                const apiSportsLive = await fetchApiSportsLiveRaces();

                if (!apiSportsLive.length) {
                    return loading.edit('⚠️ No live F1 session right now. Try during a race weekend.');
                }

                const embed = buildApiSportsLiveEmbed(apiSportsLive);
                return loading.edit({ content: null, embeds: [embed] });
            }

            const liveData = await fetchLivePositions(session);
            const embed = buildLiveEmbed(session, liveData);
            return loading.edit({ content: null, embeds: [embed] });
        } catch (error) {
            await logError(client, error, 'f1live — openf1');
        }

        try {
            const apiSportsLive = await fetchApiSportsLiveRaces();

            if (!apiSportsLive.length) {
                return loading.edit('⚠️ No live F1 session right now. Try during a race weekend.');
            }

            const embed = buildApiSportsLiveEmbed(apiSportsLive);
            return loading.edit({ content: null, embeds: [embed] });
        } catch (error) {
            await logError(client, error, 'f1live — api-sports');
            return loading.edit('❌ Could not fetch live F1 data right now.');
        }
    }
};

async function fetchLatestSession() {
    const res = await axios.get(`${OPENF1_BASE_URL}/sessions`, {
        params: { session_key: 'latest' },
        timeout: 10000
    });
    const session = Array.isArray(res.data) ? res.data[0] : null;

    if (!session?.session_key || !session?.date_end) {
        throw new Error('Invalid OpenF1 latest session response');
    }

    return session;
}

function isLiveSession(session) {
    const sessionEnd = new Date(session.date_end).getTime();
    const now = Date.now();

    return sessionEnd >= now;
}

async function fetchLivePositions(session) {
    const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
    const [positionRes, driversRes] = await Promise.all([
        axios.get(`${OPENF1_BASE_URL}/position`, {
            params: {
                session_key: 'latest',
                'date>=': twoMinutesAgo
            },
            timeout: 10000
        }),
        axios.get(`${OPENF1_BASE_URL}/drivers`, {
            params: { session_key: 'latest' },
            timeout: 10000
        })
    ]);

    const positions = Array.isArray(positionRes.data) ? positionRes.data : [];
    const drivers = Array.isArray(driversRes.data) ? driversRes.data : [];

    if (positions.length === 0 || drivers.length === 0) {
        throw new Error('Invalid OpenF1 live position or driver response');
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
        .map((position) => {
            const driver = driversByNumber.get(Number(position.driver_number));

            return {
                position: position.position,
                driverCode: driver.name_acronym || driver.broadcast_name || `#${position.driver_number}`,
                teamName: driver.team_name || 'Unknown Team'
            };
        });

    if (orderedDrivers.length === 0) {
        throw new Error('No live OpenF1 drivers found');
    }

    return orderedDrivers;
}

async function fetchApiSportsLiveRaces() {
    const season = new Date().getFullYear();
    const res = await axios.get(`${API_SPORTS_BASE_URL}/races`, {
        params: {
            season,
            live: 'all'
        },
        headers: getApiSportsHeaders(),
        timeout: 10000
    });
    const races = Array.isArray(res.data?.response) ? res.data.response : [];

    return races.filter((race) => race.status || race.competition || race.date);
}

function buildLiveEmbed(session, drivers) {
    const now = Math.floor(Date.now() / 1000);
    const sessionName = session.session_name || 'Session';
    const countryName = session.country_name || 'Unknown Country';
    const sessionType = session.session_type || sessionName;

    return new EmbedBuilder()
        .setTitle(`🔴 LIVE — ${sessionName} · ${countryName}`)
        .setColor('#ff0000')
        .setDescription(drivers.map((driver) => `#${driver.position} ${driver.driverCode} (${driver.teamName})`).join('\n'))
        .addFields(
            { name: 'Session', value: sessionType, inline: true },
            { name: 'Updated', value: `<t:${now}:R>`, inline: true }
        )
        .setFooter({ text: 'Source: OpenF1 · Updates every fetch' });
}

function buildApiSportsLiveEmbed(races) {
    const now = Math.floor(Date.now() / 1000);
    const race = races[0] || {};
    const sessionName = race.type || race.status || 'Live Session';
    const countryName = race.competition?.location?.country || race.country || 'Unknown Country';
    const description = races.map((liveRace) => {
        const name = liveRace.competition?.name || liveRace.name || liveRace.type || 'F1 Session';
        const status = liveRace.status || 'Live';
        const location = liveRace.competition?.location?.country || liveRace.country || 'Unknown Country';

        return `${name} (${location}) — ${status}`;
    }).join('\n');

    return new EmbedBuilder()
        .setTitle(`🔴 LIVE — ${sessionName} · ${countryName}`)
        .setColor('#ff0000')
        .setDescription(description)
        .addFields(
            { name: 'Session', value: sessionName, inline: true },
            { name: 'Updated', value: `<t:${now}:R>`, inline: true }
        )
        .setFooter({ text: 'Source: API-Sports (fallback) · Updates every fetch' });
}

function getApiSportsHeaders() {
    if (!process.env.FOOTBALL_API_KEY) {
        throw new Error('FOOTBALL_API_KEY is not set');
    }

    return { 'x-apisports-key': process.env.FOOTBALL_API_KEY };
}
