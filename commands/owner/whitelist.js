const { EmbedBuilder } = require('discord.js');
const Whitelist = require('../../models/Whitelist');

module.exports = {
    name: 'whitelist',
    aliases: ['wl'],
    description: 'Manage the bot whitelist for this server',
    usage: 'whitelist <add|remove|list> [@user]',
    category: 'owner',
    ownerOnly: true,
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client) {
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('Owner only.');
        }

        const guildId = message.guild.id;
        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'add') {
            const target = await resolveUser(message, args[1], client);
            if (!target) return message.reply('Please mention a user or provide a valid user ID.');

            await Whitelist.updateOne(
                { userId: target.id, guildId },
                { $set: { userId: target.id, guildId } },
                { upsert: true }
            );

            client.bhWhitelist ||= new Map();
            if (!client.bhWhitelist.has(guildId)) {
                client.bhWhitelist.set(guildId, new Set());
            }
            client.bhWhitelist.get(guildId).add(target.id);

            return message.reply(`${target.tag} has been whitelisted for this server.`);
        }

        if (subcommand === 'remove') {
            const target = await resolveUser(message, args[1], client);
            if (!target) return message.reply('Please mention a user or provide a valid user ID.');

            await Whitelist.deleteOne({ userId: target.id, guildId });

            client.bhWhitelist ||= new Map();
            client.bhWhitelist.get(guildId)?.delete(target.id);

            return message.reply(`${target.tag} has been removed from this server's whitelist.`);
        }

        if (subcommand === 'list') {
            if (client.whitelistMode?.get(guildId) !== true) {
                return message.reply('Whitelist mode is currently disabled. Enable it first with `>>whitelistmode`.');
            }

            const entries = await Whitelist.find({ guildId }).sort({ userId: 1 });
            const description = entries.length
                ? entries.map(entry => `<@${entry.userId}>`).join('\n')
                : 'No users are currently whitelisted.';

            const embed = new EmbedBuilder()
                .setTitle(`${message.guild.name} Whitelist`)
                .setDescription(description)
                .setColor('#00FF00')
                .setFooter({ text: `${entries.length} user(s) whitelisted` })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        return message.reply('Usage: `>>whitelist add @user`, `>>whitelist remove @user`, `>>whitelist list`');
    }
};

async function resolveUser(message, arg, client) {
    const mentioned = message.mentions.users.first();
    if (mentioned) return mentioned;
    if (!arg) return null;

    const userId = arg.replace(/[<@!>]/g, '');
    return client.users.fetch(userId).catch(() => null);
}
