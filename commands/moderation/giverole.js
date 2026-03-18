const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'giverole',
    aliases: ['addrole', 'gr'],
    description: 'Give a role to a user',
    usage: 'giverole @user @role',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ManageRoles'],
    botPermissions: ['ManageRoles'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply('❌ Please mention a user to give the role to.');
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!role) {
            return message.reply('❌ Please mention a role or provide a valid role ID.');
        }

        if (role.position >= message.guild.members.cache.get(client.user.id).roles.highest.position) {
            return message.reply('❌ I cannot give a role that is higher than or equal to my highest role.');
        }

        if (target.roles.cache.has(role.id)) {
            return message.reply(`❌ **${target.user.tag}** already has the role **${role.name}**.`);
        }

        try {
            await target.roles.add(role, `Given by ${message.author.tag}`);

            const embed = new EmbedBuilder()
                .setTitle('✅ Role Given')
                .setDescription(`Role **${role.name}** has been given to **${target.user.tag}**.`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: '🎭 Role', value: role.name, inline: true },
                    { name: '👮 Given By', value: message.author.tag, inline: true }
                )
                .setColor(role.color || '#00FF00')
                .setTimestamp()
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }));

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error giving role:', error);
            message.reply('❌ An error occurred while giving the role.');
        }
    }
};
