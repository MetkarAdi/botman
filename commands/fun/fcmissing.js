const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const FootballCard = require('../../models/FootballCard');
const playerPool = require('../../data/playerPool.json');

const PAGE_SIZE = 10;
const RARITY_EMOJIS = {
    Basic: '\u26aa',
    Common: '\u2b50',
    Rare: '\u2b50',
    Epic: '\u2b50',
    Legendary: '\u2b50'
};

module.exports = {
    name: 'fcmissing',
    aliases: ['fcm'],
    description: 'View missing football cards from the player pool',
    usage: 'fcmissing [@user|userId]',
    category: 'fun',

    async execute(message, args) {
        const targetUser = await resolveTargetUser(message, args);
        const displayName = getDisplayName(message, targetUser);
        const cards = await FootballCard.find({ userId: targetUser.id }).select('playerName -_id').lean();
        const ownedPlayerNames = new Set(cards.map((card) => card.playerName).filter(Boolean));
        const total = playerPool.length;
        const missingPlayers = playerPool
            .filter((player) => !ownedPlayerNames.has(player.playerName))
            .sort((a, b) => (b.rating ?? -Infinity) - (a.rating ?? -Infinity));

        if (!missingPlayers.length) {
            return message.reply(`\u2705 ${displayName} has collected every card in the pool!`);
        }

        let page = 0;
        const totalPages = Math.ceil(missingPlayers.length / PAGE_SIZE);
        const response = await message.reply({
            embeds: [buildMissingEmbed(displayName, missingPlayers, total, page)],
            components: [buildButtons(page, totalPages)]
        });

        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({
                    content: 'Only the command user can control this list.',
                    ephemeral: true
                });
            }

            if (interaction.customId === 'fc_missing_prev') {
                page = Math.max(page - 1, 0);
            } else if (interaction.customId === 'fc_missing_next') {
                page = Math.min(page + 1, totalPages - 1);
            }

            return interaction.update({
                embeds: [buildMissingEmbed(displayName, missingPlayers, total, page)],
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

function buildMissingEmbed(displayName, missingPlayers, total, page) {
    const start = page * PAGE_SIZE;
    const pagePlayers = missingPlayers.slice(start, start + PAGE_SIZE);

    return new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle(`${displayName}'s Missing Cards (${missingPlayers.length} / ${total} missing)`)
        .setDescription(pagePlayers.map(formatPlayerLine).join('\n'))
        .setFooter({ text: `Page ${page + 1}/${Math.ceil(missingPlayers.length / PAGE_SIZE)}` });
}

function formatPlayerLine(player) {
    const rating = player.rating === null || player.rating === undefined ? 'N/A' : player.rating;
    const rarityEmoji = RARITY_EMOJIS[getRarity(player.rating)] || RARITY_EMOJIS.Basic;

    return `${rarityEmoji} **${formatValue(player.playerName)}** \u2014 ${formatValue(player.club)} \u00b7 ${formatValue(player.position)} \u00b7 \u2b50${rating}`;
}

function buildButtons(page, totalPages, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('fc_missing_prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page === 0),
        new ButtonBuilder()
            .setCustomId('fc_missing_next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page >= totalPages - 1)
    );
}

function getRarity(rating) {
    if (rating === null || rating === undefined || rating < 6) return 'Basic';
    if (rating < 7) return 'Common';
    if (rating < 8) return 'Rare';
    if (rating < 9) return 'Epic';
    return 'Legendary';
}

function formatValue(value) {
    return value === null || value === undefined || value === '' ? 'N/A' : String(value);
}
