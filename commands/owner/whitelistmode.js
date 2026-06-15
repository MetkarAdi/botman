const { EmbedBuilder } = require('discord.js');
const BotConfig = require('../../models/BotConfig');

module.exports = {
    name: 'whitelistmode',
    aliases: ['wlmode'],
    description: 'Toggle whitelist mode enforcement',
    usage: 'whitelistmode',
    category: 'owner',
    ownerOnly: true,
    cooldown: 5,

    async execute(message, args, client) {
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('❌ Owner only.');
        }

        const newState = client.whitelistMode !== true;

        await BotConfig.findOneAndUpdate(
            { key: 'whitelistMode' },
            { value: newState },
            { upsert: true }
        );

        client.whitelistMode = newState;

        const description = [
            `✅ Whitelist mode is now **${newState ? 'ENABLED' : 'DISABLED'}**.`
        ];

        if (newState) {
            description.push('Only whitelisted users can use commands. Owner is always exempt.');
        }

        const embed = new EmbedBuilder()
            .setDescription(description.join('\n'))
            .setColor(newState ? '#00FF00' : '#FF5555')
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
