const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'nick',
    aliases: ['botnick', 'setbotnick'],
    description: "Change the bot's own nickname",
    usage: 'nick <nickname|reset>',
    category: 'utility',
    guildOnly: true,
    permissions: ['ManageNicknames'],
    botPermissions: ['ChangeNickname'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!args[0]) return message.reply('❌ Provide a new nickname or `reset`.');

        const reset = args[0].toLowerCase() === 'reset';
        const newNick = reset ? null : args.join(' ');

        if (newNick && newNick.length > 32) {
            return message.reply('❌ Nicknames cannot be longer than 32 characters.');
        }

        const botMember = message.guild.members.me;
        const oldNick = botMember.nickname || client.user.username;

        await botMember.setNickname(newNick, `Changed by ${message.author.tag}`);

        const embed = new EmbedBuilder()
            .setDescription(`✅ Bot nickname ${reset ? 'reset' : `changed to **${newNick}**`} (was **${oldNick}**)`)
            .setColor('#00FF00')
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};