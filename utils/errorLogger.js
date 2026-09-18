const { card } = require('./ui');

async function logError(client, error, context, guild = null) {
    try {
        const safeError = normalizeError(error);
        console.error(`[Error] ${context}: ${safeError.message}`);

        const channel = await getErrorChannel(client);
        if (!channel) return;

        await channel.send(await buildErrorCard('⚠️ Error', safeError, context, client, guild || safeError.guild, 'warning'));
    } catch (loggerError) {
        console.error('[ErrorLogger] Failed to log error:', loggerError);
        console.error('[ErrorLogger] Original error:', error);
    }
}

async function logCritical(client, error, context, guild = null) {
    try {
        const safeError = normalizeError(error);
        console.error(`[Error] ${context}: ${safeError.message}`);

        const channel = await getErrorChannel(client);
        if (!channel) return;

        await channel.send(await buildErrorCard(
            'Critical error', safeError, context, client, guild || safeError.guild, 'danger', `<@${process.env.OWNER_ID}>`
        ));
    } catch (loggerError) {
        console.error('[ErrorLogger] Failed to log critical error:', loggerError);
        console.error('[ErrorLogger] Original error:', error);
    }
}

async function getErrorChannel(client) {
    if (!process.env.PING_CHANNEL_ID || !client?.channels?.fetch) {
        return null;
    }

    return client.channels.fetch(process.env.PING_CHANNEL_ID).catch(() => null);
}

async function buildErrorCard(title, error, context, client, guild, tone, mention = '') {
    const details = [
        mention,
        `**Context**\n${truncate(context || 'Unknown', 1024)}`,
        `**Message**\n${truncate(error.message || 'Unknown error', 1024)}`,
        `**Stack**\n${formatStack(error.stack)}`
    ];
    let footer;

    // Error reporting must never fail merely because guild metadata is unavailable.
    try {
        const resolvedGuild = client?.guilds?.cache?.get(guild?.id) || guild;
        if (resolvedGuild?.id) {
            footer = `${resolvedGuild.name || 'Unknown Guild'} · ${resolvedGuild.id} · Owner: ${resolvedGuild.ownerId || 'Unknown'}`;
        } else {
            footer = 'DM / No Guild Context';
        }
    } catch {
        footer = 'DM / No Guild Context';
    }

    return card({ title, body: details.filter(Boolean).join('\n\n'), footer, tone });
}

function normalizeError(error) {
    if (error instanceof Error) {
        return error;
    }

    const normalized = new Error(typeof error === 'string' ? error : JSON.stringify(error));
    normalized.stack = normalized.stack || normalized.message;
    return normalized;
}

function formatStack(stack) {
    const firstLines = String(stack || 'No stack available')
        .split('\n')
        .slice(0, 3)
        .join('\n');

    return `\`\`\`${truncate(firstLines, 1000)}\`\`\``;
}

function truncate(value, maxLength) {
    const text = String(value || '');
    return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

module.exports = { logError, logCritical };
