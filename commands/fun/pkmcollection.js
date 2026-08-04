const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const PkmnCard = require('../../models/PkmnCard');
const { getRarityColor } = require('../../utils/pkmPacks');
const { logError } = require('../../utils/errorLogger');

const RARITIES = ['One Diamond', 'Two Diamond', 'Three Diamond', 'Four Diamond', 'One Star', 'Two Star', 'Three Star', 'One Shiny', 'Two Shiny', 'Crown', 'None'];

module.exports = {
    name: 'pkmcollection',
    aliases: ['pkmc', 'pkmcol', 'pokemon'],
    description: 'Browse a Pokémon card collection',
    usage: 'pkmcollection [@user|userId] [pack:<packId>]',
    category: 'fun',

    async execute(message, args, client) {
        try {
            const targetUser = await resolveTargetUser(message, args);
            const displayName = getDisplayName(message, targetUser);
            const packId = parsePackFilter(args);
            const query = { userId: targetUser.id };
            if (packId) query.packId = packId;

            const cards = await PkmnCard.find(query).sort({ drawnAt: -1 }).lean();
            if (!cards.length) {
                return message.reply(packId ? `${displayName} has no cards in that pack.` : 'No Pokémon cards found.');
            }

            let currentIndex = 0;
            let rarityFilter = null;
            const response = await message.reply({
                embeds: [buildCardEmbed(getVisibleCards(cards, rarityFilter), currentIndex, displayName, packId, rarityFilter)],
                components: buildComponents(currentIndex, getVisibleCards(cards, rarityFilter).length, false, rarityFilter)
            });

            const collector = response.createMessageComponentCollector({
                filter: interaction => interaction.user.id === message.author.id,
                time: 1200000
            });

            collector.on('collect', async interaction => {
                if (interaction.customId === 'pkm_col_rarity' && interaction.isStringSelectMenu()) {
                    rarityFilter = interaction.values[0] === 'all' ? null : interaction.values[0];
                    currentIndex = 0;
                } else if (interaction.customId === 'pkm_col_prev') {
                    currentIndex = Math.max(0, currentIndex - 1);
                } else if (interaction.customId === 'pkm_col_next') {
                    const visibleCards = getVisibleCards(cards, rarityFilter);
                    currentIndex = Math.min(visibleCards.length - 1, currentIndex + 1);
                } else if (interaction.customId === 'pkm_col_close') {
                    const visibleCards = getVisibleCards(cards, rarityFilter);
                    await interaction.update({
                        embeds: [buildCardEmbed(visibleCards, currentIndex, displayName, packId, rarityFilter)],
                        components: buildComponents(currentIndex, visibleCards.length, true, rarityFilter)
                    });
                    collector.stop('closed');
                    return;
                } else {
                    return;
                }

                const visibleCards = getVisibleCards(cards, rarityFilter);
                if (currentIndex >= visibleCards.length) currentIndex = Math.max(0, visibleCards.length - 1);
                await interaction.update({
                    embeds: [buildCardEmbed(visibleCards, currentIndex, displayName, packId, rarityFilter)],
                    components: buildComponents(currentIndex, visibleCards.length, false, rarityFilter)
                });
            });

            collector.on('end', async () => {
                const visibleCards = getVisibleCards(cards, rarityFilter);
                await response.edit({
                    components: buildComponents(currentIndex, visibleCards.length, true, rarityFilter)
                }).catch(() => null);
            });
        } catch (error) {
            await logError(client, error, 'pkmcollection', message.guild);
            return message.reply('Something went wrong.');
        }
    }
};

async function resolveTargetUser(message, args) {
    const explicitId = args[0]?.replace(/[<@!>]/g, '');
    if (!explicitId || /^pack:/i.test(args[0] || '')) return message.author;
    return message.client.users.fetch(explicitId).catch(() => message.author);
}

function getDisplayName(message, user) {
    const member = message.guild?.members.cache.get(user.id);
    return member?.displayName || user.username || user.tag || user.id;
}

function parsePackFilter(args) {
    const token = args.find(arg => /^pack:(.+)$/i.test(arg));
    return token?.match(/^pack:(.+)$/i)?.[1]?.toLowerCase() || null;
}

function getVisibleCards(cards, rarityFilter) {
    return rarityFilter ? cards.filter(card => (card.rarity || 'Unknown') === rarityFilter) : cards;
}

function buildCardEmbed(cards, index, displayName, packFilter, rarityFilter) {
    const card = cards[index];
    const suffix = `${packFilter ? ` — ${packFilter} pack` : ''}${rarityFilter ? ` — ${rarityFilter}` : ''}`;
    if (!card) {
        return new EmbedBuilder()
            .setColor('#95a5a6')
            .setTitle(`${displayName}'s Collection`)
            .setDescription(`No **${rarityFilter}** cards found in this collection.`)
            .setFooter({ text: `0 cards${suffix}` });
    }

    return new EmbedBuilder()
        .setColor(getRarityColor(card.rarity))
        .setTitle(card.name || 'Unknown Card')
        .setDescription(card.rarity || 'Unknown')
        .setImage(card.imageUrl)
        .addFields(
            { name: 'Set', value: card.setName || 'N/A', inline: true },
            { name: 'Pack', value: card.packId || 'N/A', inline: true },
            { name: 'Card No.', value: card.localId || 'N/A', inline: true }
        )
        .setFooter({ text: `Card ${index + 1} / ${cards.length}  •  ${displayName}'s Collection${suffix}` });
}

function buildComponents(index, total, disabled, selectedRarity) {
    return [buildNavButtons(index, total, disabled), buildRarityMenu(disabled, selectedRarity)];
}

function buildNavButtons(index, total, disabled) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pkm_col_prev').setLabel('⬅').setStyle(ButtonStyle.Secondary).setDisabled(disabled || index === 0 || total === 0),
        new ButtonBuilder().setCustomId('pkm_col_next').setLabel('➡').setStyle(ButtonStyle.Secondary).setDisabled(disabled || index >= total - 1 || total === 0),
        new ButtonBuilder().setCustomId('pkm_col_close').setLabel('Close').setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

function buildRarityMenu(disabled, selectedRarity) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('pkm_col_rarity')
            .setPlaceholder('Filter by rarity')
            .setDisabled(disabled)
            .addOptions(
                { label: 'All rarities', value: 'all', default: !selectedRarity },
                ...RARITIES.map(rarity => ({ label: rarity, value: rarity, default: selectedRarity === rarity }))
            )
    );
}