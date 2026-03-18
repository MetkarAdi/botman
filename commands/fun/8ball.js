const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: '8ball',
    aliases: ['eightball', 'magic8ball'],
    description: 'Ask the magic 8-ball a question',
    usage: '8ball <question>',
    category: 'fun',
    cooldown: 5,

    async execute(message, args, client) {
        if (!args.length) {
            return message.reply('❌ Please ask a question!');
        }

        const responses = [
            'It is certain.',
            'It is decidedly so.',
            'Without a doubt.',
            'Yes definitely.',
            'You may rely on it.',
            'As I see it, yes.',
            'Most likely.',
            'Outlook good.',
            'Yes.',
            'Signs point to yes.',
            'Reply hazy, try again.',
            'Ask again later.',
            'Better not tell you now.',
            'Cannot predict now.',
            'Concentrate and ask again.',
            'Don\'t count on it.',
            'My reply is no.',
            'My sources say no.',
            'Outlook not so good.',
            'Very doubtful.'
        ];

        const question = args.join(' ');
        const response = responses[Math.floor(Math.random() * responses.length)];

        const embed = new EmbedBuilder()
            .setTitle('🎱 Magic 8-Ball')
            .addFields(
                { name: '❓ Question', value: question, inline: false },
                { name: '💬 Answer', value: response, inline: false }
            )
            .setColor('#800080')
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
