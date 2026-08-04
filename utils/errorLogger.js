const { EmbedBuilder } = require('discord.js');

async function logError(client, error, context, guild = null) {
    try {
        const safeError = normalizeError(error);
        console.error(`[Error] ${context}: ${safeError.message}`);

        const channel = await getErrorChannel(client);
        if (!channel) return;

        const embed = await buildErrorEmbed('#ff9900', '⚠️ Error', safeError, context, client, guild || safeError.guild);
        await channel.send({ content: null, embeds: [embed] });
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

        const embed = await buildErrorEmbed('#ff0000', 'Critical Error', safeError, context, client, guild || safeError.guild);
        await channel.send({ content: `<@${process.env.OWNER_ID}>`, embeds: [embed] });
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

async function buildErrorEmbed(color, title, error, context, client, guild) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .addFields(
            { name: 'Context', value: truncate(context || 'Unknown', 1024), inline: false },
            { name: 'Message', value: truncate(error.message || 'Unknown error', 1024), inline: false },
            { name: 'Stack', value: formatStack(error.stack), inline: false }
        )
        .setTimestamp();

    // Error reporting must never fail merely because guild metadata is unavailable.
    try {
        const resolvedGuild = client?.guilds?.cache?.get(guild?.id) || guild;
        if (resolvedGuild?.id) {
            embed.setFooter({
                text: `${resolvedGuild.name || 'Unknown Guild'} · ${resolvedGuild.id} · Owner: ${resolvedGuild.ownerId || 'Unknown'}`
            });
        } else {
            embed.setFooter({ text: 'DM / No Guild Context' });
        }
    } catch {
        embed.setFooter({ text: 'DM / No Guild Context' });
    }

    return embed;
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
