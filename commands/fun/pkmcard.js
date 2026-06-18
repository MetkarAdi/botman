const { EmbedBuilder } = require('discord.js');
const PkmnCard = require('../../models/PkmnCard');
const { getRarityColor } = require('../../utils/pkmPacks');
const { logError } = require('../../utils/errorLogger');

module.exports = {
    name: 'pkmcard',
    aliases: ['pkcard', 'pcard'],
    description: 'View a Pokémon card by card ID',
    usage: 'pkmcard <cardId>',
    category: 'fun',
    cooldown: 3,

    async execute(message, args, client) {
        const rawCardId = args[0];

        if (!rawCardId) {
            return message.reply('Usage: `>>pkmcard <cardId>`');
        }

        const cardId = rawCardId.toUpperCase();

        try {
            const card = await PkmnCard.findOne({ cardId });

            if (!card) {
                return message.reply(`Card #${rawCardId} not found.`);
            }

            const owner = await client.users.fetch(card.userId).catch(() => null);

            return message.reply({
                embeds: [buildCardEmbed(card, owner)]
            });
        } catch (error) {
            await logError(client, error, 'pkmcard');
            return message.reply('Something went wrong.');
        }
    }
};

function buildCardEmbed(card, owner) {
    return new EmbedBuilder()
        .setColor(getRarityColor(card.rarity))
        .setTitle(card.name || 'Unknown Card')
        .setImage(card.imageUrl)
        .addFields(
            { name: 'Rarity', value: card.rarity || 'Common', inline: true },
            { name: 'Set', value: card.setName || card.setId || 'N/A', inline: true },
            { name: 'Card No.', value: card.localId || 'N/A', inline: true },
            { name: 'Pack', value: card.packId || 'N/A', inline: true },
            { name: 'Owner', value: formatOwner(card.userId, owner), inline: true }
        )
        .setFooter({ text: `Card ID: ${card.cardId}  •  Obtained ${card.drawnAt.toDateString()}` });
}

function formatOwner(userId, owner) {
    if (owner) {
        return `${owner.username} (<@${owner.id}>)`;
    }

    return `<@${userId}>`;
}
