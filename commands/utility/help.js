const { card } = require('../../utils/ui');

module.exports = {
    name: 'help',
    aliases: ['h', 'commands', 'cmds'],
    description: 'Show all available commands or info about a specific command',
    usage: 'help [command]',
    category: 'utility',
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const prefix = guildData?.prefix || client.config.defaultPrefix;
        const isOwner = message.author.id === process.env.OWNER_ID;
        const guildDisabled = message.guild ? client.guildDisabled?.get(message.guild.id) : null;

        // If specific command requested
        if (args[0]) {
            const commandName = args[0].toLowerCase();
            const command = client.commands.get(commandName) ||
                client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (!command || (!isOwner && isCommandHidden(command, client, guildDisabled))) {
                return message.reply('❌ That command doesn\'t exist!');
            }

            const details = [
                command.description || 'No description available.',
                `**📝 Usage**\n\`${prefix}${command.usage || command.name}\``,
                `**🏷️ Category**\n${command.category || 'Uncategorized'}  •  **⏱️ Cooldown**\n${command.cooldown || 3}s`
            ];

            if (command.aliases && command.aliases.length > 0) {
                details.push(`**🔗 Aliases**\n${command.aliases.map(a => `\`${a}\``).join(', ')}`);
            }

            if (command.permissions) {
                details.push(`**🔒 Required Permissions**\n${command.permissions.join(', ')}`);
            }

            if (command.ownerOnly) {
                details.push('**👑 Owner only**\nYes');
            }

            return message.reply(card({ title: `📖 ${command.name}`, body: details.join('\n\n'), footer: 'Command reference' }));
        }

        // Show all prefix commands
        const categories = new Map();
        for (const command of client.commands.values()) {
            const category = command.category || 'uncategorized';
            if (category.toLowerCase() === 'slash') continue;
            if (!isOwner && isCommandHidden(command, client, guildDisabled)) continue;
            if (!categories.has(category)) categories.set(category, []);
            categories.get(category).push(command);
        }

        const commandCount = [...categories.values()].reduce((total, commands) => total + commands.length, 0);

        const sections = [`Use \`${prefix}help <command>\` for details.`];

        for (const [category, categoryCommands] of categories) {
            const commands = categoryCommands
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(command => `\`${command.name}\``);

            if (commands.length > 0) {
                sections.push(`**${getCategoryEmoji(category)} ${capitalize(category)} · ${commands.length}**\n${commands.join(', ')}`);
            }
        }

        message.reply(card({ title: 'Command list', body: sections.join('\n\n'), footer: `${commandCount} commands available` }));
    }
};

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function isCommandHidden(command, client, guildDisabled) {
    const category = command.category || 'uncategorized';

    return category === 'owner' ||
        client.disabledCommands?.has(command.name) ||
        guildDisabled?.commands.has(command.name) ||
        guildDisabled?.categories.has(category);
}

function getCategoryEmoji(category) {
    const emojis = {
        owner: '👑',
        moderation: '🛡️',
        levelling: '⭐',
        info: 'ℹ️',
        utility: '🔧',
        settings: '⚙️',
        fun: '🎮'
    };
    return emojis[category] || '📁';
}
