const DisabledCommand = require('../../models/DisabledCommand');

module.exports = {
    name: 'togglecommand',
    aliases: ['tc', 'disablecmd', 'enablecmd'],
    description: 'Globally enable or disable a command',
    usage: 'togglecommand <command>',
    category: 'owner',
    ownerOnly: true,
    cooldown: 5,

    async execute(message, args, client) {
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('❌ Owner only.');
        }

        const commandName = args[0]?.toLowerCase();
        if (!commandName) {
            return message.reply('❌ Provide a command name to toggle.');
        }

        const command = client.commands.get(commandName) ||
            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) {
            return message.reply('❌ Unknown command.');
        }

        if (command.name === 'togglecommand' || command.category === 'owner') {
            return message.reply('❌ You cannot disable owner commands.');
        }

        client.disabledCommands ||= new Set();

        const existing = await DisabledCommand.findOne({ name: command.name });

        if (existing) {
            await DisabledCommand.deleteOne({ name: command.name });
            client.disabledCommands.delete(command.name);
            return message.reply(`✅ \`${command.name}\` has been enabled globally.`);
        }

        await DisabledCommand.create({ name: command.name });
        client.disabledCommands.add(command.name);
        return message.reply(`✅ \`${command.name}\` has been disabled globally.`);
    }
};
