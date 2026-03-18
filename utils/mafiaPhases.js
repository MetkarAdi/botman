const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
        StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const MafiaGame = require('../models/MafiaGame');
const { ROLES, checkWinCondition, buildRoleEmbed } = require('./mafiaRoles');

// Active phase timers: guildId -> timeout reference
const phaseTimers = new Map();

function clearPhaseTimer(guildId) {
    if (phaseTimers.has(guildId)) {
        clearTimeout(phaseTimers.get(guildId));
        phaseTimers.delete(guildId);
    }
}

function setPhaseTimer(guildId, ms, callback) {
    clearPhaseTimer(guildId);
    const t = setTimeout(callback, ms);
    phaseTimers.set(guildId, t);
}

// ── Channel Permissions ───────────────────────────────────────────────────────
async function updateChannelPermissions(game, guild) {
    const channel = guild.channels.cache.get(game.channelId);
    if (!channel) return;

    const perms = [];

    // Deny everyone by default
    perms.push({ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] });

    for (const p of game.players) {
        const member = guild.members.cache.get(p.userId);
        if (!member) continue;

        if (p.isSpectator) {
            // Spectators: can see, cannot talk
            perms.push({ id: p.userId, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] });
        } else if (!p.isAlive) {
            // Dead players: can see, cannot talk
            perms.push({ id: p.userId, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] });
        } else {
            // Alive players: can see and talk
            perms.push({ id: p.userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
        }
    }

    await channel.permissionOverwrites.set(perms).catch(() => {});
}

// ── Start Discussion Phase ────────────────────────────────────────────────────
async function startDiscussion(game, guild, client) {
    game.phase = 'DISCUSSION';
    game.nominatedPlayer = null;
    game.votes = new Map();
    await game.save();

    const channel = guild.channels.cache.get(game.channelId);
    if (!channel) return;

    await updateChannelPermissions(game, guild);

    const alive = game.players.filter(p => p.isAlive && !p.isSpectator);
    const aliveList = alive.map(p => `• <@${p.userId}> — ${ROLES[p.role].emoji}`).join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`☀️ Day ${game.dayNumber} — Discussion`)
        .setDescription('Discuss amongst yourselves. Who do you think is the Mafia?\n\n**Alive Players:**\n' + aliveList)
        .setColor('#FFD700')
        .setFooter({ text: `Discussion ends in ${game.discussionTime}s` })
        .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    game.phaseMessageId = msg.id;
    await game.save();

    setPhaseTimer(guild.id, game.discussionTime * 1000, async () => {
        const fresh = await MafiaGame.findOne({ guildId: guild.id });
        if (!fresh || fresh.phase !== 'DISCUSSION') return;
        await startNomination(fresh, guild, client);
    });
}

// ── Start Nomination Phase ────────────────────────────────────────────────────
async function startNomination(game, guild, client) {
    game.phase = 'NOMINATION';
    game.nominatedPlayer = null;
    await game.save();

    const channel = guild.channels.cache.get(game.channelId);
    if (!channel) return;

    const alive = game.players.filter(p => p.isAlive && !p.isSpectator);

    const selectOptions = alive.map(p => ({
        label: p.username,
        value: p.userId,
        emoji: ROLES[p.role]?.emoji || '👤'
    }));

    const select = new StringSelectMenuBuilder()
        .setCustomId(`mafia_nominate_${guild.id}`)
        .setPlaceholder('Select a player to put on trial...')
        .addOptions(selectOptions);

    const row = new ActionRowBuilder().addComponents(select);

    const embed = new EmbedBuilder()
        .setTitle(`⚖️ Day ${game.dayNumber} — Nomination`)
        .setDescription('Vote to put someone on trial. A majority is needed to proceed to a vote.\n\nSelect a player from the dropdown below.')
        .setColor('#FF8C00')
        .setFooter({ text: `Nomination ends in ${game.voteTime}s — no vote = no elimination` })
        .setTimestamp();

    const msg = await channel.send({ embeds: [embed], components: [row] });
    game.phaseMessageId = msg.id;

    // Track nomination votes: nominee -> Set of voters
    client.mafiaVotes = client.mafiaVotes || new Map();
    client.mafiaVotes.set(guild.id, new Map());

    await game.save();

    setPhaseTimer(guild.id, game.voteTime * 1000, async () => {
        const fresh = await MafiaGame.findOne({ guildId: guild.id });
        if (!fresh || fresh.phase !== 'NOMINATION') return;

        // Check if anyone has majority
        const nominationVotes = client.mafiaVotes?.get(guild.id);
        if (nominationVotes) {
            const majority = Math.floor(fresh.players.filter(p => p.isAlive).length / 2) + 1;
            let topNominee = null;
            let topCount = 0;
            for (const [nominee, voters] of nominationVotes.entries()) {
                if (voters.size > topCount) { topCount = voters.size; topNominee = nominee; }
            }
            if (topNominee && topCount >= majority) {
                fresh.nominatedPlayer = topNominee;
                await fresh.save();
                await startVoting(fresh, guild, client);
                return;
            }
        }

        // No majority — skip to night
        const noTrialEmbed = new EmbedBuilder()
            .setDescription('⏰ No one was put on trial. The town moves on. Night falls...')
            .setColor('#808080');
        await channel.send({ embeds: [noTrialEmbed] });
        await startNight(fresh, guild, client);
    });
}

