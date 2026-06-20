const Guild = require('../../models/Guild');

module.exports = {
    name: 'summarizeconfig',
    aliases: ['sumconfig'],
    description: 'Enable or disable conversation summaries for a guild',
    usage: 'summarizeconfig <enable|disable|status> [guildId]',
    category: 'owner',
    ownerOnly: true,
    cooldown: 5,

    async execute(message, args) {
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('❌ Owner only.');
        }

        const action = args[0]?.toLowerCase();
        const guildId = args[1] || message.guild?.id;

        if (!guildId) {
            return message.reply('❌ Provide a guild ID.');
        }

        if (action === 'enable') {
            await Guild.findOneAndUpdate(
                { guildId },
                { $set: { summarizeEnabled: true } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            return message.reply(`✅ Conversation summaries have been enabled in guild \`${guildId}\`.`);
        }

        if (action === 'disable') {
            await Guild.findOneAndUpdate(
                { guildId },
                { $set: { summarizeEnabled: false } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            return message.reply(`✅ Conversation summaries have been disabled in guild \`${guildId}\`.`);
        }

        if (action === 'status') {
            const guildData = await Guild.findOne({ guildId });
            const enabled = guildData?.summarizeEnabled || false;
            return message.reply(`✅ Conversation summaries are **${enabled ? 'enabled' : 'disabled'}** in guild \`${guildId}\`.`);
        }

        return message.reply(getUsage());
    }
};

function getUsage() {
    return [
        'Usage:',
        '`>>summarizeconfig enable [guildId]`',
        '`>>summarizeconfig disable [guildId]`',
        '`>>summarizeconfig status [guildId]`'
    ].join('\n');
}
