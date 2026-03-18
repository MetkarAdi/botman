// ── Role Definitions ──────────────────────────────────────────────────────────

const ROLES = {
    // Village
    VILLAGER: {
        name: 'Villager',
        team: 'village',
        emoji: '👨‍🌾',
        color: '#00AA00',
        description: 'You are a simple Villager. You have no special abilities. Your only weapon is your vote. Work with the town to find and eliminate the Mafia.',
        ability: 'None',
        goal: 'Lynch all Mafia members.'
    },
    DETECTIVE: {
        name: 'Detective',
        team: 'village',
        emoji: '🔍',
        color: '#4169E1',
        description: 'Every night, you may investigate a player to learn if they belong to the Mafia. The Godfather appears innocent on the **first** check — but guilty on every check after that.',
        ability: 'Investigate a player each night.',
        goal: 'Lynch all Mafia members.'
    },
    DOCTOR: {
        name: 'Doctor',
        team: 'village',
        emoji: '🏥',
        color: '#00CED1',
        description: 'Every night, select a player to protect from the Mafia\'s attack. You cannot protect the same player two nights in a row.',
        ability: 'Protect a player from death each night.',
        goal: 'Lynch all Mafia members.'
    },
    VIGILANTE: {
        name: 'Vigilante',
        team: 'village',
        emoji: '🔫',
        color: '#FF8C00',
        description: 'Every night, you may shoot a player. If you shoot an innocent town member, you will die the following night from guilt. Choose wisely.',
        ability: 'Shoot a player each night.',
        goal: 'Lynch all Mafia members.'
    },
    // Mafia
    GODFATHER: {
        name: 'Godfather',
        team: 'mafia',
        emoji: '👑',
        color: '#FF0000',
        description: 'You are the leader of the Mafia. Each night, select a player to have your Mafia kill. You appear **innocent** to the Detective on their first check — but guilty on all subsequent checks. You will not be seen visiting your target.',
        ability: 'Order a kill each night.',
        goal: 'Eliminate all Village members.'
    },
    MAFIA: {
        name: 'Mafia',
        team: 'mafia',
        emoji: '🔪',
        color: '#CC0000',
        description: 'You are a Mafia member. Each night, you carry out the Godfather\'s kill order. If the Godfather does not select a target, you may choose your own.',
        ability: 'Execute the Godfather\'s kill order.',
        goal: 'Eliminate all Village members.'
    },
    // Neutral
    JESTER: {
        name: 'Jester',
        team: 'neutral',
        emoji: '🃏',
        color: '#9B59B6',
        description: 'You are the Jester. Your only goal is to get yourself lynched by the Village. If you die any other way, you lose. Act suspicious — make them vote you out!',
        ability: 'None. Manipulate the village into lynching you.',
        goal: 'Get lynched by the village.'
    },
    EXECUTIONER: {
        name: 'Executioner',
        team: 'neutral',
        emoji: '⚖️',
        color: '#808080',
        description: 'You have been assigned a random Villager as your target. Get your target lynched by the town to win. If your target dies any other way, you become a Jester.',
        ability: 'None. Manipulate the village into lynching your target.',
        goal: 'Get your assigned target lynched.'
    }
};

// ── Role Distribution (auto-scale) ────────────────────────────────────────────
// Returns array of role names for N players
function distributeRoles(playerCount) {
    // Base: always 1 Godfather
    // 6:  GF, Mafia, Detective, Doctor, Vigilante, Villager
    // 7:  GF, Mafia, Detective, Doctor, Vigilante, Villager, Jester
    // 8:  GF, Mafia x2, Detective, Doctor, Vigilante, Villager, Villager
    // 9:  GF, Mafia x2, Detective, Doctor, Vigilante, Villager, Villager, Executioner
    // 10: GF, Mafia x2, Detective, Doctor, Vigilante, Villager x2, Jester, Executioner
    // 11+: scale more villagers and mafia

    const roles = ['GODFATHER'];

    // Mafia count: 1 per 4 players (min 1, max ~3 for basic game)
    const mafiaCount = Math.max(1, Math.floor(playerCount / 4));
    for (let i = 0; i < mafiaCount; i++) roles.push('MAFIA');

    // Special village roles
    roles.push('DETECTIVE');
    roles.push('DOCTOR');
    if (playerCount >= 6) roles.push('VIGILANTE');

    // Neutral roles
    if (playerCount >= 7) roles.push('JESTER');
    if (playerCount >= 9) roles.push('EXECUTIONER');

    // Fill rest with Villagers
    while (roles.length < playerCount) roles.push('VILLAGER');

    // Shuffle
    return shuffle(roles);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── Win Condition Check ───────────────────────────────────────────────────────
function checkWinCondition(players) {
    const alive = players.filter(p => p.isAlive);
    const aliveMafia = alive.filter(p => ['GODFATHER', 'MAFIA'].includes(p.role));
    const aliveVillage = alive.filter(p => ['VILLAGER', 'DETECTIVE', 'DOCTOR', 'VIGILANTE'].includes(p.role));
    const aliveNeutral = alive.filter(p => ['JESTER', 'EXECUTIONER'].includes(p.role));

    // Mafia wins when they equal or outnumber village (and no village left to stop them)
    if (aliveMafia.length >= aliveVillage.length && aliveVillage.length + aliveNeutral.length <= aliveMafia.length) {
        return { winner: 'mafia', reason: 'The Mafia has taken over the town.' };
    }

    // Village wins when all mafia are dead
    if (aliveMafia.length === 0) {
        return { winner: 'village', reason: 'All Mafia members have been eliminated.' };
    }

    return null; // game continues
}

// ── Role DM Card ──────────────────────────────────────────────────────────────
function buildRoleEmbed(role, extraInfo = '') {
    const { EmbedBuilder } = require('discord.js');
    const def = ROLES[role];
    return new EmbedBuilder()
        .setTitle(`${def.emoji} Your Role: **${def.name}**`)
        .setColor(def.color)
        .setDescription(def.description)
        .addFields(
            { name: '⚔️ Ability', value: def.ability, inline: false },
            { name: '🏆 Goal', value: def.goal, inline: false },
            { name: '👥 Team', value: def.team.charAt(0).toUpperCase() + def.team.slice(1), inline: true }
        )
        .addFields(extraInfo ? [{ name: '📌 Extra Info', value: extraInfo, inline: false }] : [])
        .setFooter({ text: 'Keep your role secret! Do not share this message.' });
}

module.exports = { ROLES, distributeRoles, checkWinCondition, buildRoleEmbed, shuffle };