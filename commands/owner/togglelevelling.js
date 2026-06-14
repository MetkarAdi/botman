const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'togglelevelling',
    aliases: ['togglelevel', 'tl'],
    description: 'Toggle the levelling system on or off',
    usage: 'togglelevelling',
    category: 'settings',
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const canToggle = message.author.id === process.env.OWNER_ID ||
            message.member.permissions.has('ManageMessages');

        if (!canToggle) {
            return message.reply('❌ You need the **Manage Messages** permission to use this command.');
        }

        guildData.levellingEnabled = !guildData.levellingEnabled;
        await guildData.save();

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Levelling System Toggle')
            .setDescription(`Levelling system has been **${guildData.levellingEnabled ? 'ENABLED' : 'DISABLED'}**`)
            .setColor(guildData.levellingEnabled ? '#00FF00' : '#FF0000')
            .setTimestamp()
            .setFooter({ text: `Changed by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    }
};
