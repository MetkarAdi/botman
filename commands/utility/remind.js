const { EmbedBuilder } = require('discord.js');
const Reminder = require('../../models/Reminder');
const { parseTime, formatDuration } = require('../../utils/helpers');

module.exports = {
    name: 'remind',
    aliases: ['reminder', 'remindme', 'rm'],
    description: 'Set a reminder. Bot will DM you after the time.',
    usage: 'remind <time> <message>  (e.g. remind 2h30m Submit the report)',
    category: 'utility',
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (args.length < 2) {
            return message.reply('❌ Usage: `remind <time> <message>`\nExamples: `remind 10m take a break`, `remind 2h30m check the oven`');
        }

        const duration = parseTime(args[0]);
        if (!duration || duration <= 0) {
            return message.reply('❌ Invalid time format. Use combinations like `10m`, `2h`, `1d`, `1h30m`.');
        }

        const maxDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
        if (duration > maxDuration) {
            return message.reply('❌ Reminders cannot be set more than 30 days in advance.');
        }

        const reminderMessage = args.slice(1).join(' ');
        const remindAt = new Date(Date.now() + duration);

        try {
            await Reminder.create({
                userId: message.author.id,
                channelId: message.channel.id,
                guildId: message.guild.id,
                message: reminderMessage,
                remindAt
            });

            const embed = new EmbedBuilder()
                .setTitle('⏰ Reminder Set')
                .addFields(
                    { name: '📝 Message', value: reminderMessage, inline: false },
                    { name: '⏱️ In', value: formatDuration(duration), inline: true },
                    { name: '🕐 At', value: `<t:${Math.floor(remindAt.getTime() / 1000)}:F>`, inline: true }
                )
                .setColor('#00BFFF')
                .setFooter({ text: "I'll DM you when it's time!" })
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error creating reminder:', error);
            message.reply('❌ Failed to set reminder.');
        }
    }
};