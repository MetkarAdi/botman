const { EmbedBuilder } = require('discord.js');
const PkmnCard = require('../../models/PkmnCard');
const PkmnCooldown = require('../../models/PkmnCooldown');

const PACK_COOLDOWN_MS = 30 * 60 * 1000;
const RARITY_ORDER = ['None', 'One Diamond', 'Two Diamond', 'Three Diamond', 'Four Diamond', 'One Star', 'One Shiny', 'Two Star', 'Two Shiny', 'Three Star', 'Crown'];
const RARITY_EMOJIS = {
    None: '⚪', 'One Diamond': '◇', 'Two Diamond': '◆', 'Three Diamond': '🔷', 'Four Diamond': '💎',
    'One Star': '⭐', 'Two Star': '🌟', 'Three Star': '✨', 'One Shiny': '🟢', 'Two Shiny': '🟡', Crown: '👑'
};

module.exports = {
    name: 'pkstats',
    aliases: ['pokemonstats'],
    description: 'View Pokémon TCG Pocket collection statistics',
    usage: 'pkstats [@user|userId]',
    category: 'fun',

    async execute(message, args, client) {
        const target = await resolveTarget(message, args);
        const [cards, cooldown] = await Promise.all([
            PkmnCard.find({ userId: target.id }).lean(),
            PkmnCooldown.findOne({ userId: target.id }).lean()
        ]);
        const displayName = message.guild?.members.cache.get(target.id)?.displayName || target.username || target.tag;
        const counts = cards.reduce((map, card) => {
            const rarity = card.rarity || 'Unknown';
            map.set(rarity, (map.get(rarity) || 0) + 1);
            return map;
        }, new Map());
        const rarest = [...cards].sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity))[0];
        const nextPackAt = cooldown?.lastPackAt ? new Date(cooldown.lastPackAt).getTime() + PACK_COOLDOWN_MS : 0;
        const rarityLines = RARITY_ORDER
            .filter(rarity => counts.has(rarity))
            .map(rarity => `${RARITY_EMOJIS[rarity] || '•'} ${rarity}: **${counts.get(rarity)}**`)
            .join('\n') || 'No cards yet';

        return message.reply({
            embeds: [new EmbedBuilder()
                .setTitle(`🃏 ${displayName}'s Pokémon Stats`)
                .setColor('#FFCB05')
                .addFields(
                    { name: 'Total Cards', value: String(cards.length), inline: true },
                    { name: 'Next Pack', value: nextPackAt > Date.now() ? `<t:${Math.floor(nextPackAt / 1000)}:R>` : 'Ready now!', inline: true },
                    { name: 'Rarity Breakdown', value: rarityLines, inline: false },
                    { name: 'Rarest Card', value: rarest ? `${rarest.name || 'Unknown'} + ${rarest.setName || rarest.setId || 'Unknown Set'}` : 'None yet', inline: false }
                )]
        });
    }
};

async function resolveTarget(message, args) {
    const userId = args[0]?.replace(/[<@!>]/g, '');
    return userId ? message.client.users.fetch(userId).catch(() => message.author) : message.author;
}

function rarityRank(rarity) {
    const index = RARITY_ORDER.indexOf(rarity);
    return index === -1 ? -1 : index;
}
