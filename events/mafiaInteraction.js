const { EmbedBuilder } = require('discord.js');
const MafiaGame = require('../models/MafiaGame');
const { ROLES } = require('../utils/mafiaRoles');
const { startNight, startVoting, resolveVote, setPhaseTimer, clearPhaseTimer } = require('../utils/mafiaPhases');

module.exports = {
    async execute(interaction, client) {
        const id = interaction.customId || '';

        // ── Lobby: Join button ────────────────────────────────────────────────
        if (id.startsWith('mafia_join_')) {
            const guildId = id.replace('mafia_join_', '');
            const game = await MafiaGame.findOne({ guildId, phase: 'LOBBY' });
            if (!game) return interaction.reply({ content: '❌ No active lobby found.', ephemeral: true });

            if (game.players.find(p => p.userId === interaction.user.id)) {
                return interaction.reply({ content: '❌ You are already in this game.', ephemeral: true });
            }

            game.players.push({
                userId: interaction.user.id,
                username: interaction.user.username,
                role: 'UNASSIGNED',
                isAlive: true,
                isSpectator: false
            });
            await game.save();

            // Update the lobby embed
            const playerList = game.players.map(p => `• **${p.username}**`).join('\n');
            const lobbyEmbed = interaction.message.embeds[0];

            const { EmbedBuilder } = require('discord.js');
            const updated = EmbedBuilder.from(lobbyEmbed)
                .setDescription(`**${interaction.guild.members.cache.get(game.hostId)?.user.username || 'Host'}** is starting a game of Mafia!\n\nClick **JOIN** to play, or wait to spectate.\n\n**Players (${game.players.length}/∞):**\n${playerList}`)
                .spliceFields(0, 1, { name: '⏰ Join Timer', value: `${game.joinTimer}s`, inline: true });

            await interaction.update({ embeds: [updated] });
        }

        // ── Lobby: Leave button ───────────────────────────────────────────────
        else if (id.startsWith('mafia_leave_')) {
            const guildId = id.replace('mafia_leave_', '');
            const game = await MafiaGame.findOne({ guildId, phase: 'LOBBY' });
            if (!game) return interaction.reply({ content: '❌ No active lobby.', ephemeral: true });

            const idx = game.players.findIndex(p => p.userId === interaction.user.id);
            if (idx === -1) return interaction.reply({ content: '❌ You are not in this game.', ephemeral: true });

            game.players.splice(idx, 1);
            await game.save();

            const playerList = game.players.length
                ? game.players.map(p => `• **${p.username}**`).join('\n')
                : '*No one has joined yet...*';

            const updated = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(`**${interaction.guild.members.cache.get(game.hostId)?.user.username || 'Host'}** is starting a game of Mafia!\n\nClick **JOIN** to play, or wait to spectate.\n\n**Players (${game.players.length}/∞):**\n${playerList}`);

            await interaction.update({ embeds: [updated] });
        }

        // ── Nomination select ─────────────────────────────────────────────────
        else if (id.startsWith('mafia_nominate_')) {
            const guildId = id.replace('mafia_nominate_', '');
            const game = await MafiaGame.findOne({ guildId, phase: 'NOMINATION' });
            if (!game) return interaction.reply({ content: '❌ Not in nomination phase.', ephemeral: true });

            const voter = game.players.find(p => p.userId === interaction.user.id && p.isAlive);
            if (!voter) return interaction.reply({ content: '❌ You cannot vote.', ephemeral: true });

            const nominated = interaction.values[0];
            const nominatedPlayer = game.players.find(p => p.userId === nominated);
            if (!nominatedPlayer) return interaction.reply({ content: '❌ Invalid player.', ephemeral: true });

            // Track nomination votes
            client.mafiaVotes = client.mafiaVotes || new Map();
            if (!client.mafiaVotes.has(guildId)) client.mafiaVotes.set(guildId, new Map());
            const nomVotes = client.mafiaVotes.get(guildId);

            // Remove voter's previous vote
            for (const [nominee, voters] of nomVotes.entries()) {
                voters.delete(interaction.user.id);
            }

            // Add new vote
            if (!nomVotes.has(nominated)) nomVotes.set(nominated, new Set());
            nomVotes.get(nominated).add(interaction.user.id);

            // Check for majority
            const alive = game.players.filter(p => p.isAlive);
            const majority = Math.floor(alive.length / 2) + 1;
            const voteCount = nomVotes.get(nominated).size;

            // Build vote tally display
            const tallyLines = [];
            for (const [nid, voters] of nomVotes.entries()) {
                if (voters.size > 0) {
                    const np = game.players.find(p => p.userId === nid);
                    tallyLines.push(`• **${np?.username || nid}** — ${voters.size} vote(s)`);
                }
            }

            await interaction.reply({
                content: `🗳️ You nominated **${nominatedPlayer.username}** (${voteCount}/${majority} needed for trial)`,
                ephemeral: true
            });

            // Update nomination embed
            const channel = interaction.guild.channels.cache.get(game.channelId);
            if (channel && game.phaseMessageId) {
                try {
                    const phaseMsg = await channel.messages.fetch(game.phaseMessageId);
                    const updatedEmbed = EmbedBuilder.from(phaseMsg.embeds[0])
                        .spliceFields(0, 99)
                        .addFields({ name: '🗳️ Current Votes', value: tallyLines.join('\n') || 'None yet', inline: false });
                    await phaseMsg.edit({ embeds: [updatedEmbed] });
                } catch {}
            }

            // Trigger trial if majority reached
            if (voteCount >= majority) {
                clearPhaseTimer(guildId);
                game.nominatedPlayer = nominated;
                await game.save();
                await startVoting(game, interaction.guild, client);
            }
        }

        // ── Voting (guilty/innocent) ──────────────────────────────────────────
        else if (id.startsWith('mafia_vote_')) {
            const guildId = id.replace('mafia_vote_', '');
            const game = await MafiaGame.findOne({ guildId, phase: 'VOTING' });
            if (!game) return interaction.reply({ content: '❌ Not in voting phase.', ephemeral: true });

            const voter = game.players.find(p => p.userId === interaction.user.id && p.isAlive);
            if (!voter) return interaction.reply({ content: '❌ You cannot vote.', ephemeral: true });

            if (interaction.user.id === game.nominatedPlayer) {
                return interaction.reply({ content: '❌ You cannot vote on your own trial.', ephemeral: true });
            }

            const vote = interaction.values[0]; // 'guilty' or 'innocent'
            game.votes.set(interaction.user.id, vote);
            await game.save();

            const votedCount = game.votes.size;
            const eligible = game.players.filter(p => p.isAlive && p.userId !== game.nominatedPlayer).length;

            await interaction.reply({
                content: `✅ You voted **${vote === 'guilty' ? '👎 Guilty' : '👍 Innocent'}**. (${votedCount}/${eligible} votes cast)`,
                ephemeral: true
            });

            // If everyone voted, resolve early
            if (votedCount >= eligible) {
                clearPhaseTimer(guildId);
                const { resolveVote } = require('../utils/mafiaPhases');
                await resolveVote(game, interaction.guild, client);
            }
        }

        // ── Night actions (DM dropdowns) ──────────────────────────────────────
        else if (id.startsWith('mafia_night_')) {
            // format: mafia_night_GUILDID_ROLE
            const parts = id.split('_');
            const guildId = parts[2];
            const role = parts[3];

            const game = await MafiaGame.findOne({ guildId, phase: 'NIGHT' });
            if (!game) return interaction.reply({ content: '❌ It is not night time.', ephemeral: true });

            const player = game.players.find(p => p.userId === interaction.user.id && p.isAlive && p.role === role);
            if (!player) return interaction.reply({ content: '❌ You cannot perform this action.', ephemeral: true });

            if (player.hasActed) return interaction.reply({ content: '❌ You have already acted tonight.', ephemeral: true });

            const target = interaction.values[0];

            // Doctor: can't protect same player twice in a row
            if (role === 'DOCTOR' && player.lastProtected === target) {
                return interaction.reply({ content: '❌ You cannot protect the same player two nights in a row.', ephemeral: true });
            }

            player.hasActed = true;
            if (role === 'DOCTOR') player.lastProtected = target;

            game.nightActions.set(interaction.user.id, target);
            await game.save();

            const targetPlayer = game.players.find(p => p.userId === target);
            const targetName = target === 'skip' ? 'nobody' : targetPlayer?.username || target;

            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setDescription(`✅ Action submitted: **${targetName}**. Wait for night to end.`)
                    .setColor('#00AA00')],
                components: []
            });

            // Check if all active night roles have acted
            const activeRoles = ['DETECTIVE', 'DOCTOR', 'VIGILANTE', 'GODFATHER', 'MAFIA'];
            const activePlayers = game.players.filter(p => p.isAlive && activeRoles.includes(p.role));

            // Check if GF acted — mafia doesn't need to if GF did
            const gfActed = game.players.find(p => p.role === 'GODFATHER' && p.hasActed);
            const mafiaPlayer = game.players.find(p => p.role === 'MAFIA' && p.isAlive);

            const allActed = activePlayers.every(p => {
                if (p.role === 'MAFIA' && gfActed) return true; // GF already ordered
                return p.hasActed;
            });

            if (allActed) {
                clearPhaseTimer(guildId);
                const { resolveNight } = require('../utils/mafiaPhases');
                const guild = client.guilds.cache.get(guildId);
                if (guild) await resolveNight(game, guild, client);
            }
        }
    }
};