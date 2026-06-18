const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const PkmnCooldown = require('../../models/PkmnCooldown');
const { PACKS, generatePack, getRarityColor } = require('../../utils/pkmPacks');
const { logError } = require('../../utils/errorLogger');

const PACK_COOLDOWN_MS = 30 * 60 * 1000;
const PACK_SIZE = 5;

module.exports = {
    name: 'open',
    aliases: ['openpack', 'pkopen'],
    description: 'Open a Pokémon TCG Pocket pack',
    usage: 'open <packname>',
    category: 'fun',
    cooldown: 3,

    async execute(message, args, client) {
        try {
            const packId = args[0]?.toLowerCase();
            const pack = PACKS[packId];

            if (!packId || !pack) {
                return message.reply({ embeds: [buildPackListEmbed()] });
            }

            let cooldown = await PkmnCooldown.findOne({ userId: message.author.id });

            if (!cooldown) {
                cooldown = await PkmnCooldown.create({ userId: message.author.id });
            }

            const nextOpenAt = cooldown.lastPackAt.getTime() + PACK_COOLDOWN_MS;

            if (Date.now() < nextOpenAt) {
                return message.reply({ embeds: [buildCooldownEmbed(nextOpenAt)] });
            }

            const openMsg = await message.reply({
                embeds: [buildOpeningEmbed(pack)],
                components: [buildOpenButton(message.author.id)]
            });

            await openMsg.edit({
                components: [buildOpenButton(message.author.id, openMsg.id)]
            });

            const openCustomId = `pkm_open_${message.author.id}_${openMsg.id}`;
            const openCollector = message.channel.createMessageComponentCollector({
                filter: (interaction) => (
                    interaction.customId === openCustomId &&
                    interaction.user.id === message.author.id
                ),
                time: 5 * 60 * 1000,
                max: 1
            });

            openCollector.on('collect', async (interaction) => {
                await interaction.deferUpdate();

                await PkmnCooldown.findOneAndUpdate(
                    { userId: message.author.id },
                    { lastPackAt: new Date() },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                let result;

                try {
                    result = await generatePack(packId, message.author.id);
                } catch (error) {
                    await logError(client, error, 'open generatePack');
                    await openMsg.edit({
                        embeds: [buildErrorEmbed()],
                        components: []
                    }).catch(() => null);
                    return;
                }

                const { cards, isGodPack } = result;
                let currentIndex = 0;
                let finalEmbed = buildCardEmbed(cards[currentIndex], currentIndex, cards.length);

                await openMsg.edit({
                    embeds: [finalEmbed],
                    components: [buildNavButtons(currentIndex, PACK_SIZE, false)]
                });

                const navCollector = openMsg.createMessageComponentCollector({
                    filter: (navInteraction) => (
                        navInteraction.customId.startsWith('pkm_nav_') &&
                        navInteraction.user.id === message.author.id &&
                        navInteraction.message.id === openMsg.id
                    ),
                    time: 5 * 60 * 1000
                });

                navCollector.on('collect', async (navInteraction) => {
                    if (navInteraction.customId === 'pkm_nav_prev') {
                        currentIndex = Math.max(0, currentIndex - 1);
                    } else if (navInteraction.customId === 'pkm_nav_next') {
                        currentIndex = Math.min(PACK_SIZE - 1, currentIndex + 1);
                    } else if (navInteraction.customId === 'pkm_nav_close') {
                        finalEmbed = buildCardEmbed(cards[currentIndex], currentIndex, cards.length, isGodPack);
                        await navInteraction.update({
                            embeds: [finalEmbed],
                            components: [buildNavButtons(currentIndex, PACK_SIZE, true)]
                        });
                        navCollector.stop('closed');
                        return;
                    }

                    navCollector.resetTimer?.();
                    finalEmbed = buildCardEmbed(cards[currentIndex], currentIndex, cards.length);
                    await navInteraction.update({
                        embeds: [finalEmbed],
                        components: [buildNavButtons(currentIndex, PACK_SIZE, false)]
                    });
                });

                navCollector.on('end', async () => {
                    finalEmbed = buildCardEmbed(cards[currentIndex], currentIndex, cards.length, isGodPack);
                    await openMsg.edit({
                        embeds: [finalEmbed],
                        components: [buildNavButtons(currentIndex, PACK_SIZE, true)]
                    }).catch(() => null);
                });
            });

            openCollector.on('end', async (collected) => {
                if (collected.size > 0) return;

                await openMsg.edit({
                    components: [buildOpenButton(message.author.id, openMsg.id, true)]
                }).catch(() => null);
            });
        } catch (error) {
            await logError(client, error, 'open');
            return message.reply('Something went wrong.');
        }
    }
};

function buildPackListEmbed() {
    return new EmbedBuilder()
        .setColor('#e8d44d')
        .setTitle('Available Pokémon Packs')
        .setDescription(Object.entries(PACKS)
            .map(([packId, pack]) => `• ${pack.label} — >>open ${packId}`)
            .join('\n'));
}

function buildCooldownEmbed(nextOpenAt) {
    return new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('Pack on Cooldown')
        .setDescription(`You can open another pack <t:${Math.floor(nextOpenAt / 1000)}:R>.`);
}

function buildOpeningEmbed(pack) {
    return new EmbedBuilder()
        .setColor('#e8d44d')
        .setTitle(`Opening ${pack.label}...`)
        .setImage(pack.packArtUrl);
}

function buildErrorEmbed() {
    return new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('Pack Opening Failed')
        .setDescription('Something went wrong while opening this pack.');
}

function buildCardEmbed(card, index, total, isGodPack = false) {
    const footerText = `Card ${index + 1} / ${total}${isGodPack ? ' • ✨ This was a God Pack.' : ''}`;

    return new EmbedBuilder()
        .setColor(getRarityColor(card.rarity))
        .setTitle(card.name || 'Unknown Card')
        .setImage(card.imageUrl)
        .addFields(
            { name: 'Rarity', value: card.rarity || 'Common', inline: true },
            { name: 'Set', value: card.setName || card.setId || 'N/A', inline: true },
            { name: 'Card No.', value: card.localId || 'N/A', inline: true }
        )
        .setFooter({ text: footerText });
}

function buildOpenButton(userId, messageId = null, disabled = false) {
    const customId = messageId ? `pkm_open_${userId}_${messageId}` : `pkm_open_${userId}`;

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(customId)
            .setLabel('Open Pack')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled)
    );
}

function buildNavButtons(currentIndex, total, disabled) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('pkm_nav_prev')
            .setLabel('⬅')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || currentIndex === 0),
        new ButtonBuilder()
            .setCustomId('pkm_nav_next')
            .setLabel('➡')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || currentIndex === total - 1),
        new ButtonBuilder()
            .setCustomId('pkm_nav_close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
}
