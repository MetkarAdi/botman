const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'setnick',
    aliases: ['nickname', 'nn'],
    description: "Change a mentioned user's nickname",
    usage: 'setnick @user <nickname|reset>',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ManageNicknames'],
    botPermissions: ['ManageNicknames'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Please mention a user.');

        if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.reply('❌ You cannot change the nickname of someone with an equal or higher role.');
        }

        if (!target.manageable) {
            return message.reply('❌ I cannot change this user\'s nickname — they may have a higher role than me.');
        }

        const reset = args[1]?.toLowerCase() === 'reset';
        const newNick = reset ? null : args.slice(1).join(' ');

        if (!reset && !newNick) {
            return message.reply('❌ Provide a new nickname or `reset` to remove it.');
        }

        if (newNick && newNick.length > 32) {
            return message.reply('❌ Nicknames cannot be longer than 32 characters.');
        }

        const oldNick = target.nickname || target.user.username;
        await target.setNickname(newNick, `Changed by ${message.author.tag}`);

        const embed = new EmbedBuilder()
            .setTitle('✏️ Nickname Changed')
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 User', value: `${target.user.tag}`, inline: true },
                { name: '📝 Old Nick', value: oldNick, inline: true },
                { name: '✏️ New Nick', value: newNick || target.user.username, inline: true },
                { name: '👮 Changed By', value: message.author.tag, inline: true }
            )
            .setColor('#00BFFF')
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};