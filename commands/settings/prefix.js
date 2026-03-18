const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'prefix',
    aliases: ['px', 'setprefix'],
    description: 'View or change the server prefix',
    usage: 'prefix [new_prefix]',
    category: 'settings',
    guildOnly: true,
    permissions: ['ManageGuild'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const currentPrefix = guildData.prefix || client.config.defaultPrefix;

        // If no new prefix provided, show current
        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('🔤 Prefix')
                .setDescription(`Current prefix for this server: \`${currentPrefix}\``)
                .setColor('#00FFFF')
                .setFooter({ text: `Use ${currentPrefix}prefix <new_prefix> to change` })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // Change prefix
        const newPrefix = args[0];

        if (newPrefix.length > 5) {
            return message.reply('❌ Prefix cannot be longer than 5 characters.');
        }

        guildData.prefix = newPrefix;
        await guildData.save();

        const embed = new EmbedBuilder()
            .setTitle('✅ Prefix Changed')
            .setDescription(`Server prefix has been changed to: \`${newPrefix}\``)
            .setColor('#00FF00')
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};