const { ActivityType, EmbedBuilder } = require('discord.js');
const Reminder = require('../models/Reminder');
const { startGiveawayPoller } = require('../utils/giveawayManager');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);

        client.user.setActivity('your server | >>help', { type: ActivityType.Watching });

        // Start reminder polling loop
        startReminderPoller(client);

        // Start giveaway polling loop
        startGiveawayPoller(client);
    }
};

function startReminderPoller(client) {
    setInterval(async () => {
        try {
            const now = new Date();
            const dueReminders = await Reminder.find({ remindAt: { $lte: now } });

            for (const reminder of dueReminders) {
                try {
                    const user = await client.users.fetch(reminder.userId);
                    const channel = client.channels.cache.get(reminder.channelId);

                    const embed = new EmbedBuilder()
                        .setTitle('⏰ Reminder!')
                        .setDescription(reminder.message)
                        .addFields({
                            name: '📅 Set',
                            value: `<t:${Math.floor(reminder.createdAt.getTime() / 1000)}:R>`,
                            inline: true
                        })
                        .setColor('#00BFFF')
                        .setTimestamp();

                    // Try to DM first, fall back to channel ping
                    try {
                        await user.send({ embeds: [embed] });
                    } catch {
                        if (channel) {
                            await channel.send({ content: `${user} ⏰ Reminder:`, embeds: [embed] });
                        }
                    }
                } catch (err) {
                    console.error('Failed to deliver reminder:', err);
                }

                await Reminder.deleteOne({ _id: reminder._id });
            }
        } catch (err) {
            console.error('Reminder poller error:', err);
        }
    }, 15 * 1000); // Check every 15 seconds
}