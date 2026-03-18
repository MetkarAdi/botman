const { EmbedBuilder } = require('discord.js');
const Afk = require('../../models/Afk');

module.exports = {
    name: 'afk',
    aliases: ['away'],
    description: 'Set your AFK status. Bot will notify others when you are mentioned.',
    usage: 'afk [reason]',
    category: 'utility',
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const reason = args.join(' ') || 'AFK';

        // Check if already AFK — if so, remove it manually
        const existing = await Afk.findOne({ userId: message.author.id, guildId: message.guild.id });
        if (existing) {
            await Afk.deleteOne({ userId: message.author.id, guildId: message.guild.id });
            return message.reply('✅ Your AFK status has been removed.');
        }

        await Afk.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { reason, timestamp: new Date() },
            { upsert: true, new: true }
        );

        // Try to update nickname to show AFK
        try {
            const currentNick = message.member.nickname || message.author.username;
            if (currentNick.length + 6 <= 32) {
                await message.member.setNickname(`[AFK] ${currentNick}`);
            }
        } catch { /* Missing permissions — fine */ }

        const embed = new EmbedBuilder()
            .setDescription(`💤 **${message.author.username}** is now AFK: ${reason}`)
            .setColor('#808080')
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};