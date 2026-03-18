const { EmbedBuilder } = require('discord.js');
const Level = require('../../models/Level');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    description: 'Show the server\'s XP leaderboard',
    usage: 'leaderboard [page]',
    category: 'levelling',
    guildOnly: true,
    cooldown: 10,

    async execute(message, args, client, guildData) {
        if (!guildData.levellingEnabled) {
            return message.reply('❌ The levelling system is currently disabled.');
        }

        const page = parseInt(args[0]) || 1;
        const perPage = 10;

        try {
            const allLevels = await Level.find({ guildId: message.guild.id })
                .sort({ level: -1, xp: -1 })
                .skip((page - 1) * perPage)
                .limit(perPage);

            if (allLevels.length === 0) {
                return message.reply('❌ No users found on this page.');
            }

            const totalUsers = await Level.countDocuments({ guildId: message.guild.id });
            const totalPages = Math.ceil(totalUsers / perPage);

            const leaderboardText = await Promise.all(
                allLevels.map(async (data, index) => {
                    const user = await client.users.fetch(data.userId).catch(() => null);
                    const username = user ? user.username : 'Unknown User';
                    const rank = (page - 1) * perPage + index + 1;

                    const medals = ['🥇', '🥈', '🥉'];
                    const prefix = rank <= 3 ? medals[rank - 1] : `\`${rank}.\``;

                    return `${prefix} **${username}** - Level ${data.level} (${formatNumber(data.xp)} XP)`;
                })
            );

            const embed = new EmbedBuilder()
                .setTitle(`🏆 ${message.guild.name} Leaderboard`)
                .setDescription(leaderboardText.join('\n'))
                .setColor('#FFD700')
                .setFooter({ text: `Page ${page}/${totalPages} • Total Users: ${totalUsers}` })
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            message.reply('❌ An error occurred while fetching the leaderboard.');
        }
    }
};
