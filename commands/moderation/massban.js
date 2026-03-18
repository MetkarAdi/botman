const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'massban',
    aliases: ['hackban', 'mb'],
    description: 'Ban multiple users by ID (even if not in server). Great for raid cleanup.',
    usage: 'massban <id1> <id2> ... [--reason <reason>]',
    category: 'moderation',
    guildOnly: true,
    permissions: ['BanMembers'],
    botPermissions: ['BanMembers'],
    cooldown: 10,

    async execute(message, args, client, guildData) {
        if (guildData && !guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        if (!args.length) {
            return message.reply('❌ Provide at least one user ID.\nUsage: `massban <id1> <id2> ... [--reason <reason>]`');
        }

        // Parse --reason flag
        const reasonFlagIndex = args.findIndex(a => a.toLowerCase() === '--reason' || a.toLowerCase() === '-r');
        const reason = reasonFlagIndex !== -1
            ? args.slice(reasonFlagIndex + 1).join(' ') || 'Mass ban'
            : 'Mass ban';

        const rawIds = reasonFlagIndex !== -1 ? args.slice(0, reasonFlagIndex) : args;
        const userIds = [...new Set(rawIds.filter(id => /^\d{17,20}$/.test(id)))];

        if (!userIds.length) {
            return message.reply('❌ No valid user IDs found. IDs must be 17–20 digit numbers.');
        }

        // Prevent banning self or the bot
        const forbidden = [message.author.id, client.user.id];
        const filtered = userIds.filter(id => !forbidden.includes(id));
        const skipped = userIds.length - filtered.length;

        const statusMsg = await message.reply(`⏳ Banning **${filtered.length}** user(s)...`);

        const results = { success: [], failed: [] };

        for (const id of filtered) {
            try {
                await message.guild.bans.create(id, {
                    reason: `[Mass Ban] ${message.author.tag}: ${reason}`,
                    deleteMessageSeconds: 60 * 60 * 24 * 7 // Delete 7 days of messages
                });
                results.success.push(id);
            } catch {
                results.failed.push(id);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🔨 Mass Ban Complete')
            .addFields(
                { name: '✅ Banned', value: `${results.success.length}`, inline: true },
                { name: '❌ Failed', value: `${results.failed.length}`, inline: true },
                { name: '⏭️ Skipped', value: `${skipped}`, inline: true },
                { name: '📝 Reason', value: reason, inline: false },
                { name: '👮 Moderator', value: message.author.tag, inline: true }
            )
            .setColor('#FF0000')
            .setTimestamp();

        if (results.failed.length > 0) {
            embed.addFields({ name: '❌ Failed IDs', value: results.failed.join('\n').substring(0, 1024), inline: false });
        }

        await statusMsg.edit({ content: null, embeds: [embed] });
    }
};