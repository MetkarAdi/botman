const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { logError } = require('../../utils/errorLogger');

const JOLPICA_STANDINGS_URL = 'https://api.jolpi.ca/ergast/f1/current/driverStandings.json';
const OPENF1_DRIVERS_URL = 'https://api.openf1.org/v1/drivers';
const API_SPORTS_BASE_URL = 'https://v1.formula-1.api-sports.io';

module.exports = {
    name: 'f1driver',
    aliases: ['f1d'],
    description: 'Get current Formula 1 driver info',
    usage: 'f1driver <driver name or code>',
    category: 'api',
    cooldown: 10,

    async execute(message, args, client) {
        const query = args.join(' ').trim();

        if (!query) {
            return message.reply('❌ Provide a driver name or 3-letter code. E.g. `>>f1driver verstappen` or `>>f1driver VER`');
        }

        const loading = await message.reply('🏎️ Fetching F1 driver info...');

        try {
            const driver = await fetchJolpicaDriver(query);

            if (driver) {
                const embed = buildJolpicaEmbed(driver);
                return loading.edit({ content: null, embeds: [embed] });
            }
        } catch (error) {
            await logError(client, error, 'f1driver — jolpica');
        }

        try {
            const driver = await fetchOpenF1Driver(query);

            if (driver) {
                const embed = buildOpenF1Embed(driver);
                return loading.edit({ content: null, embeds: [embed] });
            }
        } catch (error) {
            await logError(client, error, 'f1driver — openf1');
        }

        try {
            const driver = await fetchApiSportsDriver(query);

            if (driver) {
                const embed = buildApiSportsEmbed(driver);
                return loading.edit({ content: null, embeds: [embed] });
            }
        } catch (error) {
            await logError(client, error, 'f1driver — api-sports');
        }

        return loading.edit('❌ Driver not found. Try their last name or 3-letter code (e.g. VER, HAM).');
    }
};

async function fetchJolpicaDriver(query) {
    const res = await axios.get(JOLPICA_STANDINGS_URL, { timeout: 10000 });
    const standings = res.data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;

    if (!Array.isArray(standings) || standings.length === 0) {
        throw new Error('Invalid Jolpica driver standings response');
    }

    const normalizedQuery = normalize(query);
    const standing = standings.find((entry) => {
        const driver = entry.Driver || {};

        return [driver.code, driver.familyName, driver.givenName]
            .filter(Boolean)
            .some((value) => normalize(value) === normalizedQuery);
    });

    if (!standing) {
        return null;
    }

    const driver = standing.Driver || {};
    const constructor = standing.Constructors?.[0] || {};

    return {
        firstName: driver.givenName || 'Unknown',
        lastName: driver.familyName || 'Driver',
        code: driver.code || 'N/A',
        number: driver.permanentNumber || 'N/A',
        nationality: driver.nationality || 'N/A',
        team: constructor.name || 'Unknown Team',
        position: standing.position || 'N/A',
        points: standing.points || '0',
        wins: standing.wins || '0',
        dateOfBirth: driver.dateOfBirth || null
    };
}

async function fetchOpenF1Driver(query) {
    const res = await axios.get(OPENF1_DRIVERS_URL, {
        params: { session_key: 'latest' },
        timeout: 10000
    });
    const drivers = Array.isArray(res.data) ? res.data : [];

    if (drivers.length === 0) {
        throw new Error('Invalid OpenF1 drivers response');
    }

    const normalizedQuery = normalize(query);

    return drivers.find((driver) => {
        const acronym = normalize(driver.name_acronym || '');
        const fullName = normalize(driver.full_name || driver.broadcast_name || '');

        return acronym === normalizedQuery || fullName.includes(normalizedQuery);
    }) || null;
}

async function fetchApiSportsDriver(query) {
    const res = await axios.get(`${API_SPORTS_BASE_URL}/drivers`, {
        params: { search: query },
        headers: getApiSportsHeaders(),
        timeout: 10000
    });
    const drivers = Array.isArray(res.data?.response) ? res.data.response : [];

    return drivers[0] || null;
}

function buildJolpicaEmbed(driver) {
    const embed = new EmbedBuilder()
        .setTitle(`🏎️ ${driver.firstName} ${driver.lastName}`)
        .setColor('#e8002d')
        .addFields(
            { name: 'Code', value: driver.code, inline: true },
            { name: 'Number', value: driver.number, inline: true },
            { name: 'Nationality', value: driver.nationality, inline: true },
            { name: 'Team', value: driver.team, inline: true },
            { name: 'Championship Position', value: `#${driver.position}`, inline: true },
            { name: 'Points', value: driver.points, inline: true },
            { name: 'Wins', value: driver.wins, inline: true },
            { name: 'Date of Birth', value: formatDateOfBirth(driver.dateOfBirth), inline: true }
        )
        .setFooter({ text: 'Source: Jolpica' });

    return embed;
}

function buildApiSportsEmbed(driver) {
    const name = driver.name || [driver.firstname, driver.lastname].filter(Boolean).join(' ') || driver.abbr || 'F1 Driver';
    const embed = new EmbedBuilder()
        .setTitle(`🏎️ ${name}`)
        .setColor('#e8002d')
        .setFooter({ text: 'Source: API-Sports (fallback)' });

    const fields = [
        { name: 'Name', value: name },
        { name: 'Code', value: driver.abbr },
        { name: 'Number', value: driver.number ? String(driver.number) : null },
        { name: 'Nationality', value: driver.nationality || driver.country?.name },
        { name: 'Country', value: driver.country?.code || driver.country_code },
        { name: 'Date of Birth', value: formatDateOfBirth(driver.birthdate || driver.dateOfBirth) }
    ];

    for (const field of fields) {
        if (field.value && field.value !== 'N/A') {
            embed.addFields({ name: field.name, value: field.value, inline: true });
        }
    }

    if (driver.image) {
        embed.setThumbnail(driver.image);
    }

    return embed;
}

function buildOpenF1Embed(driver) {
    const embed = new EmbedBuilder()
        .setTitle(`🏎️ ${driver.full_name || driver.broadcast_name || driver.name_acronym || 'F1 Driver'}`)
        .setColor('#e8002d')
        .setFooter({ text: 'Source: OpenF1 (fallback)' });

    const fields = [
        { name: 'Name', value: driver.full_name || driver.broadcast_name },
        { name: 'Team', value: driver.team_name },
        { name: 'Number', value: driver.driver_number ? String(driver.driver_number) : null },
        { name: 'Country', value: driver.country_code },
        { name: 'Code', value: driver.name_acronym }
    ];

    for (const field of fields) {
        if (field.value) {
            embed.addFields({ name: field.name, value: field.value, inline: true });
        }
    }

    if (driver.headshot_url) {
        embed.setThumbnail(driver.headshot_url);
    }

    return embed;
}

function formatDateOfBirth(dateOfBirth) {
    if (!dateOfBirth) {
        return 'N/A';
    }

    const timestamp = Math.floor(new Date(`${dateOfBirth}T00:00:00Z`).getTime() / 1000);
    return Number.isNaN(timestamp) ? 'N/A' : `<t:${timestamp}:D>`;
}

function normalize(value) {
    return String(value).trim().toLowerCase();
}

function getApiSportsHeaders() {
    if (!process.env.FOOTBALL_API_KEY) {
        throw new Error('FOOTBALL_API_KEY is not set');
    }

    return { 'x-apisports-key': process.env.FOOTBALL_API_KEY };
}
