const { ActivityType, EmbedBuilder, REST, Routes } = require('discord.js');
const Reminder = require('../models/Reminder');
const DisabledCommand = require('../models/DisabledCommand');
const GuildDisabled = require('../models/GuildDisabled');
const Whitelist = require('../models/Whitelist');
const BotConfig = require('../models/BotConfig');
const { startGiveawayPoller } = require('../utils/giveawayManager');
const startActivityPing = require('../utils/activityPing');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);

        client.user.setActivity('your server | >>help', { type: ActivityType.Watching });

        await registerSlashCommands(client);

        try {
            client.disabledCommands = new Set((await DisabledCommand.find()).map(d => d.name));
            console.log(`Loaded ${client.disabledCommands.size} disabled command(s)`);
        } catch (error) {
            console.error('Failed to load disabled commands:', error);
            client.disabledCommands = new Set();
        }

        try {
            client.guildDisabled = new Map();
            const guildDisabledEntries = await GuildDisabled.find();

            for (const entry of guildDisabledEntries) {
                if (!client.guildDisabled.has(entry.guildId)) {
                    client.guildDisabled.set(entry.guildId, { commands: new Set(), categories: new Set() });
                }

                const config = client.guildDisabled.get(entry.guildId);
                if (entry.type === 'command') {
                    config.commands.add(entry.name);
                } else if (entry.type === 'category') {
                    config.categories.add(entry.name);
                }
            }

            console.log(`Loaded guild disabled config for ${client.guildDisabled.size} guild(s)`);
        } catch (error) {
            console.error('Failed to load guild disabled config:', error);
            client.guildDisabled = new Map();
        }

        try {
            client.bhWhitelist = new Map();
            const whitelistEntries = await Whitelist.find({ guildId: { $exists: true, $ne: null } });

            for (const entry of whitelistEntries) {
                if (!client.bhWhitelist.has(entry.guildId)) {
                    client.bhWhitelist.set(entry.guildId, new Set());
                }

                client.bhWhitelist.get(entry.guildId).add(entry.userId);
            }

            console.log(`Loaded whitelist entries for ${client.bhWhitelist.size} guild(s)`);
        } catch (error) {
            console.error('Failed to load whitelist:', error);
            client.bhWhitelist = new Map();
        }

        try {
            client.whitelistMode = new Map();
            const whitelistModeConfigs = await BotConfig.find({ key: 'whitelistMode' });

            for (const config of whitelistModeConfigs) {
                if (config.guildId) {
                    client.whitelistMode.set(config.guildId, Boolean(config.value));
                }
            }

            console.log(`Loaded whitelist mode config for ${client.whitelistMode.size} guild(s)`);
        } catch (error) {
            console.error('Failed to load whitelist mode:', error);
            client.whitelistMode = new Map();
        }

        // Start reminder polling loop
        startReminderPoller(client);

        // Start giveaway polling loop
        startGiveawayPoller(client);

        // Keep-alive activity ping
        startActivityPing(client);
    }
};

async function registerSlashCommands(client) {
    try {
        const clientId = client.user.id;
        const commands = client.slashCommands.map(command => command.data.toJSON());
        const rest = new REST({ version: '10' }).setToken(client.config.token);

        // One-time cleanup for old dev-server guild commands. Remove after the first successful deploy.
        await rest.put(Routes.applicationGuildCommands(clientId, '886959069011795988'), { body: [] });

        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log(`Registered ${commands.length} global slash command(s)`);
    } catch (error) {
        console.error('Failed to register slash commands:', error);
    }
}

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
