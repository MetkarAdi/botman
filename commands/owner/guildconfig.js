const { EmbedBuilder } = require('discord.js');
const GuildDisabled = require('../../models/GuildDisabled');

module.exports = {
    name: 'guildconfig',
    aliases: ['gc'],
    description: 'Configure disabled commands and categories for a guild',
    usage: 'guildconfig <disable|enable|list> [command|category] [name] [guildId]',
    category: 'owner',
    ownerOnly: true,
    cooldown: 5,

    async execute(message, args, client) {
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('❌ Owner only.');
        }

        const action = args[0]?.toLowerCase();

        if (action === 'list') {
            const guildId = args[1] || message.guild?.id;
            if (!guildId) return message.reply('❌ Provide a guild ID.');

            return listDisabled(message, guildId);
        }

        const type = args[1]?.toLowerCase();
        const name = args[2]?.toLowerCase();
        const guildId = args[3] || message.guild?.id;

        if (!['disable', 'enable'].includes(action) || !['command', 'category'].includes(type) || !name) {
            return message.reply(getUsage());
        }

        if (!guildId) {
            return message.reply('❌ Provide a guild ID.');
        }

        const normalizedName = type === 'command'
            ? resolveCommandName(client, name)
            : resolveCategoryName(client, name);

        if (!normalizedName) {
            return message.reply(type === 'command' ? '❌ Unknown command.' : '❌ Unknown category.');
        }

        if (type === 'command') {
            const command = client.commands.get(normalizedName);
            if (command?.category === 'owner') {
                return message.reply('❌ You cannot disable owner commands.');
            }
        }

        if (type === 'category' && normalizedName === 'owner') {
            return message.reply('❌ You cannot disable owner commands.');
        }

        if (action === 'disable') {
            await GuildDisabled.updateOne(
                { guildId, type, name: normalizedName },
                { $set: { guildId, type, name: normalizedName } },
                { upsert: true }
            );
            updateGuildDisabledCache(client, guildId, type, normalizedName, true);
            return message.reply(`✅ ${type} \`${normalizedName}\` has been disabled in guild \`${guildId}\`.`);
        }

        await GuildDisabled.deleteOne({ guildId, type, name: normalizedName });
        updateGuildDisabledCache(client, guildId, type, normalizedName, false);
        return message.reply(`✅ ${type} \`${normalizedName}\` has been enabled in guild \`${guildId}\`.`);
    }
};

async function listDisabled(message, guildId) {
    const entries = await GuildDisabled.find({ guildId }).sort({ type: 1, name: 1 });
    const commands = entries.filter(entry => entry.type === 'command').map(entry => `\`${entry.name}\``);
    const categories = entries.filter(entry => entry.type === 'category').map(entry => `\`${entry.name}\``);

    const embed = new EmbedBuilder()
        .setTitle(`Guild Config — ${guildId}`)
        .setColor('#5865F2')
        .addFields(
            { name: 'Disabled Commands', value: commands.join(', ') || 'None', inline: false },
            { name: 'Disabled Categories', value: categories.join(', ') || 'None', inline: false }
        )
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

function resolveCommandName(client, name) {
    const command = client.commands.get(name) ||
        client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(name));

    return command?.name || null;
}

function resolveCategoryName(client, name) {
    const category = [...client.commands.values()]
        .map(command => command.category || 'uncategorized')
        .find(commandCategory => commandCategory.toLowerCase() === name);

    return category || null;
}

function updateGuildDisabledCache(client, guildId, type, name, shouldDisable) {
    client.guildDisabled ||= new Map();

    if (!client.guildDisabled.has(guildId)) {
        client.guildDisabled.set(guildId, { commands: new Set(), categories: new Set() });
    }

    const entry = client.guildDisabled.get(guildId);
    const set = type === 'command' ? entry.commands : entry.categories;

    if (shouldDisable) {
        set.add(name);
    } else {
        set.delete(name);
    }

    if (entry.commands.size === 0 && entry.categories.size === 0) {
        client.guildDisabled.delete(guildId);
    }
}

function getUsage() {
    return [
        'Usage:',
        '`>>guildconfig disable command <commandName> [guildId]`',
        '`>>guildconfig enable command <commandName> [guildId]`',
        '`>>guildconfig disable category <categoryName> [guildId]`',
        '`>>guildconfig enable category <categoryName> [guildId]`',
        '`>>guildconfig list [guildId]`'
    ].join('\n');
}
