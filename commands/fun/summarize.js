const { EmbedBuilder } = require('discord.js');
const { summarizeTranscript } = require('../../utils/groqClient');
const { logError } = require('../../utils/errorLogger');

const MAX_TRANSCRIPT_LENGTH = 12000;

module.exports = {
    name: 'summarize',
    aliases: ['summary', 'tldr'],
    description: 'Summarize the conversation between a replied-to message and now',
    usage: 'summarize (must be used as a reply to the message you want to summarize from)',
    category: 'fun',
    guildOnly: true,
    cooldown: 15,

    async execute(message, args, client, guildData) {
        if (!guildData?.summarizeEnabled) {
            return message.reply('❌ Conversation summaries are not enabled in this server.');
        }

        if (!message.reference) {
            return message.reply('❌ You need to reply to the message you want to start summarizing from.');
        }

        const startMessage = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (!startMessage) {
            return message.reply('❌ Could not find the message you replied to.');
        }

        const collected = await fetchRange(message.channel, startMessage.id, message.id);
        if (!collected) {
            return message.reply('❌ That conversation is too long or the starting message couldn\'t be located. Try replying to a more recent message.');
        }

        const transcriptMessages = collected.filter(msg => !msg.author.bot);
        if (transcriptMessages.length === 0) {
            return message.reply('❌ There\'s nothing to summarize in that range.');
        }

        const transcript = buildTranscript(transcriptMessages);
        if (!transcript) {
            return message.reply('❌ There\'s nothing to summarize in that range.');
        }

        const placeholder = await message.reply('Generating summary...');

        try {
            const summary = await summarizeTranscript(transcript);
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(' Conversation Summary')
                .setDescription(summary)
                .setFooter({ text: `Summarized ${transcriptMessages.length} messages • Requested by ${message.author.tag}` });

            return placeholder.edit({ content: null, embeds: [embed] });
        } catch (error) {
            await logError(client, error, 'summarize');
            return placeholder.edit('❌ Couldn\'t generate a summary right now. Try again shortly.');
        }
    }
};

async function fetchRange(channel, startId, endId) {
    const collected = [];
    let beforeId = endId;
    const HARD_CAP = 500;

    while (collected.length < HARD_CAP) {
        const batch = await channel.messages.fetch({ before: beforeId, limit: 100 });
        if (batch.size === 0) break;

        const batchArray = [...batch.values()];
        for (const msg of batchArray) {
            collected.push(msg);
            if (msg.id === startId) {
                return collected.reverse();
            }
        }

        beforeId = batchArray[batchArray.length - 1].id;
    }

    return null;
}

function buildTranscript(messages) {
    const transcript = messages
        .map(formatTranscriptMessage)
        .filter(Boolean)
        .join('');

    if (transcript.length <= MAX_TRANSCRIPT_LENGTH) {
        return transcript;
    }

    return transcript.slice(-MAX_TRANSCRIPT_LENGTH);
}

function formatTranscriptMessage(message) {
    const displayName = message.member?.displayName || message.author.username;
    const content = message.content?.trim();

    if (content) {
        return `${displayName}:\n${content}\n\n`;
    }

    if (message.attachments?.size > 0) {
        return `${displayName}:\n[sent an attachment]\n\n`;
    }

    return null;
}
