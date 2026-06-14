const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

const JOLPICA_NEXT_URL = 'https://api.jolpi.ca/ergast/f1/current/next.json';
const JOLPICA_SCHEDULE_URL = 'https://api.jolpi.ca/ergast/f1/current.json';
const OPENF1_MEETINGS_URL = 'https://api.openf1.org/v1/meetings';
const API_SPORTS_BASE_URL = 'https://v1.formula-1.api-sports.io';
const F1_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/200px-F1.svg.png';

module.exports = {
    name: 'f1next',
    aliases: ['f1n'],
    description: 'Get the next Formula 1 race',
    usage: 'f1next',
    category: 'api',
    cooldown: 10,

    async execute(message, args, client) {
        const loading = await message.reply('🏎️ Fetching next F1 race...');

        try {
            const nextRace = await fetchJolpicaNextRace();
            const embed = buildJolpicaEmbed(nextRace);
            return loading.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('Jolpica next F1 race error:', error.response?.data || error.message);
        }

        try {
            const nextMeeting = await fetchOpenF1NextMeeting();
            const embed = buildOpenF1Embed(nextMeeting);
            return loading.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('OpenF1 next F1 race fallback error:', error.response?.data || error.message);
        }

        try {
            const nextRace = await fetchApiSportsNextRace();
            const embed = buildApiSportsEmbed(nextRace);
            return loading.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('API-Sports next F1 race fallback error:', error.response?.data || error.message);
            return loading.edit('❌ Could not fetch next race info.');
        }
    }
};

async function fetchJolpicaNextRace() {
    const res = await axios.get(JOLPICA_NEXT_URL, { timeout: 10000 });
    const raceTable = res.data?.MRData?.RaceTable;
    const race = raceTable?.Races?.[0];

    if (!race?.raceName || !race?.Circuit || !race?.date || !race?.time || !race?.round) {
        throw new Error('Invalid Jolpica next race response');
    }

    const totalRounds = await fetchJolpicaTotalRounds().catch(() => '?');

    return {
        raceName: race.raceName,
        circuitName: race.Circuit.circuitName || 'Unknown Circuit',
        locality: race.Circuit.Location?.locality || 'Unknown Locality',
        country: race.Circuit.Location?.country || 'Unknown Country',
        timestamp: getUnixTimestamp(race.date, race.time),
        round: race.round,
        totalRounds
    };
}

async function fetchJolpicaTotalRounds() {
    const res = await axios.get(JOLPICA_SCHEDULE_URL, { timeout: 10000 });
    const races = res.data?.MRData?.RaceTable?.Races;

    if (!Array.isArray(races) || races.length === 0) {
        throw new Error('Invalid Jolpica schedule response');
    }

    return races.length;
}

async function fetchOpenF1NextMeeting() {
    const year = new Date().getFullYear();
    const res = await axios.get(OPENF1_MEETINGS_URL, {
        params: { year },
        timeout: 10000
    });

    const now = Date.now();
    const meetings = Array.isArray(res.data) ? res.data : [];
    const nextMeeting = meetings
        .filter((meeting) => meeting.date_start && new Date(meeting.date_start).getTime() > now)
        .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))[0];

    if (!nextMeeting) {
        throw new Error('No upcoming OpenF1 meeting found');
    }

    return {
        name: nextMeeting.meeting_name || nextMeeting.meeting_official_name || 'Unknown Race',
        country: nextMeeting.country_name || 'Unknown Country',
        timestamp: Math.floor(new Date(nextMeeting.date_start).getTime() / 1000)
    };
}

async function fetchApiSportsNextRace() {
    const season = new Date().getFullYear();
    const res = await axios.get(`${API_SPORTS_BASE_URL}/races`, {
        params: {
            season,
            type: 'Race'
        },
        headers: getApiSportsHeaders(),
        timeout: 10000
    });
    const races = Array.isArray(res.data?.response) ? res.data.response : [];
    const now = Date.now();
    const nextRace = races
        .filter((race) => race.date && new Date(race.date).getTime() > now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

    if (!nextRace) {
        throw new Error('No upcoming API-Sports race found');
    }

    return {
        raceName: nextRace.competition?.name || nextRace.name || nextRace.type || 'Unknown Race',
        circuitName: nextRace.circuit?.name || 'Unknown Circuit',
        locality: nextRace.competition?.location?.city || nextRace.location || 'Unknown Locality',
        country: nextRace.competition?.location?.country || nextRace.country || 'Unknown Country',
        timestamp: Math.floor(new Date(nextRace.date).getTime() / 1000),
        round: nextRace.round || '?',
        totalRounds: races.length || '?'
    };
}

function buildJolpicaEmbed(race) {
    return new EmbedBuilder()
        .setTitle('🏎️ Next F1 Race')
        .setColor('#e8002d')
        .setThumbnail(F1_LOGO_URL)
        .addFields(
            { name: 'Race', value: race.raceName, inline: false },
            { name: 'Circuit', value: race.circuitName, inline: false },
            { name: 'Location', value: `${race.locality}, ${race.country}`, inline: false },
            { name: 'Date', value: `<t:${race.timestamp}:F>`, inline: false },
            { name: 'Round', value: `${race.round} / ${race.totalRounds}`, inline: false }
        )
        .setFooter({ text: 'Source: Jolpica' });
}

function buildApiSportsEmbed(race) {
    return new EmbedBuilder()
        .setTitle('🏎️ Next F1 Race')
        .setColor('#e8002d')
        .setThumbnail(F1_LOGO_URL)
        .addFields(
            { name: 'Race', value: race.raceName, inline: false },
            { name: 'Circuit', value: race.circuitName, inline: false },
            { name: 'Location', value: `${race.locality}, ${race.country}`, inline: false },
            { name: 'Date', value: `<t:${race.timestamp}:F>`, inline: false },
            { name: 'Round', value: `${race.round} / ${race.totalRounds}`, inline: false }
        )
        .setFooter({ text: 'Source: API-Sports (fallback)' });
}

function buildOpenF1Embed(meeting) {
    return new EmbedBuilder()
        .setTitle('🏎️ Next F1 Race')
        .setColor('#e8002d')
        .setThumbnail(F1_LOGO_URL)
        .addFields(
            { name: 'Race', value: meeting.name, inline: false },
            { name: 'Country', value: meeting.country, inline: false },
            { name: 'Date', value: `<t:${meeting.timestamp}:F>`, inline: false }
        )
        .setFooter({ text: 'Source: OpenF1 (fallback)' });
}

function getUnixTimestamp(date, time) {
    return Math.floor(new Date(date + 'T' + time).getTime() / 1000);
}

function getApiSportsHeaders() {
    if (!process.env.FOOTBALL_API_KEY) {
        throw new Error('FOOTBALL_API_KEY is not set');
    }

    return { 'x-apisports-key': process.env.FOOTBALL_API_KEY };
}
