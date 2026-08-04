module.exports = {
    name: 'fcrefresh',
    description: 'Refresh the football player pool from disk (Owner Only)',
    usage: 'fcrefresh',
    category: 'owner',
    ownerOnly: true,

    async execute(message, args, client) {
        const poolPath = require.resolve('../../data/playerPool.json');
        delete require.cache[poolPath];
        const players = require('../../data/playerPool.json');
        client.fcPlayerPool = Array.isArray(players)
            ? players.filter(player => Number.isFinite(Number.parseFloat(player.rating)))
            : [];
        return message.reply(`✅ Player pool refreshed. ${client.fcPlayerPool.length} players loaded.`);
    }
};
