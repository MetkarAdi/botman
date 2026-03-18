const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'purge',
    aliases: ['clear', 'prune', 'bulkdelete'],
    description: 'Delete multiple messages with optional filters',
    usage: 'purge <amount> [--bots | --humans | --user @user/id]',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ManageMessages'],
    botPermissions: ['ManageMessages', 'ReadMessageHistory'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (guildData && !guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        // Parse amount
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply('❌ Please provide a number between 1 and 100.\n**Usage:** `purge <amount> [--bots | --humans | --user @user/id]`');
        }

        // Parse filter flags
        const filterArg = args[1]?.toLowerCase();
        let filterUser = null;
        let filterMode = 'all'; // all | bots | humans | user

        if (filterArg === '--bots' || filterArg === '-b' || filterArg === 'bots') {
            filterMode = 'bots';
        } else if (filterArg === '--humans' || filterArg === '-h' || filterArg === 'humans') {
            filterMode = 'humans';
        } else if (filterArg === '--user' || filterArg === '-u' || filterArg === 'user') {
            // Try mention first, then ID
            filterUser = message.mentions.users.first();
            if (!filterUser && args[2]) {
                try {
                    filterUser = await client.users.fetch(args[2]);
                } catch {
                    return message.reply('❌ Could not find that user. Provide a valid mention or user ID.');
                }
            }
            if (!filterUser) {
                return message.reply('❌ Please mention a user or provide a user ID after `--user`.');
            }
            filterMode = 'user';
        }

        // Delete the command message first
        await message.delete().catch(() => {});

        try {
            // Fetch up to amount + some buffer to account for filtering & 14-day limit
            const fetchLimit = filterMode === 'all' ? amount : Math.min(amount * 3, 100);
            const fetched = await message.channel.messages.fetch({ limit: fetchLimit });

            // Filter out messages older than 14 days (Discord limitation)
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            let toDelete = fetched.filter(m => m.createdTimestamp > twoWeeksAgo);

            // Apply filter
            if (filterMode === 'bots') {
                toDelete = toDelete.filter(m => m.author.bot);
            } else if (filterMode === 'humans') {
                toDelete = toDelete.filter(m => !m.author.bot);
            } else if (filterMode === 'user') {
                toDelete = toDelete.filter(m => m.author.id === filterUser.id);
            }

            // Limit to requested amount
            const deleteArray = [...toDelete.values()].slice(0, amount);

            if (deleteArray.length === 0) {
                const noMsgEmbed = new EmbedBuilder()
                    .setDescription('❌ No messages found matching that filter.')
                    .setColor('#FF0000');
                const reply = await message.channel.send({ embeds: [noMsgEmbed] });
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return;
            }

            const deleted = await message.channel.bulkDelete(deleteArray, true);

            // Build result description
            const filterLabels = {
                all: 'all messages',
                bots: 'bot messages',
                humans: 'human messages',
                user: `messages from **${filterUser?.tag}**`
            };

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Purge Complete')
                .addFields(
                    { name: '🗑️ Deleted', value: `${deleted.size} message${deleted.size !== 1 ? 's' : ''}`, inline: true },
                    { name: '🎯 Filter', value: filterLabels[filterMode], inline: true },
                    { name: '👮 Moderator', value: message.author.tag, inline: true }
                )
                .setColor('#FF6B35')
                .setTimestamp();

            if (deleted.size < amount && filterMode !== 'all') {
                embed.setFooter({ text: `Only ${deleted.size} matching message(s) found within 14-day limit.` });
            }

            const reply = await message.channel.send({ embeds: [embed] });
            setTimeout(() => reply.delete().catch(() => {}), 6000);

        } catch (error) {
            console.error('Error purging messages:', error);
            const reply = await message.channel.send('❌ An error occurred while purging messages. Messages older than 14 days cannot be bulk deleted.');
            setTimeout(() => reply.delete().catch(() => {}), 6000);
        }
    }
};