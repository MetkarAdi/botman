const { EmbedBuilder } = require('discord.js');

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

        // If specific command requested
        if (args[0]) {
            const commandName = args[0].toLowerCase();
            const command = client.commands.get(commandName) ||
                client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (!command || (!isOwner && (command.category === 'owner' || client.disabledCommands?.has(command.name)))) {
                return message.reply('❌ That command doesn\'t exist!');
            }

            const embed = new EmbedBuilder()
                .setTitle(`📖 Command: ${command.name}`)
                .setDescription(command.description || 'No description available.')
                .setColor('#00FFFF')
                .addFields(
                    { name: '📝 Usage', value: `\`${prefix}${command.usage || command.name}\``, inline: false },
                    { name: '🏷️ Category', value: command.category || 'Uncategorized', inline: true },
                    { name: '⏱️ Cooldown', value: `${command.cooldown || 3}s`, inline: true }
                )
                .setTimestamp();

            if (command.aliases && command.aliases.length > 0) {
                embed.addFields({
                    name: '🔗 Aliases',
                    value: command.aliases.map(a => `\`${a}\``).join(', '),
                    inline: false
                });
            }

            if (command.permissions) {
                embed.addFields({
                    name: '🔒 Required Permissions',
                    value: command.permissions.join(', '),
                    inline: false
                });
            }

            if (command.ownerOnly) {
                embed.addFields({
                    name: '👑 Owner Only',
                    value: 'Yes',
                    inline: true
                });
            }

            return message.reply({ embeds: [embed] });
        }

        // Show all prefix commands
        const categories = new Map();
        for (const command of client.commands.values()) {
            const category = command.category || 'uncategorized';
            if (category.toLowerCase() === 'slash') continue;
            if (!isOwner && (category === 'owner' || client.disabledCommands?.has(command.name))) continue;
            if (!categories.has(category)) categories.set(category, []);
            categories.get(category).push(command);
        }

        const commandCount = [...categories.values()].reduce((total, commands) => total + commands.length, 0);

        const embed = new EmbedBuilder()
            .setTitle('Command List')
            .setDescription(`Use \`${prefix}help <command>\` for more info on a command.`)
            .setColor('#00FFFF')
            .setFooter({ text: `${commandCount} commands available` })
            .setTimestamp();

        for (const [category, categoryCommands] of categories) {
            const commands = categoryCommands
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(command => `\`${command.name}\``);

            if (commands.length > 0) {
                embed.addFields({
                    name: `${getCategoryEmoji(category)} ${capitalize(category)} [${commands.length}]`,
                    value: commands.join(', '),
                    inline: false
                });
            }
        }

        message.reply({ embeds: [embed] });
    }
};

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
