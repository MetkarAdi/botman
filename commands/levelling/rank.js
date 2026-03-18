const { EmbedBuilder } = require('discord.js');
const Level = require('../../models/Level');
const { getProgressBar, formatNumber } = require('../../utils/helpers');

module.exports = {
    name: 'rank',
    aliases: ['level', 'lvl'],
    description: 'Check your or another user\'s rank and level',
    usage: 'rank [@user]',
    category: 'levelling',
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!guildData.levellingEnabled) {
            return message.reply('❌ The levelling system is currently disabled.');
        }

        const target = message.mentions.users.first() || message.author;

        try {
            let levelData = await Level.findOne({
                userId: target.id,
                guildId: message.guild.id
            });

            if (!levelData) {
                levelData = {
                    level: 1,
                    xp: 0,
                    messages: 0
                };
            }

            // Calculate required XP for next level
            const requiredXP = 5 * Math.pow(levelData.level, 2) + 50 * levelData.level + 100;
            const progress = levelData.xp / requiredXP;

            // Get user's rank
            const allLevels = await Level.find({ guildId: message.guild.id })
                .sort({ level: -1, xp: -1 });

            const rank = allLevels.findIndex(l => l.userId === target.id) + 1 || allLevels.length + 1;

            const embed = new EmbedBuilder()
                .setTitle(`📊 Rank - ${target.username}`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .setColor('#00FFFF')
                .addFields(
                    { name: '🏆 Rank', value: `#${rank}`, inline: true },
                    { name: '⭐ Level', value: `${levelData.level}`, inline: true },
                    { name: '💬 Messages', value: `${formatNumber(levelData.messages)}`, inline: true },
                    { name: '✨ XP', value: `${formatNumber(levelData.xp)} / ${formatNumber(requiredXP)}`, inline: true },
                    { name: '📈 Progress', value: `${getProgressBar(levelData.xp, requiredXP)} (${Math.round(progress * 100)}%)`, inline: false }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching rank:', error);
            message.reply('❌ An error occurred while fetching rank data.');
        }
    }
};