// ── Start Voting Phase (trial) ────────────────────────────────────────────────
async function startVoting(game, guild, client) {
    game.phase = 'VOTING';
    game.votes = new Map();
    await game.save();

    const channel = guild.channels.cache.get(game.channelId);
    if (!channel) return;

    const nominated = game.players.find(p => p.userId === game.nominatedPlayer);
    if (!nominated) return startNight(game, guild, client);

    const select = new StringSelectMenuBuilder()
        .setCustomId(`mafia_vote_${guild.id}`)
        .setPlaceholder('Cast your vote...')
        .addOptions([
            { label: '👍 Innocent', value: 'innocent', description: 'Vote to spare them' },
            { label: '👎 Guilty', value: 'guilty', description: 'Vote to lynch them' }
        ]);

    const row = new ActionRowBuilder().addComponents(select);

    const embed = new EmbedBuilder()
        .setTitle(`🔨 Trial — ${nominated.username}`)
        .setDescription(`<@${nominated.userId}> has been put on trial!\n\nCast your vote below. A majority guilty vote will result in a lynch.\n\n**Tie = no elimination.**`)
        .setColor('#FF4444')
        .setFooter({ text: `Voting ends in ${game.voteTime}s` })
        .setTimestamp();

    const msg = await channel.send({ embeds: [embed], components: [row] });
    game.phaseMessageId = msg.id;
    await game.save();

    setPhaseTimer(guild.id, game.voteTime * 1000, async () => {
        const fresh = await MafiaGame.findOne({ guildId: guild.id });
        if (!fresh || fresh.phase !== 'VOTING') return;
        await resolveVote(fresh, guild, client);
    });
}

// ── Resolve Vote ──────────────────────────────────────────────────────────────
async function resolveVote(game, guild, client) {
    const channel = guild.channels.cache.get(game.channelId);
    if (!channel) return;

    const votes = game.votes instanceof Map ? game.votes : new Map(Object.entries(game.votes));
    let guilty = 0, innocent = 0;
    for (const [, v] of votes) {
        if (v === 'guilty') guilty++;
        else innocent++;
    }

    const nominated = game.players.find(p => p.userId === game.nominatedPlayer);
    if (!nominated) return startNight(game, guild, client);

    const aliveCount = game.players.filter(p => p.isAlive).length;
    const majority = Math.floor(aliveCount / 2) + 1;

    if (guilty > innocent && guilty >= majority) {
        // Lynch
        nominated.isAlive = false;
        const role = ROLES[nominated.role];

        const embed = new EmbedBuilder()
            .setTitle('🔨 Player Lynched!')
            .setDescription(`<@${nominated.userId}> (**${nominated.username}**) was found guilty and lynched by the town!\nThey were a **${role.emoji} ${role.name}**.`)
            .setColor('#FF0000')
            .setTimestamp();

        await channel.send({ embeds: [embed] });

        // Check Jester win
        if (nominated.role === 'JESTER') {
            return endGame(game, guild, client, 'jester', [nominated]);
        }

        // Check Executioner win (their target was lynched)
        const executioner = game.players.find(p => p.role === 'EXECUTIONER' && p.isAlive && p.executionerTarget === nominated.userId);
        if (executioner) {
            return endGame(game, guild, client, 'executioner', [executioner]);
        }

        await game.save();
        await updateChannelPermissions(game, guild);

        const win = checkWinCondition(game.players);
        if (win) return endGame(game, guild, client, win.winner);

        // Vigilante guilt check
        await handleViguilanteGuilt(game, guild, client);

    } else {
        // No lynch — tie or innocent majority
        const embed = new EmbedBuilder()
            .setDescription(`⚖️ The vote ended **${guilty} Guilty** / **${innocent} Innocent**. No one was eliminated.`)
            .setColor('#808080');
        await channel.send({ embeds: [embed] });
        await startNight(game, guild, client);
    }
}

