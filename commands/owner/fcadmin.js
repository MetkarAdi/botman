const { EmbedBuilder } = require('discord.js');
const FCCooldown = require('../../models/FCCooldown');
const { awardFootballCard, resolveFootballCard } = require('../../utils/fcDraw');
const { logError } = require('../../utils/errorLogger');

module.exports = {
    name: 'fcadmin',
    description: 'Manage football cards and draw cooldowns',
    usage: 'fcadmin <reset|give|resetall>',
    category: 'owner',
    ownerOnly: true,
    guildOnly: false,
    cooldown: 0,

    async execute(message, args, client) {
        if (!isBotOwner(message, client)) {
            return message.reply('❌ This command is restricted to the bot owner.');
        }

        const subcommand = args[0]?.toLowerCase();

        try {
            if (subcommand === 'reset') {
                return resetUserCooldown(message, args, client);
            }

            if (subcommand === 'give') {
                return giveCard(message, args, client);
            }

            if (subcommand === 'resetall') {
                return resetAllCooldowns(message);
            }

            return message.reply('Usage: `>>fcadmin reset @user`, `>>fcadmin give @user <playerName|cardId>`, or `>>fcadmin resetall`');
        } catch (error) {
            await logError(client, error, 'fcadmin');
            return message.reply('❌ Something went wrong.');
        }
    }
};

async function resetUserCooldown(message, args, client) {
    const target = await resolveTargetUser(message, args[1], client);

    if (!target) {
        return message.reply('❌ Please mention a user or provide a valid user ID.');
    }

    await FCCooldown.findOneAndUpdate(
        { userId: target.id },
        { chargesUsed: 0, lastResetAt: new Date(0) },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return message.reply(`✅ Reset draws for ${target.tag}. They now have 5 fresh charges.`);
}

async function giveCard(message, args, client) {
    const target = await resolveTargetUser(message, args[1], client);

    if (!target) {
        return message.reply('❌ Please mention a user or provide a valid user ID.');
    }

    const cardQuery = args.slice(2).join(' ').trim();

    if (!cardQuery) {
        return message.reply('Usage: `>>fcadmin give @user <playerName|cardId>`');
    }

    const resolved = await resolveFootballCard(cardQuery, client);

    if (!resolved) {
        return message.reply(`❌ Card not found for \`${stripWrappingQuotes(cardQuery)}\`.`);
    }

    let card;
    try {
        card = await awardFootballCard(target.id, resolved, client);
    } catch (error) {
        await logError(client, error, 'fcadmin give save');
        return message.reply('❌ Failed to save the card to that user\'s collection.');
    }

    if (!card) {
        return message.reply(`❌ Card not found for \`${stripWrappingQuotes(cardQuery)}\`.`);
    }

    return message.reply({ embeds: [buildGiveEmbed(target, card)] });
}

async function resetAllCooldowns(message) {
    await FCCooldown.updateMany({}, { chargesUsed: 0, lastResetAt: new Date(0) });
    return message.reply('✅ Reset all draw cooldowns globally.');
}

async function resolveTargetUser(message, rawArg, client) {
    const mentionedUser = message.mentions.users.first();
    if (mentionedUser) return mentionedUser;

    const userId = rawArg?.replace(/[<@!>]/g, '');
    if (!userId || !/^\d{17,20}$/.test(userId)) return null;

    return client.users.fetch(userId, { force: true, cache: true }).catch(() => null);
}

function buildGiveEmbed(target, card) {
    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('Football Card Added')
        .addFields(
            { name: 'Recipient', value: `${target.tag || target.username} (${target.id})`, inline: false },
            { name: 'Card', value: card.playerName || 'Unknown Player', inline: true },
            { name: 'Rarity', value: card.rarity || 'Basic', inline: true },
            { name: 'Club', value: card.club || 'N/A', inline: true },
            { name: 'Position', value: card.position || 'N/A', inline: true }
        )
        .setFooter({ text: `Card ID #${card.cardId}` });

    if (card.playerPhoto) {
        embed.setThumbnail(card.playerPhoto);
    }

    return embed;
}

function isBotOwner(message, client) {
    const ownerIds = [client.config?.ownerId, process.env.OWNER_ID].filter(Boolean);
    return ownerIds.includes(message.author.id);
}

function stripWrappingQuotes(value) {
    return String(value || '').replace(/^["']|["']$/g, '');
}
