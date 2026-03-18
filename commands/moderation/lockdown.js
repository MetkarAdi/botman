const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'lockdown',
    aliases: ['lock', 'ld'],
    description: 'Lock or unlock a channel or the entire server',
    usage: 'lockdown [lock|unlock|server] [#channel] [reason]',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ManageChannels'],
    botPermissions: ['ManageChannels', 'ManageRoles'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const action = args[0]?.toLowerCase();
        const isUnlock = action === 'unlock' || action === 'off' || action === 'open';
        const isServer = action === 'server' || action === 'all';

        const mentionedChannel = message.mentions.channels.first();
        const targetChannel = mentionedChannel || message.channel;

        // Determine reason (everything after the optional channel mention)
        const reasonStart = mentionedChannel ? 2 : 1;
        const reason = args.slice(reasonStart).join(' ') || 'No reason provided';
        const everyoneRole = message.guild.roles.everyone;

        if (isServer) {
            // Lock/unlock all text channels
            const textChannels = message.guild.channels.cache.filter(c => c.isTextBased() && c.permissionsFor(message.guild.members.me).has('ManageChannels'));
            let count = 0;

            for (const [, ch] of textChannels) {
                try {
                    await ch.permissionOverwrites.edit(everyoneRole, { SendMessages: isUnlock ? null : false });
                    count++;
                } catch { /* Skip channels bot can't edit */ }
            }

            const embed = new EmbedBuilder()
                .setTitle(isUnlock ? '🔓 Server Unlocked' : '🔒 Server Locked Down')
                .setDescription(isUnlock
                    ? `✅ **${count}** channels have been unlocked.`
                    : `🔒 **${count}** channels have been locked.`)
                .addFields(
                    { name: '📝 Reason', value: reason, inline: true },
                    { name: '👮 Moderator', value: message.author.tag, inline: true }
                )
                .setColor(isUnlock ? '#00FF00' : '#FF0000')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // Lock/unlock single channel
        try {
            await targetChannel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: isUnlock ? null : false
            });

            const embed = new EmbedBuilder()
                .setTitle(isUnlock ? '🔓 Channel Unlocked' : '🔒 Channel Locked')
                .addFields(
                    { name: '📢 Channel', value: `${targetChannel}`, inline: true },
                    { name: '👮 Moderator', value: message.author.tag, inline: true },
                    { name: '📝 Reason', value: reason, inline: false }
                )
                .setColor(isUnlock ? '#00FF00' : '#FF0000')
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Lockdown error:', error);
            message.reply('❌ Failed to update channel permissions. Make sure I have the right permissions.');
        }
    }
};