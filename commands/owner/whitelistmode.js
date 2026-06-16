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
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('Owner only.');
        }

        client.whitelistMode ||= new Map();

        const newState = !(client.whitelistMode.get(message.guild.id) ?? false);

        await BotConfig.findOneAndUpdate(
            { key: 'whitelistMode', guildId: message.guild.id },
            { value: newState },
            { upsert: true }
        );

        client.whitelistMode.set(message.guild.id, newState);

        const description = [
            `Whitelist mode is now **${newState ? 'ENABLED' : 'DISABLED'}**.`
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
