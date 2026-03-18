const { EmbedBuilder } = require('discord.js');
const AccessList = require('../../models/AccessList');

module.exports = {
    name: 'unwhitelist',
    aliases: ['unwl', 'removewhitelist'],
    description: 'Remove a user from the whitelist (Owner Only)',
    usage: 'unwhitelist <@user or user_id>',
    category: 'owner',
    ownerOnly: true,
    guildOnly: false,
    cooldown: 5,

    async execute(message, args, client) {
        if (!args[0]) {
            return message.reply('❌ Please mention a user or provide a user ID to remove from the whitelist.');
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

        // Check if whitelisted
        const existing = await AccessList.findOne({ userId: target.id, type: 'whitelist' });
        if (!existing) {
            return message.reply(`❌ **${target.tag}** is not whitelisted.`);
        }

        try {
            await AccessList.deleteOne({ userId: target.id, type: 'whitelist' });

            const embed = new EmbedBuilder()
                .setTitle('🗑️ User Removed from Whitelist')
                .setDescription(`**${target.tag}** has been removed from the whitelist.`)
                .addFields(
                    { name: '👤 User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: '👮 Removed By', value: message.author.tag, inline: true }
                )
                .setColor('#FF0000')
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error removing user from whitelist:', error);
            message.reply('❌ An error occurred while removing the user from the whitelist.');
        }
    }
};