// ── Start Night ───────────────────────────────────────────────────────────────
async function startNight(game, guild, client) {
    game.phase = 'NIGHT';
    game.nightActions = new Map();
    // Reset acted flags
    for (const p of game.players) { p.hasActed = false; p.protectedBy = null; }
    await game.save();

    const channel = guild.channels.cache.get(game.channelId);
    if (!channel) return;

    // Mute everyone in channel during night
    await updateChannelPermissions(game, guild);
    const overwrites = channel.permissionOverwrites.cache;
    for (const [id, ow] of overwrites) {
        if (id !== guild.roles.everyone.id) {
            await channel.permissionOverwrites.edit(id, { SendMessages: false }).catch(() => {});
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(`🌙 Night ${game.dayNumber}`)
        .setDescription('Night has fallen. The town sleeps...\n\nPlayers with night actions should check their DMs.')
        .setColor('#1a1a2e')
        .setFooter({ text: `Night ends in ${game.nightTime}s` })
        .setTimestamp();

    await channel.send({ embeds: [embed] });

    // Send DM prompts to all alive players with night abilities
    await sendNightDMs(game, guild, client);

    setPhaseTimer(guild.id, game.nightTime * 1000, async () => {
        const fresh = await MafiaGame.findOne({ guildId: guild.id });
        if (!fresh || fresh.phase !== 'NIGHT') return;
        await resolveNight(fresh, guild, client);
    });
}

// ── Send Night DMs ────────────────────────────────────────────────────────────
async function sendNightDMs(game, guild, client) {
    const alive = game.players.filter(p => p.isAlive && !p.isSpectator);
    const targets = alive.filter(p => p.role !== 'VILLAGER');

    // Build target options for dropdowns
    const targetOptions = alive
        .map(p => ({ label: p.username, value: p.userId }));

    for (const player of targets) {
        try {
            const user = await client.users.fetch(player.userId);
            const role = ROLES[player.role];

            let description = '';
            let options = targetOptions.filter(t => t.value !== player.userId); // can't target self by default

            switch (player.role) {
                case 'DETECTIVE':
                    description = '🔍 Choose a player to investigate tonight.';
                    break;
                case 'DOCTOR':
                    description = '🏥 Choose a player to protect tonight.';
                    options = targetOptions; // doctor can protect self
                    break;
                case 'VIGILANTE':
                    description = '🔫 Choose a player to shoot tonight, or skip.';
                    options = [...targetOptions.filter(t => t.value !== player.userId),
                               { label: '⏭️ Skip (do nothing)', value: 'skip' }];
                    break;
                case 'GODFATHER':
                    description = '👑 Order your Mafia to kill a player tonight.';
                    options = targetOptions.filter(t => !['GODFATHER','MAFIA'].includes(game.players.find(pp => pp.userId === t.value)?.role));
                    break;
                case 'MAFIA': {
                    const gf = game.players.find(p => p.role === 'GODFATHER' && p.isAlive);
                    description = gf
                        ? `🔪 Wait for the Godfather's orders. If they don't act, you may choose a target.`
                        : '🔪 The Godfather is dead. Choose a player to kill tonight.';
                    options = targetOptions.filter(t => !['GODFATHER','MAFIA'].includes(game.players.find(pp => pp.userId === t.value)?.role));
                    break;
                }
                case 'JESTER':
                case 'EXECUTIONER':
                    // No night action
                    continue;
            }

            if (!options.length) continue;

            const select = new StringSelectMenuBuilder()
                .setCustomId(`mafia_night_${guild.id}_${player.role}`)
                .setPlaceholder('Select your target...')
                .addOptions(options.slice(0, 25));

            const row = new ActionRowBuilder().addComponents(select);

            const embed = new EmbedBuilder()
                .setTitle(`🌙 Night ${game.dayNumber} — ${role.emoji} ${role.name}`)
                .setDescription(description)
                .setColor(role.color)
                .setFooter({ text: `You have ${game.nightTime}s to act. Not choosing means no action.` });

            await user.send({ embeds: [embed], components: [row] }).catch(() => {
                console.log(`[Mafia] Could not DM ${player.username} — DMs may be closed`);
            });

        } catch (err) {
            console.error(`[Mafia] Error sending night DM to ${player.username}:`, err.message);
        }
    }
}

// ── Resolve Night ─────────────────────────────────────────────────────────────
async function resolveNight(game, guild, client) {
    const channel = guild.channels.cache.get(game.channelId);
    if (!channel) return;

    const actions = game.nightActions instanceof Map
        ? game.nightActions
        : new Map(Object.entries(game.nightActions || {}));

    const deaths = [];
    const results = []; // Messages to show in channel

    // 1. Doctor protects first
    const doctor = game.players.find(p => p.role === 'DOCTOR' && p.isAlive);
    let protectedId = null;
    if (doctor && actions.has(doctor.userId)) {
        protectedId = actions.get(doctor.userId);
        const protectedPlayer = game.players.find(p => p.userId === protectedId);
        if (protectedPlayer) protectedPlayer.protectedBy = doctor.userId;
    }

    // 2. Godfather orders kill (Mafia executes if GF didn't act)
    const godfather = game.players.find(p => p.role === 'GODFATHER' && p.isAlive);
    const mafioso = game.players.find(p => p.role === 'MAFIA' && p.isAlive);
    let killTarget = null;

    if (godfather && actions.has(godfather.userId)) {
        killTarget = actions.get(godfather.userId);
    } else if (mafioso && actions.has(mafioso.userId)) {
        killTarget = actions.get(mafioso.userId);
    }

    if (killTarget) {
        const target = game.players.find(p => p.userId === killTarget);
        if (target && target.isAlive) {
            if (target.protectedBy) {
                results.push(`🏥 Someone was attacked last night but was **saved by the Doctor**!`);
            } else {
                target.isAlive = false;
                deaths.push(target);
            }
        }
    }

    // 3. Vigilante shoots
    const vigilante = game.players.find(p => p.role === 'VIGILANTE' && p.isAlive);
    if (vigilante && actions.has(vigilante.userId)) {
        const vigTarget = actions.get(vigilante.userId);
        if (vigTarget && vigTarget !== 'skip') {
            const target = game.players.find(p => p.userId === vigTarget);
            if (target && target.isAlive) {
                if (target.protectedBy) {
                    results.push(`🏥 The Vigilante's target was protected by the Doctor!`);
                } else {
                    target.isAlive = false;
                    deaths.push(target);
                    // If vig killed innocent, mark for guilt death next night
                    if (target.role !== 'GODFATHER' && target.role !== 'MAFIA') {
                        vigilante.viguilanteKilled = true;
                    }
                }
            }
        }
    }

    // 4. Detective investigates
    const detective = game.players.find(p => p.role === 'DETECTIVE' && p.isAlive);
    if (detective && actions.has(detective.userId)) {
        const detTarget = actions.get(detective.userId);
        const target = game.players.find(p => p.userId === detTarget);
        if (target) {
            let result;
            if (target.role === 'GODFATHER') {
                // First check: innocent. All subsequent: guilty
                game.godfatherChecked = game.godfatherChecked || false;
                if (!game.godfatherChecked) {
                    result = '✅ **Not suspicious** (appears innocent)';
                    game.godfatherChecked = true;
                } else {
                    result = '🚨 **Suspicious!** (Mafia)';
                }
            } else if (['MAFIA'].includes(target.role)) {
                result = '🚨 **Suspicious!** (Mafia)';
            } else {
                result = '✅ **Not suspicious** (appears innocent)';
            }
            try {
                const detUser = await client.users.fetch(detective.userId);
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🔍 Investigation Result')
                    .setDescription(`You investigated **${target.username}**:\n${result}`)
                    .setColor('#4169E1')
                    .setTimestamp();
                await detUser.send({ embeds: [dmEmbed] });
            } catch {}
        }
    }

    // Build night report
    const embed = new EmbedBuilder()
        .setTitle(`🌅 Day ${game.dayNumber + 1} — Night Results`)
        .setColor('#FF6B35')
        .setTimestamp();

    if (deaths.length === 0) {
        embed.setDescription('☀️ The sun rises. **Nobody died last night!**');
    } else {
        const deathLines = deaths.map(d => `💀 **${d.username}** was killed. They were a **${ROLES[d.role].emoji} ${ROLES[d.role].name}**.`);
        embed.setDescription('☀️ The sun rises...\n\n' + deathLines.join('\n'));
    }

    if (results.length) embed.addFields({ name: '📋 Other Events', value: results.join('\n'), inline: false });

    game.dayNumber++;
    await game.save();

    await updateChannelPermissions(game, guild);
    await channel.send({ embeds: [embed] });

    // Check Executioner target died by non-lynch → becomes Jester
    for (const p of game.players) {
        if (p.role === 'EXECUTIONER' && p.isAlive) {
            const target = game.players.find(pp => pp.userId === p.executionerTarget);
            if (target && !target.isAlive) {
                p.role = 'JESTER';
                try {
                    const u = await client.users.fetch(p.userId);
                    await u.send({ embeds: [new EmbedBuilder()
                        .setTitle('⚖️ Your target has died!')
                        .setDescription('Your target was killed without being lynched. You are now a **🃏 Jester**. Get yourself lynched to win!')
                        .setColor('#9B59B6')] });
                } catch {}
            }
        }
    }

    // Check Vigilante guilt death
    await handleViguilanteGuilt(game, guild, client);

    const win = checkWinCondition(game.players);
    if (win) return endGame(game, guild, client, win.winner);

    await startDiscussion(game, guild, client);
}

// ── Vigilante Guilt ───────────────────────────────────────────────────────────
async function handleViguilanteGuilt(game, guild, client) {
    const vigilante = game.players.find(p => p.role === 'VIGILANTE' && p.isAlive && p.viguilanteKilled);
    if (!vigilante) return;

    vigilante.isAlive = false;
    vigilante.viguilanteKilled = false;
    await game.save();

    const channel = guild.channels.cache.get(game.channelId);
    if (channel) {
        await channel.send({ embeds: [new EmbedBuilder()
            .setDescription(`💔 **${vigilante.username}** (Vigilante) could not live with the guilt of killing an innocent. They took their own life.`)
            .setColor('#FF8C00')] });
    }
    await updateChannelPermissions(game, guild);
}

// ── End Game ──────────────────────────────────────────────────────────────────
async function endGame(game, guild, client, winner, specialWinners = null) {
    clearPhaseTimer(guild.id);
    game.phase = 'ENDED';
    await game.save();

    const channel = guild.channels.cache.get(game.channelId);

    // Build winner list
    let winners = [];
    let title = '';
    let color = '';
    let description = '';

    if (winner === 'village') {
        winners = game.players.filter(p => ['VILLAGER','DETECTIVE','DOCTOR','VIGILANTE'].includes(p.role));
        title = '🏆 Village Wins!';
        color = '#00AA00';
        description = 'The Mafia has been eliminated. The village is safe!';
    } else if (winner === 'mafia') {
        winners = game.players.filter(p => ['GODFATHER','MAFIA'].includes(p.role));
        title = '💀 Mafia Wins!';
        color = '#FF0000';
        description = 'The Mafia has taken over the town. All hope is lost.';
    } else if (winner === 'jester') {
        winners = specialWinners || [];
        title = '🃏 Jester Wins!';
        color = '#9B59B6';
        description = 'The Jester tricked the town into lynching them!';
    } else if (winner === 'executioner') {
        winners = specialWinners || [];
        title = '⚖️ Executioner Wins!';
        color = '#808080';
        description = 'The Executioner successfully got their target lynched!';
    }

    // Full role reveal
    const roleReveal = game.players
        .map(p => `${ROLES[p.role].emoji} **${p.username}** — ${ROLES[p.role].name} ${p.isAlive ? '✅' : '💀'}`)
        .join('\n');

    const aliveWinners = winners.filter(p => p.isAlive).map(p => `🏆 <@${p.userId}>`).join('\n') || 'None survived.';

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .addFields(
            { name: '🏆 Surviving Winners', value: aliveWinners, inline: false },
            { name: '📋 Full Role Reveal', value: roleReveal.substring(0, 1024), inline: false }
        )
        .setFooter({ text: `Game hosted by ${game.players.find(p => p.userId === game.hostId)?.username || 'Unknown'}` })
        .setTimestamp();

    if (channel) {
        await channel.send({ embeds: [embed] });

        // Wait 15 seconds then delete channel
        setTimeout(async () => {
            await channel.delete('Mafia game ended').catch(() => {});
        }, 15000);
    }

    // Clean up
    await MafiaGame.deleteOne({ guildId: guild.id });
}

module.exports = { startDiscussion, startNomination, startVoting, resolveVote, startNight, resolveNight, endGame, updateChannelPermissions, setPhaseTimer, clearPhaseTimer, phaseTimers };