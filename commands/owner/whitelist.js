const { EmbedBuilder } = require('discord.js');
const AccessList = require('../../models/AccessList');

module.exports = {
    name: 'whitelist',
    aliases: ['wl'],
    description: 'Whitelist a user to use moderation commands (Owner Only)',
    usage: 'whitelist <@user or user_id> [reason]',
    category: 'owner',
    ownerOnly: true,
    guildOnly: false,
    cooldown: 5,

    async execute(message, args, client) {
        if (!args[0]) {
            // Show all whitelisted users
            const whitelist = await AccessList.find({ type: 'whitelist' });

            if (whitelist.length === 0) {
                return message.reply('📋 No users are currently whitelisted.');
            }

            const list = await Promise.all(whitelist.map(async (entry, index) => {
                const user = await client.users.fetch(entry.userId).catch(() => null);
                return `**${index + 1}.** ${user ? `${user.tag}` : entry.userId}\n> Reason: ${entry.reason}\n> By: ${entry.addedBy}`;
            }));

            const embed = new EmbedBuilder()
                .setTitle('📋 Whitelisted Users')
                .setDescription(list.join('\n\n'))
                .setColor('#00FF00')
                .setFooter({ text: `${whitelist.length} user(s) whitelisted` })
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

        // Check if already whitelisted
        const existing = await AccessList.findOne({ userId: target.id, type: 'whitelist' });
        if (existing) {
            return message.reply(`❌ **${target.tag}** is already whitelisted.`);
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            const whitelist = new AccessList({
                userId: target.id,
                type: 'whitelist',
                reason: reason,
                addedBy: message.author.tag
            });

            await whitelist.save();

            const embed = new EmbedBuilder()
                .setTitle('✅ User Whitelisted')
                .setDescription(`**${target.tag}** has been whitelisted.`)
                .addFields(
                    { name: '👤 User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: '📝 Reason', value: reason, inline: true },
                    { name: '👮 Whitelisted By', value: message.author.tag, inline: true }
                )
                .setColor('#00FF00')
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error whitelisting user:', error);
            message.reply('❌ An error occurred while whitelisting the user.');
        }
    }
};
