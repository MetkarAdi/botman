const Guild = require('../models/Guild');
const Level = require('../models/Level');
const Warning = require('../models/Warning');
const Cooldown = require('../models/Cooldown');

module.exports = {
    name: 'guildDelete',
    async execute(guild) {
        console.log(`📤 Left guild: ${guild.name} (${guild.id})`);

        try {
            // Optionally clean up guild data (commented out to preserve data)
            // Uncomment if you want to delete data when bot leaves

            // await Guild.deleteOne({ guildId: guild.id });
            // await Level.deleteMany({ guildId: guild.id });
            // await Warning.deleteMany({ guildId: guild.id });
            // await Cooldown.deleteMany({ guildId: guild.id });

            // console.log(`🗑️ Cleaned up data for guild: ${guild.name}`);
        } catch (error) {
            console.error(`Error handling guildDelete for ${guild.name}:`, error.message);
        }
    }
};
