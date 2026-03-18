const Guild = require('../models/Guild');
const LogConfig = require('../models/LogConfig');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        try {
            const guildData = await Guild.findOne({ guildId: member.guild.id });

            // Handle goodbye message
            if (guildData?.goodbyeChannel) {
                const channel = member.guild.channels.cache.get(guildData.goodbyeChannel);
                if (channel && channel.permissionsFor(client.user).has('SendMessages')) {
                    const goodbyeMessage = guildData.goodbyeMessage
                        .replace(/{user}/g, `<@${member.id}>`)
                        .replace(/{username}/g, member.user.username)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{membercount}/g, member.guild.memberCount);

                    await channel.send(goodbyeMessage);
                }
            }

            // Log to log channel
            const logConfig = await LogConfig.findOne({ guildId: member.guild.id });
            if (logConfig?.enabled && logConfig.memberLeave && logConfig.logChannel) {
                const logChannel = member.guild.channels.cache.get(logConfig.logChannel);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('📤 Member Left')
                        .setColor('#FF0000')
                        .addFields(
                            { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
                            { name: '📅 Joined Server', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                            { name: '👥 Member Count', value: `${member.guild.memberCount}`, inline: true }
                        )
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Error handling guildMemberRemove:', error);
        }
    }
};
