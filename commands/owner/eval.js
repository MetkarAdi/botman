const { EmbedBuilder } = require('discord.js');
const util = require('util');

module.exports = {
    name: 'eval',
    description: 'Execute JavaScript code (Owner Only)',
    usage: 'eval <code>',
    category: 'owner',
    ownerOnly: true,
    guildOnly: false,
    cooldown: 0,

    async execute(message, args, client) {
        if (!args.length) {
            return message.reply('❌ Please provide code to evaluate.');
        }

        const code = args.join(' ');

        const embed = new EmbedBuilder()
            .setTitle('📝 Eval')
            .setColor('#FFA500')
            .setTimestamp();

        try {
            let result = eval(code);

            if (result instanceof Promise) {
                result = await result;
            }

            const type = typeof result;
            const inspected = util.inspect(result, { depth: 0, maxArrayLength: 100 });

            embed.addFields(
                { name: '📥 Input', value: `\`\`\`js\n${code.slice(0, 1014)}\n\`\`\`` },
                { name: '📤 Output', value: `\`\`\`js\n${inspected.slice(0, 1014)}\n\`\`\`` },
                { name: '📊 Type', value: `\`${type}\`` }
            );

            embed.setColor('#00FF00');
        } catch (error) {
            embed.addFields(
                { name: '📥 Input', value: `\`\`\`js\n${code.slice(0, 1014)}\n\`\`\`` },
                { name: '❌ Error', value: `\`\`\`js\n${error.message.slice(0, 1014)}\n\`\`\`` }
            );
            embed.setColor('#FF0000');
        }

        message.reply({ embeds: [embed] });
    }
};
