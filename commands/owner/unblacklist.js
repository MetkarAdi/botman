const { EmbedBuilder } = require('discord.js');
const AccessList = require('../../models/AccessList');

module.exports = {
    name: 'unblacklist',
    aliases: ['unbl', 'removeblacklist'],
    description: 'Remove a user from the blacklist (Owner Only)',
    usage: 'unblacklist <@user or user_id>',
    category: 'owner',
    ownerOnly: true,
    guildOnly: false,
    cooldown: 5,

    async execute(message, args, client) {
        if (!args[0]) {
            return message.reply('❌ Please mention a user or provide a user ID to remove from the blacklist.');
        }

        // Get target user
        let target;
        if (message.mentions.users.first()) {
            target = message.mentions.users.first();
        } else {
            try {
                target = await client.users.fetch(args[0]);
            } catch (error) {
                return message.reply('❌ Could not find a user with that ID.');
            }
        }

        if (!target) {
            return message.reply('❌ Please mention a user or provide a valid user ID.');
        }

        // Check if blacklisted
        const existing = await AccessList.findOne({ userId: target.id, type: 'blacklist' });
        if (!existing) {
            return message.reply(`❌ **${target.tag}** is not blacklisted.`);
        }

        try {
            await AccessList.deleteOne({ userId: target.id, type: 'blacklist' });

            const embed = new EmbedBuilder()
                .setTitle('✅ User Removed from Blacklist')
                .setDescription(`**${target.tag}** has been removed from the blacklist.`)
                .addFields(
                    { name: '👤 User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: '👮 Removed By', value: message.author.tag, inline: true }
                )
                .setColor('#00FF00')
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error removing user from blacklist:', error);
            message.reply('❌ An error occurred while removing the user from the blacklist.');
        }
    }
};
