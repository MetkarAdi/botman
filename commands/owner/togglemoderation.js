const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'togglemoderation',
    aliases: ['togglemod', 'tm'],
    description: 'Toggle the moderation system on or off (Owner Only)',
    usage: 'togglemoderation',
    category: 'owner',
    ownerOnly: true,
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client, guildData) {
        guildData.moderationEnabled = !guildData.moderationEnabled;
        await guildData.save();

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Moderation System Toggle')
            .setDescription(`Moderation system has been **${guildData.moderationEnabled ? 'ENABLED' : 'DISABLED'}**`)
            .setColor(guildData.moderationEnabled ? '#00FF00' : '#FF0000')
            .setTimestamp()
            .setFooter({ text: `Changed by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    }
};
