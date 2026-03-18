const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    aliases: ['av', 'pfp'],
    description: 'Get a user\'s avatar (works for users not in the server too!)',
    usage: 'avatar [@user or user_id]',
    category: 'utility',
    cooldown: 5,

    async execute(message, args, client) {
        let target;

        // Try to get user from mention
        if (message.mentions.users.first()) {
            target = message.mentions.users.first();
        }
        // Try to get user from ID
        else if (args[0]) {
            try {
                target = await client.users.fetch(args[0]);
            } catch (error) {
                return message.reply('❌ Could not find a user with that ID.');
            }
        }
        // Default to message author
        else {
            target = message.author;
        }

        if (!target) {
            return message.reply('❌ Please mention a user or provide a valid user ID.');
        }

        const avatarURL = target.displayAvatarURL({ dynamic: true, size: 4096 });

        const embed = new EmbedBuilder()
            .setTitle(`🖼️ Avatar - ${target.username}`)
            .setDescription(`[Download Avatar](${avatarURL})`)
            .setImage(avatarURL)
            .setColor('#00FFFF')
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
