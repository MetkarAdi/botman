const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { drawCard, getNextReset, getAvailableCharges } = require('../../utils/fcDraw');
const generateCard = require('../../utils/cardGenerator');
const FCCooldown = require('../../models/FCCooldown');
const { logError } = require('../../utils/errorLogger');

const RARITY_COLORS = {
    Basic: '#aaaaaa',
    Common: '#2ecc71',
    Rare: '#3498db',
    Epic: '#9b59b6',
    Legendary: '#f1c40f'
};

const RARITY_EMOJIS = {
    Basic: '⚪',
    Common: '⭐',
    Rare: '⭐',
    Epic: '⭐',
    Legendary: '⭐'
};

module.exports = {
    name: 'fcdraw',
    aliases: ['fcpull', 'drawcard'],
    description: 'Draw a football player card',
    usage: 'fcdraw',
    category: 'fun',
    cooldown: 3,

    async execute(message, args, client) {
        try {
            let cooldown = await FCCooldown.findOne({ userId: message.author.id });

            if (!cooldown) {
                cooldown = await FCCooldown.create({ userId: message.author.id });
            }

            const availableCharges = getAvailableCharges(cooldown);

            if (availableCharges === 0) {
                return message.reply({ embeds: [buildCooldownEmbed()] });
            }

            const card = await drawCard(message.author.id, client);
            const image = await generateCard(card);
            const attachment = new AttachmentBuilder(image, { name: `${card.cardId}.png` });
            const rarity = card.rarity || 'Basic';
            const embed = new EmbedBuilder()
                .setColor(RARITY_COLORS[rarity] || RARITY_COLORS.Basic)
                .setTitle(`${RARITY_EMOJIS[rarity] || RARITY_EMOJIS.Basic} ${card.playerName}`)
                .setImage(`attachment://${card.cardId}.png`)
                .addFields(
                    { name: 'Club', value: card.club || 'N/A', inline: true },
                    { name: 'Position', value: card.position || 'N/A', inline: true },
                    {
                        name: 'Rating',
                        value: card.rating === null || card.rating === undefined ? 'N/A' : String(card.rating),
                        inline: true
                    },
                    { name: 'Card ID', value: `#${card.cardId}`, inline: true }
                );

            await message.reply({ embeds: [embed], files: [attachment] });

            const updatedCooldown = await FCCooldown.findOne({ userId: message.author.id });
            const remaining = getAvailableCharges(updatedCooldown);
            return message.channel.send(`Draw used! **${remaining}/5** draws left this window. Next reset: <t:${Math.floor(getNextReset().getTime() / 1000)}:R>.`);
        } catch (error) {
            if (error.message?.startsWith('COOLDOWN:')) {
                return message.reply({ embeds: [buildCooldownEmbed(error.message)] });
            }

            await logError(client, error, 'fcdraw');
            return message.reply('❌ Something went wrong.');
        }
    }
};

function buildCooldownEmbed(errorMessage = null) {
    const parsedReset = Number(errorMessage?.split(':')[1]);
    const nextReset = Number.isFinite(parsedReset) ? parsedReset : getNextReset().getTime();

    return new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('⏳ No Draws Left')
        .setDescription(`You've used all 5 draws this window. Next reset: <t:${Math.floor(nextReset / 1000)}:R>\nYou get **5 draws per reset window**, **6 resets per day** (every 4 hours).`);
}
