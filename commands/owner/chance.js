const ChanceModifier = require('../../models/ChanceModifier');
const { MAX_CHANCE_LEVEL } = require('../../utils/chanceModifiers');
const { logError } = require('../../utils/errorLogger');

module.exports = {
    name: 'chance',
    aliases: ['luck'],
    description: 'Manage a user\'s Pokémon pack and football draw chance bonus',
    usage: 'chance <bump|show|reset> <@user|user_id>',
    category: 'owner',
    ownerOnly: true,
    guildOnly: false,
    cooldown: 0,

    async execute(message, args, client) {
        const action = args[0]?.toLowerCase();
        const target = await resolveTargetUser(message, args[1], client);

        if (!['bump', 'show', 'reset'].includes(action) || !target) {
            return message.reply('Usage: `>>chance bump @user`, `>>chance show @user`, or `>>chance reset @user`');
        }

        try {
            const existing = await ChanceModifier.findOne({ userId: target.id });
            const currentLevel = existing?.level || 0;

            if (action === 'show') {
                return message.reply(`${target.tag || target.username} has chance level **${currentLevel}**/${MAX_CHANCE_LEVEL}.`);
            }

            if (action === 'reset') {
                await ChanceModifier.deleteOne({ userId: target.id });
                return message.reply(`Reset ${target.tag || target.username} to chance level **0**.`);
            }

            if (currentLevel >= MAX_CHANCE_LEVEL) {
                return message.reply(`${target.tag || target.username} is already at the maximum chance level (**${MAX_CHANCE_LEVEL}**).`);
            }

            const level = currentLevel + 1;
            if (existing) {
                existing.level = level;
                await existing.save();
            } else {
                await ChanceModifier.create({ userId: target.id, level });
            }

            return message.reply(`Increased ${target.tag || target.username} to chance level **${level}**/${MAX_CHANCE_LEVEL}.`);
        } catch (error) {
            await logError(client, error, 'chance');
            return message.reply('❌ Unable to update that user\'s chance level.');
        }
    }
};

async function resolveTargetUser(message, rawArg, client) {
    const mentionedUser = message.mentions.users.first();
    if (mentionedUser) return mentionedUser;

    const userId = rawArg?.replace(/[<@!>]/g, '');
    if (!userId || !/^\d{17,20}$/.test(userId)) return null;

    return client.users.fetch(userId, { force: true, cache: true }).catch(() => null);
}
