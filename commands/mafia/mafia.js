const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
        PermissionFlagsBits, ChannelType } = require('discord.js');
const MafiaGame = require('../../models/MafiaGame');
const Guild = require('../../models/Guild');
const AccessList = require('../../models/AccessList');
const { distributeRoles, ROLES, buildRoleEmbed } = require('../../utils/mafiaRoles');
const { startDiscussion, updateChannelPermissions, setPhaseTimer, clearPhaseTimer } = require('../../utils/mafiaPhases');

module.exports = {
    name: 'mafia',
    aliases: ['maf', 'm'],
    description: 'Start and manage a Mafia game',
    usage: 'mafia <start|stop|config> [options]',
    category: 'mafia',
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const sub = args[0]?.toLowerCase();

        if (!sub || sub === 'start') return startGame(message, args, client, guildData);
        if (sub === 'stop') return stopGame(message, client);
        if (sub === 'config') return configGame(message, args, client, guildData);

        return message.reply('❌ Unknown subcommand. Use `mafia start`, `mafia stop`, or `mafia config`.');
    }
};

// ── Start Game ────────────────────────────────────────────────────────────────
async function startGame(message, args, client, guildData) {
    // Whitelist / owner only
    const isOwner = message.author.id === client.config.ownerId;
    const whitelist = await AccessList.findOne({ userId: message.author.id, type: 'whitelist' });
    const hasPerms = message.member.permissions.has(PermissionFlagsBits.ManageGuild);
    if (!isOwner && !whitelist && !hasPerms) {
        return message.reply('❌ Only whitelisted users or server managers can start a Mafia game.');
    }

    // One game at a time
    const existing = await MafiaGame.findOne({ guildId: message.guild.id });
    if (existing) return message.reply('❌ A Mafia game is already running. Use `>>mafia stop` to end it.');

    // Parse optional join timer: >>mafia start 90
    const joinTimer = parseInt(args[1]) || 120;
    if (joinTimer < 30 || joinTimer > 600) {
        return message.reply('❌ Join timer must be between 30 and 600 seconds.');
    }

    // Find or create Mafia category
    let category = null;
    if (guildData?.mafiaCategoryId) {
        category = message.guild.channels.cache.get(guildData.mafiaCategoryId);
    }
    if (!category) {
        // Try to find by name
        category = message.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'mafia');
    }
    if (!category) {
        // Create it
        category = await message.guild.channels.create({
            name: 'mafia',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [{ id: message.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }]
        });
    }

    // Create game document
    const game = await MafiaGame.create({
        guildId: message.guild.id,
        hostId: message.author.id,
        phase: 'LOBBY',
        joinTimer,
        players: [],
        categoryId: category.id
    });

    // Build join embed
    const embed = new EmbedBuilder()
        .setTitle('🎭 Mafia — Game Lobby')
        .setDescription(`**${message.author.username}** is starting a game of Mafia!\n\nClick **JOIN** to play, or wait to spectate.\n\n**Players (0/∞):**\n*No one has joined yet...*`)
        .setColor('#9B59B6')
        .addFields(
            { name: '⏰ Join Timer', value: `${joinTimer}s`, inline: true },
            { name: '👥 Min Players', value: '6', inline: true },
            { name: '🎮 Host', value: message.author.username, inline: true }
        )
        .setFooter({ text: `Game starts in ${joinTimer}s — minimum 6 players required` })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`mafia_join_${message.guild.id}`).setLabel('JOIN').setStyle(ButtonStyle.Success).setEmoji('🎭'),
        new ButtonBuilder().setCustomId(`mafia_leave_${message.guild.id}`).setLabel('LEAVE').setStyle(ButtonStyle.Danger)
    );

    const joinMsg = await message.channel.send({ embeds: [embed], components: [row] });
    game.joinMessageId = joinMsg.id;
    await game.save();

    // Countdown timer
    setPhaseTimer(message.guild.id, joinTimer * 1000, async () => {
        const fresh = await MafiaGame.findOne({ guildId: message.guild.id });
        if (!fresh || fresh.phase !== 'LOBBY') return;

        if (fresh.players.length < 6) {
            // Not enough players
            const failEmbed = new EmbedBuilder()
                .setDescription(`❌ Not enough players to start (${fresh.players.length}/6 minimum). Game cancelled.`)
                .setColor('#FF0000');
            await joinMsg.edit({ embeds: [failEmbed], components: [] });
            await MafiaGame.deleteOne({ guildId: message.guild.id });
            clearPhaseTimer(message.guild.id);
            return;
        }

        await beginGame(fresh, message.guild, client, joinMsg);
    });
}

