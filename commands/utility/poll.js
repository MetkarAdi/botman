const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { card } = require('../../utils/ui');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const POLL_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

module.exports = {
    name: 'poll',
    aliases: ['vote', 'survey'],
    description: 'Create a poll with buttons',
    usage: 'poll <question> | <option1> | <option2> [option3...]',
    category: 'utility',
    permissions: ['ManageMessages'],
    cooldown: 10,

    async execute(message, args) {
        const pollArgs = args.join(' ').split('|').map(arg => arg.trim()).filter(Boolean);
        if (pollArgs.length < 3) {
            return message.reply('❌ Please provide a question and at least 2 options separated by `|`.');
        }

        const [question, ...options] = pollArgs;
        if (options.length > 10) return message.reply('❌ Maximum 10 options allowed.');

        const pollMessage = await createPoll(message.channel, message.author, question, options);
        message.delete?.().catch(() => {});
        return pollMessage;
    },

    createPoll
};

async function createPoll(channel, author, question, options) {
    const pollId = `${author.id}_${Date.now().toString(36)}`;
    const votes = new Map();
    const pollMessage = await channel.send(buildPollPayload(pollId, author, question, options, votes));

    const collector = pollMessage.createMessageComponentCollector({
        filter: interaction => interaction.customId.startsWith(`poll_${pollId}_`),
        time: POLL_LIFETIME_MS
    });

    collector.on('collect', async interaction => {
        const optionIndex = Number(interaction.customId.slice(`poll_${pollId}_`.length));
        if (!Number.isInteger(optionIndex) || !options[optionIndex]) return;

        votes.set(interaction.user.id, optionIndex);
        await interaction.update(buildPollPayload(pollId, author, question, options, votes));
    });

    collector.on('end', async () => {
        await pollMessage.edit(buildPollPayload(pollId, author, question, options, votes, true)).catch(() => null);
    });

    return pollMessage;
}

function buildPollPayload(pollId, author, question, options, votes, closed = false) {
    const totals = options.map((_, index) => [...votes.values()].filter(vote => vote === index).length);
    const optionLines = options.map((option, index) =>
        `${NUMBER_EMOJIS[index]} **${option}**  ·  ${totals[index]} vote${totals[index] === 1 ? '' : 's'}`
    );
    const rows = [];
    for (let start = 0; start < options.length; start += 5) {
        rows.push(new ActionRowBuilder().addComponents(
            options.slice(start, start + 5).map((option, offset) => {
                const index = start + offset;
                return new ButtonBuilder()
                    .setCustomId(`poll_${pollId}_${index}`)
                    .setLabel(String(index + 1))
                    .setEmoji(NUMBER_EMOJIS[index])
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(closed);
            })
        ));
    }

    return card({
        title: `📊 ${closed ? 'Poll closed' : 'Poll'}`,
        body: `**${question}**\n\n${optionLines.join('\n')}`,
        footer: `${votes.size} participant${votes.size === 1 ? '' : 's'} · One vote per person; choosing again changes your vote.`,
        components: rows
    });
}
