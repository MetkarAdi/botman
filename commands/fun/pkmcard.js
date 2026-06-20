const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const { getRarityColor, searchPocketCards } = require('../../utils/pkmPacks');
const { logError } = require('../../utils/errorLogger');

module.exports = {
    name: 'pkmcard',
    aliases: ['pkcard', 'pcard'],
    description: 'View Pokémon TCG Pocket cards by Pokémon name',
    usage: 'pkmcard <pokemon>',
    category: 'fun',
    cooldown: 3,

    async execute(message, args, client) {
        const query = args.join(' ').trim();

        if (!query) {
            return message.reply('Usage: `>>pkmcard <pokemon>`');
        }

        try {
            const cards = await searchPocketCards(query);

            if (!cards.length) {
                return message.reply(`No Pokémon TCG Pocket cards found matching \`${query}\`.`);
            }

            let currentIndex = 0;
            const response = await message.reply({
                embeds: [buildCardEmbed(cards[currentIndex], currentIndex, cards.length, query)],
                components: [buildNavButtons(currentIndex, cards.length, false)]
            });

            const collector = message.channel.createMessageComponentCollector({
                filter: (interaction) => (
                    interaction.user.id === message.author.id &&
                    interaction.message.id === response.id
                ),
                time: 60000
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'pkm_card_prev') {
                    currentIndex = Math.max(0, currentIndex - 1);
                } else if (interaction.customId === 'pkm_card_next') {
                    currentIndex = Math.min(cards.length - 1, currentIndex + 1);
                } else if (interaction.customId === 'pkm_card_close') {
                    await interaction.update({
                        embeds: [buildCardEmbed(cards[currentIndex], currentIndex, cards.length, query)],
                        components: [buildNavButtons(currentIndex, cards.length, true)]
                    });
                    collector.stop('closed');
                    return;
                }

                return interaction.update({
                    embeds: [buildCardEmbed(cards[currentIndex], currentIndex, cards.length, query)],
                    components: [buildNavButtons(currentIndex, cards.length, false)]
                });
            });

            collector.on('end', async () => {
                await response.edit({
                    components: [buildNavButtons(currentIndex, cards.length, true)]
                }).catch(() => null);
            });
        } catch (error) {
            await logError(client, error, 'pkmcard');
            return message.reply('Something went wrong.');
        }
    }
};

function buildCardEmbed(card, index, total, query) {
    return new EmbedBuilder()
        .setColor(getRarityColor(card.rarity))
        .setTitle(card.name || 'Unknown Card')
        .setDescription(card.rarity || 'Unknown')
        .setImage(getImageUrl(card))
        .addFields(
            { name: 'Rarity', value: card.rarity || 'Unknown', inline: true },
            { name: 'Set', value: card.setName || card.setId || 'N/A', inline: true },
            { name: 'Card No.', value: card.localId || 'N/A', inline: true },
            { name: 'TCGdex ID', value: card.id || 'N/A', inline: true }
        )
        .setFooter({ text: `Card ${index + 1} / ${total}  •  Results for ${query}` });
}

function buildNavButtons(index, total, disabled) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('pkm_card_prev')
            .setLabel('⬅')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || index === 0),
        new ButtonBuilder()
            .setCustomId('pkm_card_next')
            .setLabel('➡')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || index === total - 1),
        new ButtonBuilder()
            .setCustomId('pkm_card_close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
}

function getImageUrl(card) {
    return card.imageUrl || (card.image ? `${card.image}/high.webp` : null);
}
