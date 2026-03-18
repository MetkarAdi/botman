const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'togglelevelling',
    aliases: ['togglelevel', 'tl'],
    description: 'Toggle the levelling system on or off (Owner Only)',
    usage: 'togglelevelling',
    category: 'owner',
    ownerOnly: true,
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client, guildData) {
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
