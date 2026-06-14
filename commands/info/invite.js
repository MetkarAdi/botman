const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'invite',
    description: 'Get invite links for b0tman',
    usage: 'invite',
    category: 'info',
    cooldown: 5,

    async execute(message) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('Invite b0tman')
            .addFields(
                {
                    name: 'Recommended',
                    value: '[Click here](https://discord.com/oauth2/authorize?client_id=1483407311715438622&permissions=4503599627758656&integration_type=0&scope=bot+applications.commands) — All features, no admin perms',
                    inline: false
                },
                {
                    name: 'Administrator',
                    value: '[Click here](https://discord.com/oauth2/authorize?client_id=1483407311715438622&permissions=8&integration_type=0&scope=bot+applications.commands) — Full admin permissions',
                    inline: false
                }
            )
            .setFooter({ text: 'Choose the recommended invite unless you specifically need admin perms.' });

        return message.reply({ embeds: [embed] });
    }
};
