const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'clean',
    aliases: ['cleanup', 'botclean', 'cls'],
    description: 'Delete bot responses and the commands that triggered them',
    usage: 'clean [amount]',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ManageMessages'],
    botPermissions: ['ManageMessages', 'ReadMessageHistory'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const amount = Math.min(parseInt(args[0]) || 50, 100);

        await message.delete().catch(() => {});

        try {
            const fetched = await message.channel.messages.fetch({ limit: 100 });
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

            const prefix = guildData?.prefix || client.config.defaultPrefix;

            // Collect bot messages AND human messages that start with the prefix
            const toDelete = fetched.filter(m =>
                m.createdTimestamp > twoWeeksAgo &&
                (m.author.id === client.user.id || m.content.startsWith(prefix))
            ).first(amount);

            if (!toDelete.length) {
                const reply = await message.channel.send('❌ No bot messages or commands found to clean.');
                setTimeout(() => reply.delete().catch(() => {}), 4000);
                return;
            }

            const deleted = await message.channel.bulkDelete(toDelete, true);

            const embed = new EmbedBuilder()
                .setDescription(`🧹 Cleaned **${deleted.size}** message(s) (bot responses + commands)`)
                .setColor('#00FF88')
                .setTimestamp();

            const reply = await message.channel.send({ embeds: [embed] });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        } catch (error) {
            console.error('Clean error:', error);
            const reply = await message.channel.send('❌ Failed to clean messages.');
            setTimeout(() => reply.delete().catch(() => {}), 4000);
        }
    }
};