const { EmbedBuilder } = require('discord.js');
const AccessList = require('../../models/AccessList');

module.exports = {
    name: 'blacklist',
    aliases: ['bl', 'banuser'],
    description: 'Blacklist a user from using the bot (Owner Only)',
    usage: 'blacklist <@user or user_id> [reason]',
    category: 'owner',
    ownerOnly: true,
    guildOnly: false,
    cooldown: 5,

    async execute(message, args, client) {
        if (!args[0]) {
            // Show all blacklisted users
            const blacklist = await AccessList.find({ type: 'blacklist' });

            if (blacklist.length === 0) {
                return message.reply('📋 No users are currently blacklisted.');
            }

            const list = await Promise.all(blacklist.map(async (entry, index) => {
                const user = await client.users.fetch(entry.userId).catch(() => null);
                return `**${index + 1}.** ${user ? `${user.tag}` : entry.userId}\n> Reason: ${entry.reason}\n> By: ${entry.addedBy}`;
            }));

            const embed = new EmbedBuilder()
                .setTitle('📋 Blacklisted Users')
                .setDescription(list.join('\n\n'))
                .setColor('#FF0000')
                .setFooter({ text: `${blacklist.length} user(s) blacklisted` })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
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

        // Prevent blacklisting the owner
        if (target.id === client.config.ownerId) {
            return message.reply('❌ You cannot blacklist the bot owner!');
        }

        // Prevent blacklisting yourself
        if (target.id === message.author.id) {
            return message.reply('❌ You cannot blacklist yourself!');
        }

        // Check if already blacklisted
        const existing = await AccessList.findOne({ userId: target.id, type: 'blacklist' });
        if (existing) {
            return message.reply(`❌ **${target.tag}** is already blacklisted.`);
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            const blacklist = new AccessList({
                userId: target.id,
                type: 'blacklist',
                reason: reason,
                addedBy: message.author.tag
            });

            await blacklist.save();

            const embed = new EmbedBuilder()
                .setTitle('🚫 User Blacklisted')
                .setDescription(`**${target.tag}** has been blacklisted from using the bot.`)
                .addFields(
                    { name: '👤 User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: '📝 Reason', value: reason, inline: true },
                    { name: '👮 Blacklisted By', value: message.author.tag, inline: true }
                )
                .setColor('#FF0000')
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error blacklisting user:', error);
            message.reply('❌ An error occurred while blacklisting the user.');
        }
    }
};