// ── Begin Game (after lobby) ──────────────────────────────────────────────────
async function beginGame(game, guild, client, joinMsg) {
    // Assign roles
    const roleNames = distributeRoles(game.players.length);
    for (let i = 0; i < game.players.length; i++) {
        game.players[i].role = roleNames[i];
    }

    // Find mafia teammates for DM info
    const mafiaMembers = game.players.filter(p => ['GODFATHER', 'MAFIA'].includes(p.role));

    // Create game channel
    const category = guild.channels.cache.get(game.categoryId);
    const gameChannel = await guild.channels.create({
        name: `mafia-game-${Date.now().toString().slice(-4)}`,
        type: ChannelType.GuildText,
        parent: category?.id || null,
        permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
    });

    game.channelId = gameChannel.id;
    game.phase = 'DISCUSSION';
    game.startedAt = new Date();

    // Assign Executioner targets (random villager)
    const villagers = game.players.filter(p => ['VILLAGER', 'DETECTIVE', 'DOCTOR', 'VIGILANTE'].includes(p.role));
    for (const p of game.players) {
        if (p.role === 'EXECUTIONER') {
            const target = villagers[Math.floor(Math.random() * villagers.length)];
            if (target) p.executionerTarget = target.userId;
        }
    }

    await game.save();
    await updateChannelPermissions(game, guild);

    // Update join message
    await joinMsg.edit({
        embeds: [new EmbedBuilder()
            .setDescription('🎭 The game has started! Check the **mafia** category for your game channel.')
            .setColor('#00AA00')],
        components: []
    });

    // DM everyone their roles
    for (const player of game.players) {
        try {
            const user = await client.users.fetch(player.userId);
            let extraInfo = '';

            if (player.role === 'MAFIA') {
                const gf = mafiaMembers.find(m => m.role === 'GODFATHER');
                const others = mafiaMembers.filter(m => m.userId !== player.userId);
                extraInfo = `Your Mafia team:\n${others.map(m => `• **${m.username}** (${ROLES[m.role].name})`).join('\n') || 'You are alone.'}`;
            } else if (player.role === 'GODFATHER') {
                const others = mafiaMembers.filter(m => m.userId !== player.userId);
                extraInfo = `Your Mafia team:\n${others.map(m => `• **${m.username}** (${ROLES[m.role].name})`).join('\n') || 'You have no Mafia yet.'}`;
            } else if (player.role === 'EXECUTIONER') {
                const target = game.players.find(p => p.userId === player.executionerTarget);
                extraInfo = target ? `Your target: **${target.username}**` : 'Target not found.';
            }

            await user.send({ embeds: [buildRoleEmbed(player.role, extraInfo)] });
        } catch {
            console.log(`[Mafia] Could not DM ${player.username}`);
        }
    }

    // Post game start message
    const playerList = game.players.map(p => `• <@${p.userId}>`).join('\n');
    await gameChannel.send({ embeds: [new EmbedBuilder()
        .setTitle('🎭 Mafia — Game Start!')
        .setDescription(`Welcome to Mafia! Everyone has been DM'd their roles.\n\n**Players:**\n${playerList}\n\nDay 1 begins now. Discuss and find the Mafia!`)
        .setColor('#9B59B6')
        .setFooter({ text: 'Check your DMs for your role!' })
        .setTimestamp()] });

    await startDiscussion(game, guild, client);
}

// ── Stop Game ─────────────────────────────────────────────────────────────────
async function stopGame(message, client) {
    const isOwner = message.author.id === client.config.ownerId;
    const whitelist = await AccessList.findOne({ userId: message.author.id, type: 'whitelist' });
    const hasPerms = message.member.permissions.has(PermissionFlagsBits.ManageGuild);
    if (!isOwner && !whitelist && !hasPerms) {
        return message.reply('❌ Only whitelisted users or server managers can stop a game.');
    }

    const game = await MafiaGame.findOne({ guildId: message.guild.id });
    if (!game) return message.reply('❌ No active Mafia game found.');

    clearPhaseTimer(message.guild.id);

    const channel = message.guild.channels.cache.get(game.channelId);
    if (channel) {
        await channel.send({ embeds: [new EmbedBuilder()
            .setDescription('🛑 The game has been forcefully stopped by a moderator.')
            .setColor('#FF0000')] });
        setTimeout(() => channel.delete().catch(() => {}), 5000);
    }

    await MafiaGame.deleteOne({ guildId: message.guild.id });
    message.reply('✅ Mafia game stopped and channel deleted.');
}

// ── Config Game ───────────────────────────────────────────────────────────────
async function configGame(message, args, client, guildData) {
    const hasPerms = message.member.permissions.has(PermissionFlagsBits.ManageGuild);
    if (!hasPerms && message.author.id !== client.config.ownerId) {
        return message.reply('❌ You need Manage Server permission to configure Mafia.');
    }

    const setting = args[1]?.toLowerCase();
    const value = args[2];

    const validSettings = ['categoryid', 'discussiontime', 'nighttime', 'votetime'];

    if (!setting || !validSettings.includes(setting)) {
        return message.reply([
            '⚙️ **Mafia Config Settings:**',
            '`>>mafia config categoryid <id>` — Set the Mafia category ID',
            '`>>mafia config discussiontime <seconds>` — Set discussion phase duration (default: 150)',
            '`>>mafia config nighttime <seconds>` — Set night phase duration (default: 45)',
            '`>>mafia config votetime <seconds>` — Set voting phase duration (default: 45)',
        ].join('\n'));
    }

    if (!value) return message.reply('❌ Provide a value.');

    const Guild = require('../../models/Guild');
    let gd = await Guild.findOne({ guildId: message.guild.id });
    if (!gd) gd = new Guild({ guildId: message.guild.id });

    switch (setting) {
        case 'categoryid':
            const cat = message.guild.channels.cache.get(value);
            if (!cat || cat.type !== 0 && cat.type !== 4) return message.reply('❌ Invalid category ID.');
            gd.mafiaCategoryId = value;
            break;
        case 'discussiontime':
            const dt = parseInt(value);
            if (isNaN(dt) || dt < 30 || dt > 600) return message.reply('❌ Must be 30–600 seconds.');
            gd.mafiaDiscussionTime = dt;
            break;
        case 'nighttime':
            const nt = parseInt(value);
            if (isNaN(nt) || nt < 20 || nt > 300) return message.reply('❌ Must be 20–300 seconds.');
            gd.mafiaNightTime = nt;
            break;
        case 'votetime':
            const vt = parseInt(value);
            if (isNaN(vt) || vt < 15 || vt > 300) return message.reply('❌ Must be 15–300 seconds.');
            gd.mafiaVoteTime = vt;
            break;
    }

    await gd.save();
    message.reply(`✅ Mafia \`${setting}\` set to \`${value}\`.`);
}