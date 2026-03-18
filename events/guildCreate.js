const Guild = require('../models/Guild');
const LogConfig = require('../models/LogConfig');

module.exports = {
    name: 'guildCreate',
    async execute(guild, client) {
        console.log(`📥 Joined new guild: ${guild.name} (${guild.id})`);

        try {
            // Create guild entry in database
            let guildData = await Guild.findOne({ guildId: guild.id });
            if (!guildData) {
                guildData = new Guild({
                    guildId: guild.id,
                    prefix: client.config.defaultPrefix
                });
                await guildData.save();
                console.log(`✅ Created Guild entry for new guild: ${guild.name}`);
            }

            // Create LogConfig entry
            let logConfig = await LogConfig.findOne({ guildId: guild.id });
            if (!logConfig) {
                logConfig = new LogConfig({
                    guildId: guild.id
                });
                await logConfig.save();
                console.log(`✅ Created LogConfig entry for new guild: ${guild.name}`);
            }

            // Send welcome message to system channel or first text channel
            const welcomeMessage = `
🎉 **Hello ${guild.name}!** Thanks for adding me!

**Default Prefix:** \`${client.config.defaultPrefix}\`
**Slash Commands:** Use \`/\` to see all slash commands

**Quick Start:**
• Use \`${client.config.defaultPrefix}help\` or \`/help\` to see all commands
• Only the bot owner can toggle systems on/off
• Configure settings with \`${client.config.defaultPrefix}settings\` or \`/settings\`

Enjoy using the bot! 🚀
            `;

            const systemChannel = guild.systemChannel;
            if (systemChannel && systemChannel.permissionsFor(client.user).has('SendMessages')) {
                await systemChannel.send(welcomeMessage);
            } else {
                // Find first text channel where bot can send messages
                const textChannel = guild.channels.cache.find(
                    ch => ch.isTextBased() && !ch.isVoiceBased() && ch.permissionsFor(client.user).has('SendMessages')
                );
                if (textChannel) {
                    await textChannel.send(welcomeMessage);
                }
            }
        } catch (error) {
            console.error(`Error handling guildCreate for ${guild.name}:`, error.message);
        }
    }
};
