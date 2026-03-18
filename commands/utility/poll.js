const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'poll',
    aliases: ['vote', 'survey'],
    description: 'Create a poll with reactions',
    usage: 'poll <question> | <option1> | <option2> [option3...]',
    category: 'utility',
    permissions: ['ManageMessages'],
    botPermissions: ['AddReactions'],
    cooldown: 10,

    async execute(message, args) {
        const pollArgs = args.join(' ').split('|').map(arg => arg.trim());

        if (pollArgs.length < 2) {
            return message.reply('❌ Please provide a question and at least 2 options separated by `|`');
        }

        const question = pollArgs[0];
        const options = pollArgs.slice(1);

        if (options.length > 10) {
            return message.reply('❌ Maximum 10 options allowed.');
        }

        const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        let optionsText = '';
        options.forEach((option, index) => {
            optionsText += `${numberEmojis[index]} ${option}\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle('📊 Poll')
            .setDescription(`**${question}**`)
            .addFields({ name: 'Options', value: optionsText, inline: false })
            .setColor('#00FFFF')
            .setFooter({ text: `Poll by ${message.author.tag}` })
            .setTimestamp();

        const pollMessage = await message.channel.send({ embeds: [embed] });

        // Add reactions
        for (let i = 0; i < options.length; i++) {
            await pollMessage.react(numberEmojis[i]);
        }

        // Delete original command message
        message.delete().catch(() => {});
    }
};