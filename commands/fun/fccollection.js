const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const FootballCard = require('../../models/FootballCard');

const PAGE_SIZE = 5;
const RARITY_ORDER = {
    Legendary: 0,
    Epic: 1,
    Rare: 2,
    Common: 3,
    Basic: 4
};
const RARITY_EMOJIS = {
    Basic: '⚪',
    Common: '⭐',
    Rare: '⭐',
    Epic: '⭐',
    Legendary: '⭐'
};

module.exports = {
    name: 'fccollection',
    aliases: ['fcc', 'mycards'],
    description: 'View a football card collection',
    usage: 'fccollection [@user|userId]',
    category: 'fun',

    async execute(message, args) {
        const targetUser = await resolveTargetUser(message, args);
        const displayName = getDisplayName(message, targetUser);
        const cards = await FootballCard.find({ userId: targetUser.id }).lean();

        if (!cards.length) {
            return message.reply(`${displayName} hasn't drawn any cards yet.`);
        }

        cards.sort(compareCards);

        let page = 0;
        const totalPages = Math.ceil(cards.length / PAGE_SIZE);
        const response = await message.reply({
            embeds: [buildCollectionEmbed(displayName, cards, page)],
            components: [buildButtons(page, totalPages)]
        });

        const collector = message.channel.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (interaction) => {
            if (interaction.message.id !== response.id) return;

            if (interaction.user.id !== message.author.id) {
                return interaction.reply({
                    content: 'Only the command user can control this collection.',
                    ephemeral: true
                });
            }

            if (interaction.customId === 'fc_collection_prev') {
                page = Math.max(page - 1, 0);
            } else if (interaction.customId === 'fc_collection_next') {
                page = Math.min(page + 1, totalPages - 1);
            }

            return interaction.update({
                embeds: [buildCollectionEmbed(displayName, cards, page)],
                components: [buildButtons(page, totalPages)]
            });
        });

        collector.on('end', async () => {
            await response.edit({
                components: [buildButtons(page, totalPages, true)]
            }).catch(() => null);
        });
    }
};

async function resolveTargetUser(message, args) {
    const explicitId = args[0]?.replace(/[<@!>]/g, '');

    if (!explicitId) {
        return message.author;
    }

    return message.client.users.fetch(explicitId).catch(() => message.author);
}

function getDisplayName(message, user) {
    const member = message.guild?.members.cache.get(user.id);
    return member?.displayName || user.username || user.tag || user.id;
}

function compareCards(a, b) {
    const rarityA = RARITY_ORDER[a.rarity] ?? RARITY_ORDER.Basic;
    const rarityB = RARITY_ORDER[b.rarity] ?? RARITY_ORDER.Basic;

    if (rarityA !== rarityB) {
        return rarityA - rarityB;
    }

    return new Date(b.drawnAt).getTime() - new Date(a.drawnAt).getTime();
}

function buildCollectionEmbed(displayName, cards, page) {
    const start = page * PAGE_SIZE;
    const pageCards = cards.slice(start, start + PAGE_SIZE);
    const embed = new EmbedBuilder()
        .setColor('#f1c40f')
        .setTitle(`${displayName}'s Collection (${cards.length} cards)`)
        .setFooter({ text: `Page ${page + 1}/${Math.ceil(cards.length / PAGE_SIZE)}` });

    pageCards.forEach((card) => {
        const rarity = card.rarity || 'Basic';
        const rating = card.rating === null || card.rating === undefined ? 'N/A' : card.rating;

        embed.addFields({
            name: `${RARITY_EMOJIS[rarity] || RARITY_EMOJIS.Basic} ${card.playerName || 'Unknown Player'}`,
            value: `${card.club || 'N/A'} · ${card.position || 'N/A'} · ⭐ ${rating} · \\#${card.cardId}`,
            inline: false
        });
    });

    return embed;
}

function buildButtons(page, totalPages, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('fc_collection_prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page === 0),
        new ButtonBuilder()
            .setCustomId('fc_collection_next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page >= totalPages - 1)
    );
}
