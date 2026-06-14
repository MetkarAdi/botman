const { ActivityType, EmbedBuilder } = require('discord.js');
const Reminder = require('../models/Reminder');
const DisabledCommand = require('../models/DisabledCommand');
const Whitelist = require('../models/Whitelist');
const { startGiveawayPoller } = require('../utils/giveawayManager');
const startActivityPing = require('../utils/activityPing');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);

        client.user.setActivity('your server | >>help', { type: ActivityType.Watching });

        try {
            client.disabledCommands = new Set((await DisabledCommand.find()).map(d => d.name));
            console.log(`Loaded ${client.disabledCommands.size} disabled command(s)`);
        } catch (error) {
            console.error('Failed to load disabled commands:', error);
            client.disabledCommands = new Set();
        }

        try {
            client.bhWhitelist = new Set((await Whitelist.find({ guildId: process.env.BH_GUILD_ID })).map(w => w.userId));
            console.log(`Loaded ${client.bhWhitelist.size} Bangalore-Hoods whitelist entrie(s)`);
        } catch (error) {
            console.error('Failed to load Bangalore-Hoods whitelist:', error);
            client.bhWhitelist = new Set();
        }

        // Start reminder polling loop
        startReminderPoller(client);

        // Start giveaway polling loop
        startGiveawayPoller(client);

        // Keep-alive activity ping
        startActivityPing(client);
    }
};

function startReminderPoller(client) {
    setInterval(async () => {
        try {
            const now = new Date();
            const dueReminders = await Reminder.find({ remindAt: { $lte: now } }).limit(20);

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
