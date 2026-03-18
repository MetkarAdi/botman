const { EmbedBuilder } = require('discord.js');
const Warning = require('../../models/Warning');

module.exports = {
    name: 'warnings',
    aliases: ['warns', 'listwarns'],
    description: 'List all warnings for a user',
    usage: 'warnings [@user]',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ModerateMembers'],
    botPermissions: ['ModerateMembers'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        const target = message.mentions.users.first() || message.author;

        try {
            const warnings = await Warning.find({
                userId: target.id,
                guildId: message.guild.id
            }).sort({ timestamp: -1 });

            if (warnings.length === 0) {
                return message.reply(`✅ **${target.username}** has no warnings.`);
            }

            const warningList = warnings.map((warn, index) => {
                const moderator = client.users.cache.get(warn.moderatorId);
                const modTag = moderator ? moderator.tag : 'Unknown';
                const date = new Date(warn.timestamp).toLocaleDateString();

                return `**${index + 1}.** \`${warn.warningId}\`\n` +
                       `> Reason: ${warn.reason}\n` +
                       `> By: ${modTag} | ${date}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setTitle(`⚠️ Warnings - ${target.username}`)
                .setDescription(warningList.substring(0, 4000))
                .setColor('#FFA500')
                .setFooter({ text: `Total Warnings: ${warnings.length}` })
                .setTimestamp()
                .setThumbnail(target.displayAvatarURL({ dynamic: true }));

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching warnings:', error);
            message.reply('❌ An error occurred while fetching warnings.');
        }
    }
};
