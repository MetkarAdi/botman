const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Giveaway = require('../models/Giveaway');

// ── Build the giveaway embed ──────────────────────────────────────────────────
function buildEmbed(giveaway, guild) {
    const endsTimestamp = Math.floor(giveaway.endsAt.getTime() / 1000);
    const entryCount = giveaway.entries.length;

    const embed = new EmbedBuilder()
        .setTitle(`🎉 GIVEAWAY — ${giveaway.prize}`)
        .setColor(giveaway.ended ? '#808080' : '#FF6B6B')
        .setTimestamp(giveaway.endsAt);

    const lines = [];
    if (giveaway.description) lines.push(`*${giveaway.description}*\n`);
    lines.push(`🏆 **Winners:** ${giveaway.winnerCount}`);
    lines.push(`⏰ **Ends:** <t:${endsTimestamp}:R> (<t:${endsTimestamp}:f>)`);
    lines.push(`👤 **Hosted by:** <@${giveaway.hostId}>`);
    lines.push(`🎟️ **Entries:** ${entryCount}`);

    const reqs = buildRequirementText(giveaway, guild);
    if (reqs) lines.push(`\n📋 **Requirements:**\n${reqs}`);

    if (giveaway.ended && !giveaway.cancelled) {
        if (giveaway.winners.length > 0) {
            lines.push(`\n🎊 **Winner${giveaway.winners.length > 1 ? 's' : ''}:** ${giveaway.winners.map(w => `<@${w}>`).join(', ')}`);
        } else {
            lines.push('\n😔 **No valid entries — no winner.**');
        }
    }

    embed.setDescription(lines.join('\n'));
    embed.setFooter({ text: giveaway.ended ? 'Giveaway ended' : 'Click 🎉 to enter!' });

    return embed;
}

function buildRequirementText(giveaway, guild) {
    const lines = [];
    if (giveaway.requiredRoles.length) {
        const roleNames = giveaway.requiredRoles.map(id => {
            const role = guild?.roles.cache.get(id);
            return role ? `<@&${id}>` : `\`${id}\``;
        });
        lines.push(`• Have any of: ${roleNames.join(', ')}`);
    }
    if (giveaway.requiredAllRoles.length) {
        const roleNames = giveaway.requiredAllRoles.map(id => {
            const role = guild?.roles.cache.get(id);
            return role ? `<@&${id}>` : `\`${id}\``;
        });
        lines.push(`• Have all of: ${roleNames.join(', ')}`);
    }
    if (giveaway.minAccountAge > 0) lines.push(`• Account at least **${giveaway.minAccountAge}** day(s) old`);
    if (giveaway.minServerAge > 0) lines.push(`• In server for at least **${giveaway.minServerAge}** day(s)`);
    return lines.join('\n');
}

// ── Build the entry button ────────────────────────────────────────────────────
function buildRow(giveaway) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`giveaway_enter_${giveaway._id}`)
            .setLabel(`Enter Giveaway`)
            .setEmoji('🎉')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(giveaway.ended)
    );
}

// ── Check if a user meets requirements ───────────────────────────────────────
async function checkRequirements(giveaway, member) {
    const failures = [];

    // Required any role
    if (giveaway.requiredRoles.length > 0) {
        const hasAny = giveaway.requiredRoles.some(id => member.roles.cache.has(id));
        if (!hasAny) {
            const roleNames = giveaway.requiredRoles.map(id => {
                const role = member.guild.roles.cache.get(id);
                return role ? `@${role.name}` : id;
            });
            failures.push(`You need one of these roles: ${roleNames.join(', ')}`);
        }
    }

    // Required all roles
    if (giveaway.requiredAllRoles.length > 0) {
        const missingRoles = giveaway.requiredAllRoles.filter(id => !member.roles.cache.has(id));
        if (missingRoles.length > 0) {
            const roleNames = missingRoles.map(id => {
                const role = member.guild.roles.cache.get(id);
                return role ? `@${role.name}` : id;
            });
            failures.push(`You are missing these required roles: ${roleNames.join(', ')}`);
        }
    }

    // Min account age
    if (giveaway.minAccountAge > 0) {
        const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
        if (accountAgeDays < giveaway.minAccountAge) {
            const needed = Math.ceil(giveaway.minAccountAge - accountAgeDays);
            failures.push(`Your account must be at least **${giveaway.minAccountAge}** days old (${needed} more day(s) needed)`);
        }
    }

    // Min server age
    if (giveaway.minServerAge > 0 && member.joinedTimestamp) {
        const serverAgeDays = (Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24);
        if (serverAgeDays < giveaway.minServerAge) {
            const needed = Math.ceil(giveaway.minServerAge - serverAgeDays);
            failures.push(`You must be in this server for at least **${giveaway.minServerAge}** days (${needed} more day(s) needed)`);
        }
    }

    return failures;
}

// ── Pick winners from entries ─────────────────────────────────────────────────
function pickWinners(entries, count) {
    if (!entries.length) return [];
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ── End a giveaway ────────────────────────────────────────────────────────────
async function endGiveaway(giveaway, client, reroll = false) {
    if (!reroll) {
        giveaway.ended = true;
        giveaway.endedAt = new Date();
    }

    const winners = pickWinners(giveaway.entries, giveaway.winnerCount);
    giveaway.winners = winners;
    await giveaway.save();

    const guild = client.guilds.cache.get(giveaway.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(giveaway.channelId);
    if (!channel) return;

    // Update the original embed
    try {
        const msg = await channel.messages.fetch(giveaway.messageId);
        await msg.edit({
            embeds: [buildEmbed(giveaway, guild)],
            components: [buildRow(giveaway)]
        });
    } catch {}

    // Announce winners
    if (winners.length > 0) {
        const winnerMentions = winners.map(w => `<@${w}>`).join(', ');
        const announceEmbed = new EmbedBuilder()
            .setTitle(reroll ? '🔄 Giveaway Rerolled!' : '🎊 Giveaway Ended!')
            .setDescription(`Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`)
            .setColor('#FFD700')
            .addFields({ name: '🏆 Prize', value: giveaway.prize, inline: true },
                       { name: '👤 Hosted by', value: `<@${giveaway.hostId}>`, inline: true })
            .setTimestamp();
        await channel.send({ content: winnerMentions, embeds: [announceEmbed] });
    } else {
        await channel.send({ embeds: [new EmbedBuilder()
            .setDescription('😔 The giveaway ended with no valid entries. No winner was selected.')
            .setColor('#808080')] });
    }
}

// ── Giveaway poller (checks for ended giveaways) ─────────────────────────────
function startGiveawayPoller(client) {
    setInterval(async () => {
        try {
            const due = await Giveaway.find({ ended: false, cancelled: false, endsAt: { $lte: new Date() } });
            for (const giveaway of due) {
                await endGiveaway(giveaway, client, false);
            }
        } catch (err) {
            console.error('[Giveaway] Poller error:', err.message);
        }
    }, 15 * 1000);
}

module.exports = { buildEmbed, buildRow, checkRequirements, pickWinners, endGiveaway, startGiveawayPoller };