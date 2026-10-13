const { EmbedBuilder } = require('discord.js');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
    name: 'botinfo',
    aliases: ['bi'],
    description: 'View bot server and user statistics',
    usage: 'botinfo',
    category: 'info',
    cooldown: 5,

    async execute(message, args, client) {
        const stats = await getBotStats(client);
        return message.reply({ embeds: [buildEmbed(client, stats)] });
    }
};

async function getBotStats(client) {
    const guilds = [...client.guilds.cache.values()];
    const users = guilds.reduce((total, guild) => total + guild.memberCount, 0);

    return { servers: guilds.length, users };
}

function buildEmbed(client, stats) {
    return new EmbedBuilder()
        .setTitle('🤖 Bot Information')
        .setColor('#5865F2')
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setDescription('Current reach across every server I am in.')
        .addFields(
            { name: '🏠 Servers', value: formatNumber(stats.servers), inline: true },
            { name: '👥 Users', value: formatNumber(stats.users), inline: true }
        )
        .setTimestamp();
}

module.exports.getBotStats = getBotStats;
module.exports.buildEmbed = buildEmbed;
