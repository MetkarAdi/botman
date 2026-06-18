const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const PkmnCard = require('../../models/PkmnCard');
const { getRarityColor } = require('../../utils/pkmPacks');
const { logError } = require('../../utils/errorLogger');

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

            if (packId) {
                query.packId = packId;
            }

            const cards = await PkmnCard.find(query).sort({ drawnAt: -1 }).lean();

            if (!cards.length) {
                return message.reply(packId
                    ? `${displayName} has no cards in that pack.`
                    : 'No Pokémon cards found.');
            }

            let currentIndex = 0;
            const response = await message.reply({
                embeds: [buildCardEmbed(cards[currentIndex], currentIndex, cards.length, displayName, packId)],
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
                if (interaction.customId === 'pkm_col_prev') {
                    currentIndex = Math.max(0, currentIndex - 1);
                } else if (interaction.customId === 'pkm_col_next') {
                    currentIndex = Math.min(cards.length - 1, currentIndex + 1);
                } else if (interaction.customId === 'pkm_col_close') {
                    await interaction.update({
                        embeds: [buildCardEmbed(cards[currentIndex], currentIndex, cards.length, displayName, packId)],
                        components: [buildNavButtons(currentIndex, cards.length, true)]
                    });
                    collector.stop('closed');
                    return;
                }

                return interaction.update({
                    embeds: [buildCardEmbed(cards[currentIndex], currentIndex, cards.length, displayName, packId)],
                    components: [buildNavButtons(currentIndex, cards.length, false)]
                });
            });

            collector.on('end', async () => {
                await response.edit({
                    components: [buildNavButtons(currentIndex, cards.length, true)]
                }).catch(() => null);
            });
        } catch (error) {
            await logError(client, error, 'pkmcollection');
            return message.reply('Something went wrong.');
        }
    }
};

async function resolveTargetUser(message, args) {
    const explicitId = args[0]?.replace(/[<@!>]/g, '');

    if (!explicitId || /^pack:/i.test(args[0] || '')) {
        return message.author;
    }

    return message.client.users.fetch(explicitId).catch(() => message.author);
}

function getDisplayName(message, user) {
    const member = message.guild?.members.cache.get(user.id);
    return member?.displayName || user.username || user.tag || user.id;
}

function parsePackFilter(args) {
    const token = args.find((arg) => /^pack:(.+)$/i.test(arg));
    return token?.match(/^pack:(.+)$/i)?.[1]?.toLowerCase() || null;
}

function buildCardEmbed(card, index, total, displayName, packFilter) {
    return new EmbedBuilder()
        .setColor(getRarityColor(card.rarity))
        .setTitle(card.name || 'Unknown Card')
        .setDescription(card.rarity || 'Common')
        .setImage(card.imageUrl)
        .addFields(
            { name: 'Set', value: card.setName || 'N/A', inline: true },
            { name: 'Pack', value: card.packId || 'N/A', inline: true },
            { name: 'Card No.', value: card.localId || 'N/A', inline: true }
        )
        .setFooter({
            text: `Card ${index + 1} / ${total}  •  ${displayName}'s Collection${packFilter ? ` — ${packFilter} pack` : ''}`
        });
}

function buildNavButtons(index, total, disabled) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('pkm_col_prev')
            .setLabel('⬅')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || index === 0),
        new ButtonBuilder()
            .setCustomId('pkm_col_next')
            .setLabel('➡')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || index === total - 1),
        new ButtonBuilder()
            .setCustomId('pkm_col_close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
}
