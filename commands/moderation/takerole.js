const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'takerole',
    aliases: ['removerole', 'tr'],
    description: 'Remove a role from a user',
    usage: 'takerole @user @role',
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
            return message.reply('❌ Please mention a user to remove the role from.');
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!role) {
            return message.reply('❌ Please mention a role or provide a valid role ID.');
        }

        if (role.position >= message.guild.members.cache.get(client.user.id).roles.highest.position) {
            return message.reply('❌ I cannot remove a role that is higher than or equal to my highest role.');
        }

        if (!target.roles.cache.has(role.id)) {
            return message.reply(`❌ **${target.user.tag}** does not have the role **${role.name}**.`);
        }

        try {
            await target.roles.remove(role, `Removed by ${message.author.tag}`);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Role Removed')
                .setDescription(`Role **${role.name}** has been removed from **${target.user.tag}**.`)
                .addFields(
                    { name: '👤 User', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: '🎭 Role', value: role.name, inline: true },
                    { name: '👮 Removed By', value: message.author.tag, inline: true }
                )
                .setColor('#FF0000')
                .setTimestamp()
                .setThumbnail(target.user.displayAvatarURL({ dynamic: true }));

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error removing role:', error);
            message.reply('❌ An error occurred while removing the role.');
        }
    }
};
