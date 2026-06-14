const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'togglemoderation',
    aliases: ['togglemod', 'tm'],
    description: 'Toggle the moderation system on or off',
    usage: 'togglemoderation',
    category: 'settings',
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const canToggle = message.author.id === process.env.OWNER_ID ||
            message.member.permissions.has('ManageMessages');

        if (!canToggle) {
            return message.reply('❌ You need the **Manage Messages** permission to use this command.');
        }

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
