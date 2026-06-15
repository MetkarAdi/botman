const { EmbedBuilder } = require('discord.js');
const Whitelist = require('../../models/Whitelist');

module.exports = {
    name: 'whitelist',
    aliases: ['wl'],
    description: 'Manage the Bangalore-Hoods bot whitelist',
    usage: 'whitelist <add|remove|list> [@user]',
    category: 'owner',
    ownerOnly: true,
    guildOnly: false,
    cooldown: 5,

    async execute(message, args, client) {
        if (message.author.id !== process.env.OWNER_ID) {
            return message.reply('❌ Owner only.');
        }

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'add') {
            const target = await resolveUser(message, args[1], client);
            if (!target) return message.reply('❌ Please mention a user or provide a valid user ID.');

            await Whitelist.updateOne(
                { userId: target.id },
                { $set: { userId: target.id, guildId: process.env.BH_GUILD_ID } },
                { upsert: true }
            );

            client.bhWhitelist ||= new Set();
            client.bhWhitelist.add(target.id);

            return message.reply(`✅ ${target.tag} has been whitelisted for Bangalore-Hoods.`);
        }

        if (subcommand === 'remove') {
            const target = await resolveUser(message, args[1], client);
            if (!target) return message.reply('❌ Please mention a user or provide a valid user ID.');

            await Whitelist.deleteOne({ userId: target.id, guildId: process.env.BH_GUILD_ID });

            client.bhWhitelist ||= new Set();
            client.bhWhitelist.delete(target.id);

            return message.reply(`✅ ${target.tag} has been removed from the whitelist.`);
        }

        if (subcommand === 'list') {
            if (client.whitelistMode === false) {
                return message.reply('❌ Whitelist mode is currently disabled. Enable it first with `>>whitelistmode`.');
            }

            const entries = await Whitelist.find({ guildId: process.env.BH_GUILD_ID }).sort({ userId: 1 });
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
