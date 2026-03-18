const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Giveaway = require('../../models/Giveaway');
const AccessList = require('../../models/AccessList');
const { parseTime, formatDuration } = require('../../utils/helpers');
const { buildEmbed, buildRow, endGiveaway } = require('../../utils/giveawayManager');

module.exports = {
    name: 'giveaway',
    aliases: ['gw', 'g'],
    description: 'Create and manage giveaways',
    usage: 'giveaway <start|end|reroll|cancel|list> [options]',
    category: 'giveaway',
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client, guildData) {
        // Auth: whitelist, owner, or ManageGuild
        const isOwner = message.author.id === client.config.ownerId;
        const whitelist = await AccessList.findOne({ userId: message.author.id, type: 'whitelist' });
        const hasPerms = message.member.permissions.has(PermissionFlagsBits.ManageGuild);
        if (!isOwner && !whitelist && !hasPerms) {
            return message.reply('❌ Only whitelisted users or server managers can manage giveaways.');
        }

        const sub = args[0]?.toLowerCase();
        if (!sub || sub === 'start') return startGiveaway(message, args, client);
        if (sub === 'end')    return endGiveawayCmd(message, args, client);
        if (sub === 'reroll') return rerollGiveaway(message, args, client);
        if (sub === 'cancel') return cancelGiveaway(message, args, client);
        if (sub === 'list')   return listGiveaways(message, client);

        return message.reply([
            '❌ Unknown subcommand.',
            '',
            '**Usage:**',
            '`>>giveaway start` — Start a new giveaway (interactive)',
            '`>>giveaway end <messageId>` — End a giveaway early',
            '`>>giveaway reroll <messageId>` — Pick new winners',
            '`>>giveaway cancel <messageId>` — Cancel a giveaway',
            '`>>giveaway list` — List active giveaways',
        ].join('\n'));
    }
};

