const { EmbedBuilder } = require('discord.js');
const LogConfig = require('../models/LogConfig');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const guild = newState.guild;
        if (!guild) return;

        try {
            const logConfig = await LogConfig.findOne({ guildId: guild.id });
            if (!logConfig?.enabled || !logConfig.logChannel) return;

            const logChannel = guild.channels.cache.get(logConfig.logChannel);
            if (!logChannel) return;

            const member = newState.member;
            if (!member) return;

            // Voice channel join
            if (!oldState.channel && newState.channel && logConfig.voiceJoin) {
                const embed = new EmbedBuilder()
                    .setTitle('🔊 Voice Channel Join')
                    .setColor('#00FF00')
                    .addFields(
                        { name: '👤 Member', value: `${member.user.tag} (${member.id})`, inline: true },
                        { name: '📺 Channel', value: `${newState.channel.name} (${newState.channel.id})`, inline: true }
                    )
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();

                await logChannel.send({ embeds: [embed] });
            }

            // Voice channel leave
            else if (oldState.channel && !newState.channel && logConfig.voiceLeave) {
                const embed = new EmbedBuilder()
                    .setTitle('🔇 Voice Channel Leave')
                    .setColor('#FF0000')
                    .addFields(
                        { name: '👤 Member', value: `${member.user.tag} (${member.id})`, inline: true },
                        { name: '📺 Channel', value: `${oldState.channel.name} (${oldState.channel.id})`, inline: true }
                    )
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();

                await logChannel.send({ embeds: [embed] });
            }

            // Voice channel move
            else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id && logConfig.voiceMove) {
                const embed = new EmbedBuilder()
                    .setTitle('🔄 Voice Channel Move')
                    .setColor('#FFFF00')
                    .addFields(
                        { name: '👤 Member', value: `${member.user.tag} (${member.id})`, inline: true },
                        { name: '📤 From', value: `${oldState.channel.name}`, inline: true },
                        { name: '📥 To', value: `${newState.channel.name}`, inline: true }
                    )
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();

                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error logging voice state:', error);
        }
    }
};
