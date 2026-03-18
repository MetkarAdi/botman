const Guild = require('../models/Guild');
const LogConfig = require('../models/LogConfig');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        try {
            const guildData = await Guild.findOne({ guildId: member.guild.id });
            if (!guildData) return;

            // Handle auto-role
            if (guildData.autoRole) {
                const role = member.guild.roles.cache.get(guildData.autoRole);
                if (role && member.guild.members.cache.get(client.user.id).permissions.has('ManageRoles')) {
                    try {
                        await member.roles.add(role);
                    } catch (error) {
                        console.error('Error adding auto-role:', error);
                    }
                }
            }

            // Handle welcome message
            if (guildData.welcomeChannel) {
                const channel = member.guild.channels.cache.get(guildData.welcomeChannel);
                if (channel && channel.permissionsFor(client.user).has('SendMessages')) {
                    const welcomeMessage = guildData.welcomeMessage
                        .replace(/{user}/g, `<@${member.id}>`)
                        .replace(/{username}/g, member.user.username)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{membercount}/g, member.guild.memberCount);

                    await channel.send(welcomeMessage);
                }
            }

            // Log to log channel
            const logConfig = await LogConfig.findOne({ guildId: member.guild.id });
            if (logConfig?.enabled && logConfig.memberJoin && logConfig.logChannel) {
                const logChannel = member.guild.channels.cache.get(logConfig.logChannel);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('📥 Member Joined')
                        .setColor('#00FF00')
                        .addFields(
                            { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
                            { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                            { name: '👥 Member Count', value: `${member.guild.memberCount}`, inline: true }
                        )
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Error handling guildMemberAdd:', error);
        }
    }
};
