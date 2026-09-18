const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { card } = require('./ui');

function buildReminderPayload(reminder, { mention = null, snoozed = false } = {}) {
    const buttons = [];
    const sourceUrl = reminder.sourceUrl || channelUrl(reminder.guildId, reminder.channelId);

    if (sourceUrl) {
        buttons.push(new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Go to message')
            .setEmoji('↗️')
            .setURL(sourceUrl));
    }

    if (!snoozed) {
        buttons.push(new ButtonBuilder()
            .setCustomId(`reminder_snooze_${reminder._id}`)
            .setStyle(ButtonStyle.Secondary)
            .setLabel('Snooze 5 min')
            .setEmoji('💤'));
    }

    return card({
        title: snoozed ? '💤 Reminder snoozed' : '⏰ Reminder',
        body: [mention, reminder.message].filter(Boolean).join('\n\n'),
        tone: snoozed ? 'neutral' : 'brand',
        footer: snoozed ? 'A new reminder is scheduled for five minutes from now.' : `Set <t:${Math.floor(reminder.createdAt.getTime() / 1000)}:R>`,
        components: buttons.length ? [new ActionRowBuilder().addComponents(buttons)] : []
    });
}

function channelUrl(guildId, channelId) {
    return guildId && channelId ? `https://discord.com/channels/${guildId}/${channelId}` : null;
}

module.exports = { buildReminderPayload, channelUrl };
