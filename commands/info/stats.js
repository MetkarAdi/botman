const { EmbedBuilder, version } = require('discord.js');

module.exports = {
    name: 'stats',
    description: 'View bot statistics',
    usage: 'stats',
    category: 'info',
    cooldown: 5,

    async execute(message, args, client) {
        const embed = buildStatsEmbed(client);
        await message.reply({ embeds: [embed] });
    }
};

function buildStatsEmbed(client) {
    const servers = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((total, guild) => total + (guild.memberCount || 0), 0);
    const channels = client.guilds.cache.reduce((total, guild) => total + guild.channels.cache.size, 0);
    const commands = client.commands.size;
    const uptime = formatUptime(client.uptime);
    const memory = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;
    const ping = `${client.ws.ping}ms`;

    return new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Bot Statistics')
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
            { name: 'Servers', value: `${servers}`, inline: true },
            { name: 'Users', value: `${users}`, inline: true },
            { name: 'Channels', value: `${channels}`, inline: true },
            { name: 'Commands', value: `${commands}`, inline: true },
            { name: 'Uptime', value: uptime, inline: true },
            { name: 'Memory', value: memory, inline: true },
            { name: 'Node.js', value: process.version, inline: true },
            { name: 'discord.js', value: version, inline: true },
            { name: 'Ping', value: ping, inline: true }
        )
        .setFooter({ text: `Bot ID: ${client.user.id}` });
}

function formatUptime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
