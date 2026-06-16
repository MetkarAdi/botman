const { EmbedBuilder } = require('discord.js');
const FootballCard = require('../../models/FootballCard');
const FCCooldown = require('../../models/FCCooldown');
const { getAvailableCharges, getNextReset } = require('../../utils/fcDraw');
const { logError } = require('../../utils/errorLogger');

module.exports = {
    name: 'fcstats',
    aliases: ['fcme'],
    description: 'View football card stats',
    usage: 'fcstats [@user|userId]',
    category: 'fun',
    cooldown: 3,

    async execute(message, args, client) {
        try {
            const targetUser = await resolveTargetUser(message, args, client);
            const displayName = await resolveDisplayName(message, targetUser);
            const cards = await FootballCard.find({ userId: targetUser.id }).lean();
            const cooldown = await FCCooldown.findOne({ userId: targetUser.id });
            const counts = countRarities(cards);
            const bestCard = cards
                .filter((card) => card.rating !== null && card.rating !== undefined)
                .sort((a, b) => b.rating - a.rating)[0];
            const available = getAvailableCharges(cooldown);

            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`${displayName}'s Card Stats`)
                .addFields(
                    { name: 'Total Cards', value: String(cards.length), inline: true },
                    { name: '🏆 Legendary', value: String(counts.Legendary), inline: true },
                    { name: '💜 Epic', value: String(counts.Epic), inline: true },
                    { name: '⭐ Rare', value: String(counts.Rare), inline: true },
                    { name: '🟢 Common', value: String(counts.Common), inline: true },
                    { name: '⚪ Basic', value: String(counts.Basic), inline: true },
                    {
                        name: 'Best Card',
                        value: bestCard ? `${bestCard.playerName} · ⭐${bestCard.rating}` : 'N/A',
                        inline: false
                    },
                    { name: 'Draws Left', value: `${available}/5 this window`, inline: true },
                    { name: 'Next Reset', value: `<t:${Math.floor(getNextReset().getTime() / 1000)}:R>`, inline: true }
                );

            return message.reply({ embeds: [embed] });
        } catch (error) {
            await logError(client, error, 'fcstats');
            return message.reply('❌ Something went wrong.');
        }
    }
};

async function resolveTargetUser(message, args, client) {
    const mentionedUser = message.mentions.users.first();
    if (mentionedUser) return mentionedUser;

    const rawId = args[0]?.replace(/[<@!>]/g, '');
    if (rawId && /^\d{17,20}$/.test(rawId)) {
        return client.users.fetch(rawId).catch(() => ({ id: rawId, username: rawId }));
    }

    return message.author;
}

async function resolveDisplayName(message, user) {
    const member = message.guild
        ? await message.guild.members.fetch(user.id).catch(() => null)
        : null;

    return member?.displayName || user.displayName || user.username || user.id;
}

function countRarities(cards) {
    return cards.reduce((counts, card) => {
        if (counts[card.rarity] !== undefined) {
            counts[card.rarity] += 1;
        }

        return counts;
    }, {
        Legendary: 0,
        Epic: 0,
        Rare: 0,
        Common: 0,
        Basic: 0
    });
}
