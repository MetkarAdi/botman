const { EmbedBuilder } = require('discord.js');
const Warning = require('../../models/Warning');
const { generateId } = require('../../utils/helpers');

module.exports = {
    name: 'warn',
    description: 'Warn a user',
    usage: 'warn @user <reason>',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ModerateMembers'],
    botPermissions: ['ModerateMembers'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply('❌ Please mention a user to warn.');
        }

        if (target.id === message.author.id) {
            return message.reply('❌ You cannot warn yourself.');
        }

        if (target.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply('❌ You cannot warn a user with equal or higher role than you.');
        }

        const reason = args.slice(1).join(' ');
        if (!reason) {
            return message.reply('❌ Please provide a reason for the warning.');
        }

        try {
            const warningId = generateId(8);

            const warning = new Warning({
                userId: target.id,
                guildId: message.guild.id,
                moderatorId: message.author.id,
                reason: reason,
                warningId: warningId
            });

            await warning.save();

            // Count total warnings
            const warningCount = await Warning.countDocuments({
                userId: target.id,
                guildId: message.guild.id
            });

            const embed = new EmbedBuilder()
                .setTitle('⚠️ User Warned')
                .setDescription(`**${target.user.tag}** has been warned.`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: '👮 Moderator', value: `${message.author.tag}`, inline: true },
                    { name: '📊 Total Warnings', value: `${warningCount}`, inline: true },
                    { name: '🆔 Warning ID', value: `\`${warningId}\``, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                )
                .setColor('#FFA500')
                .setTimestamp()
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }));

            message.reply({ embeds: [embed] });

            // Try to DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`⚠️ Warning Received - ${message.guild.name}`)
                    .setDescription(`You have received a warning in **${message.guild.name}**.`)
                    .addFields(
                        { name: '📝 Reason', value: reason },
                        { name: '📊 Total Warnings', value: `${warningCount}` },
                        { name: '🆔 Warning ID', value: `\`${warningId}\`` }
                    )
                    .setColor('#FFA500')
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled
                message.channel.send('⚠️ Could not DM the user (they may have DMs disabled).');
            }
        } catch (error) {
            console.error('Error warning user:', error);
            message.reply('❌ An error occurred while trying to warn the user.');
        }
    }
};
