const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const FootballCard = require('../../models/FootballCard');

const PAGE_SIZE = 5;
const RARITIES = ['Basic', 'Common', 'Rare', 'Epic', 'Legendary'];
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
    name: 'fcinventory',
    aliases: ['fcfind', 'fci'],
    description: 'Search your football card inventory',
    usage: 'fcinventory <filter> <value>',
    category: 'fun',

    async execute(message, args) {
        const parsed = parseFilter(args);

        if (!parsed) {
            return message.reply({ embeds: [buildUsageEmbed()] });
        }

        if (parsed.error) {
            return message.reply(parsed.error);
        }

        const cards = await FootballCard.find({
            userId: message.author.id,
            ...parsed.query
        }).lean();

        cards.sort(compareCards);

        if (!cards.length) {
            return message.reply('No cards match that filter.');
        }

        let page = 0;
        const totalPages = Math.ceil(cards.length / PAGE_SIZE);
        const response = await message.reply({
            embeds: [buildInventoryEmbed(parsed.label, cards, page)],
            components: [buildButtons(page, totalPages)]
        });

        const collector = message.channel.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (interaction) => {
            if (interaction.message.id !== response.id) return;

            if (interaction.user.id !== message.author.id) {
                return interaction.reply({
                    content: 'Only the command user can control this inventory.',
                    ephemeral: true
                });
            }

            if (interaction.customId === 'fc_inventory_prev') {
                page = Math.max(page - 1, 0);
            } else if (interaction.customId === 'fc_inventory_next') {
                page = Math.min(page + 1, totalPages - 1);
            }

            return interaction.update({
                embeds: [buildInventoryEmbed(parsed.label, cards, page)],
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

function parseFilter(args) {
    const filter = args[0]?.toLowerCase();
    const value = args.slice(1).join(' ').trim();

    if (!filter || !value) {
        return null;
    }

    if (filter === 'name') {
        return {
            label: `name: ${value}`,
            query: { playerName: { $regex: escapeRegex(value), $options: 'i' } }
        };
    }

    if (filter === 'rarity') {
        const rarity = RARITIES.find((item) => item.toLowerCase() === value.toLowerCase());

        if (!rarity) {
            return { error: 'Rarity must be one of: Basic, Common, Rare, Epic, Legendary.' };
        }

        return {
            label: `rarity: ${rarity}`,
            query: { rarity }
        };
    }

    if (filter === 'rating') {
        const match = value.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);

        if (!match) {
            return { error: 'Rating filter must use a range like `7.0-8.5`.' };
        }

        const min = Number(match[1]);
        const max = Number(match[2]);

        if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
            return { error: 'Rating range is invalid.' };
        }

        return {
            label: `rating: ${value}`,
            query: { rating: { $gte: min, $lte: max } }
        };
    }

    if (filter === 'position') {
        const position = value.toUpperCase();

        if (!['GK', 'DEF', 'MID', 'FWD'].includes(position)) {
            return { error: 'Position must be one of: GK, DEF, MID, FWD.' };
        }

        return {
            label: `position: ${position}`,
            query: { position: { $regex: escapeRegex(position), $options: 'i' } }
        };
    }

    return null;
}

function buildUsageEmbed() {
    return new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('Inventory Filters')
        .setDescription('Usage: `>>fcinventory <filter> <value>`')
        .addFields(
            { name: 'name <search>', value: '`>>fcinventory name messi`', inline: false },
            { name: 'rarity <Basic|Common|Rare|Epic|Legendary>', value: '`>>fcinventory rarity Epic`', inline: false },
            { name: 'rating <min>-<max>', value: '`>>fcinventory rating 7.0-8.5`', inline: false },
            { name: 'position <GK|DEF|MID|FWD>', value: '`>>fcinventory position MID`', inline: false }
        );
}

function compareCards(a, b) {
    const rarityA = RARITY_ORDER[a.rarity] ?? RARITY_ORDER.Basic;
    const rarityB = RARITY_ORDER[b.rarity] ?? RARITY_ORDER.Basic;

    if (rarityA !== rarityB) {
        return rarityA - rarityB;
    }

    return (b.rating ?? -Infinity) - (a.rating ?? -Infinity);
}

function buildInventoryEmbed(label, cards, page) {
    const start = page * PAGE_SIZE;
    const pageCards = cards.slice(start, start + PAGE_SIZE);
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`Inventory — ${label} (${cards.length} results)`)
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
            .setCustomId('fc_inventory_prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page === 0),
        new ButtonBuilder()
            .setCustomId('fc_inventory_next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page >= totalPages - 1)
    );
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
