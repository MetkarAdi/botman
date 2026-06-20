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
        } catch (error) {
            console.error(`Error handling guildCreate for ${guild.name}:`, error.message);
        }
    }
};