// ── Start Giveaway ────────────────────────────────────────────────────────────
async function startGiveaway(message, args, client) {
    // Usage: >>giveaway start <duration> <#channel> <winners> <prize> [options]
    // Options: --desc <text> --role <@role> --allroles <@role1> <@role2> --accountage <days> --serverage <days>

    // Must have at least 4 args after 'start'
    const rawArgs = args.slice(1); // remove 'start'

    if (rawArgs.length < 4) {
        return message.reply([
            '❌ Not enough arguments.',
            '',
            '**Usage:**',
            '`>>giveaway start <duration> <#channel> <winners> <prize> [options]`',
            '',
            '**Examples:**',
            '`>>giveaway start 24h #giveaways 1 Nitro Classic`',
            '`>>giveaway start 1h #general 3 Steam Game --desc Must be active! --role @Member`',
            '',
            '**Options:**',
            '`--desc <text>` — Add a description',
            '`--role <@role>` — Require any one of these roles (add multiple --role flags)',
            '`--allroles <@role>` — Require ALL of these roles (add multiple --allroles flags)',
            '`--accountage <days>` — Minimum account age in days',
            '`--serverage <days>` — Minimum server membership in days',
            '`--winners <n>` — Alternative way to set winner count',
        ].join('\n'));
    }

    const duration = parseTime(rawArgs[0]);
    if (!duration || duration < 10000) return message.reply('❌ Invalid duration. Use formats like `10m`, `1h`, `7d`. Minimum 10 seconds.');
    if (duration > 30 * 24 * 60 * 60 * 1000) return message.reply('❌ Giveaway cannot last more than 30 days.');

    // Channel
    const channelMention = rawArgs[1];
    const channelId = channelMention.replace(/[<#>]/g, '');
    const channel = message.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return message.reply('❌ Invalid channel. Mention a text channel like `#giveaways`.');

    // Winner count
    const winnerCount = parseInt(rawArgs[2]);
    if (isNaN(winnerCount) || winnerCount < 1 || winnerCount > 20) return message.reply('❌ Winner count must be between 1 and 20.');

    // Parse flags — everything after the first 3 positional args
    const rest = rawArgs.slice(3).join(' ');
    const prize = extractValue(rest, null, true); // prize is everything before the first -- flag
    if (!prize) return message.reply('❌ Please provide a prize name.');

    const description     = extractFlag(rest, '--desc') || extractFlag(rest, '--description');
    const requiredRoles   = extractMultiFlag(rawArgs.slice(3), '--role').map(r => r.replace(/[<@&>]/g, ''));
    const requiredAllRoles = extractMultiFlag(rawArgs.slice(3), '--allroles').map(r => r.replace(/[<@&>]/g, ''));
    const minAccountAge   = parseInt(extractFlag(rest, '--accountage')) || 0;
    const minServerAge    = parseInt(extractFlag(rest, '--serverage')) || 0;

    const endsAt = new Date(Date.now() + duration);

    // Create DB entry (no messageId yet)
    const giveaway = await Giveaway.create({
        guildId: message.guild.id,
        channelId: channel.id,
        hostId: message.author.id,
        prize,
        description: description || null,
        winnerCount,
        endsAt,
        requiredRoles,
        requiredAllRoles,
        minAccountAge,
        minServerAge
    });

    // Send the embed to the target channel
    const embed = buildEmbed(giveaway, message.guild);
    const row = buildRow(giveaway);
    const gwMsg = await channel.send({ embeds: [embed], components: [row] });

    // Save messageId
    giveaway.messageId = gwMsg.id;
    await giveaway.save();

    // Confirm to host
    const reqs = [];
    if (requiredRoles.length) reqs.push(`Any role: ${requiredRoles.map(id => `<@&${id}>`).join(', ')}`);
    if (requiredAllRoles.length) reqs.push(`All roles: ${requiredAllRoles.map(id => `<@&${id}>`).join(', ')}`);
    if (minAccountAge) reqs.push(`Account age: ${minAccountAge}d`);
    if (minServerAge) reqs.push(`Server age: ${minServerAge}d`);

    const confirmEmbed = new EmbedBuilder()
        .setTitle('✅ Giveaway Started!')
        .setColor('#00AA00')
        .addFields(
            { name: '🎁 Prize', value: prize, inline: true },
            { name: '🏆 Winners', value: String(winnerCount), inline: true },
            { name: '⏰ Duration', value: formatDuration(duration), inline: true },
            { name: '📢 Channel', value: `${channel}`, inline: true },
            { name: '🆔 Message ID', value: gwMsg.id, inline: true },
            { name: '📋 Requirements', value: reqs.length ? reqs.join('\n') : 'None', inline: false }
        )
        .setTimestamp();

    message.reply({ embeds: [confirmEmbed] });
}

// ── End Giveaway Early ────────────────────────────────────────────────────────
async function endGiveawayCmd(message, args, client) {
    const messageId = args[1];
    if (!messageId) return message.reply('❌ Provide the giveaway message ID. Get it from `>>giveaway list`.');

    const giveaway = await Giveaway.findOne({ messageId, guildId: message.guild.id });
    if (!giveaway) return message.reply('❌ Giveaway not found. Make sure you used the correct message ID.');
    if (giveaway.ended) return message.reply('❌ This giveaway has already ended.');
    if (giveaway.cancelled) return message.reply('❌ This giveaway was cancelled.');

    await endGiveaway(giveaway, client, false);
    message.reply('✅ Giveaway ended early.');
}

// ── Reroll ────────────────────────────────────────────────────────────────────
async function rerollGiveaway(message, args, client) {
    const messageId = args[1];
    if (!messageId) return message.reply('❌ Provide the giveaway message ID.');

    const giveaway = await Giveaway.findOne({ messageId, guildId: message.guild.id });
    if (!giveaway) return message.reply('❌ Giveaway not found.');
    if (!giveaway.ended) return message.reply('❌ This giveaway hasn\'t ended yet. Use `>>giveaway end <messageId>` first.');
    if (!giveaway.entries.length) return message.reply('❌ No entries to reroll from.');

    // Optional: specify how many winners to reroll
    const count = parseInt(args[2]) || giveaway.winnerCount;

    await endGiveaway(giveaway, client, true);
    message.reply(`✅ Giveaway rerolled with **${count}** winner(s).`);
}

// ── Cancel ────────────────────────────────────────────────────────────────────
async function cancelGiveaway(message, args, client) {
    const messageId = args[1];
    if (!messageId) return message.reply('❌ Provide the giveaway message ID.');

    const giveaway = await Giveaway.findOne({ messageId, guildId: message.guild.id });
    if (!giveaway) return message.reply('❌ Giveaway not found.');
    if (giveaway.ended) return message.reply('❌ This giveaway has already ended.');

    giveaway.cancelled = true;
    giveaway.ended = true;
    giveaway.endedAt = new Date();
    await giveaway.save();

    // Update embed
    const channel = message.guild.channels.cache.get(giveaway.channelId);
    if (channel) {
        try {
            const gwMsg = await channel.messages.fetch(giveaway.messageId);
            const cancelEmbed = new EmbedBuilder()
                .setTitle(`🚫 CANCELLED — ${giveaway.prize}`)
                .setDescription('This giveaway has been cancelled by a moderator.')
                .setColor('#808080')
                .setTimestamp();
            await gwMsg.edit({ embeds: [cancelEmbed], components: [] });
        } catch {}
    }

    message.reply('✅ Giveaway cancelled.');
}

// ── List Active Giveaways ─────────────────────────────────────────────────────
async function listGiveaways(message, client) {
    const active = await Giveaway.find({ guildId: message.guild.id, ended: false, cancelled: false }).sort({ endsAt: 1 });

    if (!active.length) return message.reply('📭 No active giveaways in this server.');

    const lines = active.map((g, i) => {
        const endsTimestamp = Math.floor(g.endsAt.getTime() / 1000);
        return `**${i + 1}.** ${g.prize} — <#${g.channelId}> — Ends <t:${endsTimestamp}:R> — **${g.entries.length}** entries — ID: \`${g.messageId}\``;
    });

    const embed = new EmbedBuilder()
        .setTitle(`🎉 Active Giveaways (${active.length})`)
        .setDescription(lines.join('\n'))
        .setColor('#FF6B6B')
        .setTimestamp();

    message.reply({ embeds: [embed] });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Extract everything before the first -- flag as the prize
function extractValue(str, flag, isPrize = false) {
    if (isPrize) {
        const flagIndex = str.indexOf('--');
        return flagIndex === -1 ? str.trim() : str.slice(0, flagIndex).trim();
    }
    return null;
}

// Extract single flag value: --desc Some text here
function extractFlag(str, flag) {
    const regex = new RegExp(`${flag}\\s+([^-][^\\n]*?)(?=\\s+--|$)`, 'i');
    const match = str.match(regex);
    return match ? match[1].trim() : null;
}

// Extract multiple flags of the same type: --role @A --role @B
function extractMultiFlag(args, flag) {
    const values = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i].toLowerCase() === flag && args[i + 1]) {
            values.push(args[i + 1]);
            i++;
        }
    }
    return values;
}