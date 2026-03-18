const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'deleterole',
    aliases: ['dr', 'removerole'],
    description: 'Delete a role',
    usage: 'deleterole <@role or role_id>',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ManageRoles'],
    botPermissions: ['ManageRoles'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) {
            return message.reply('❌ Please mention a role or provide a valid role ID.');
        }

        if (role.position >= message.guild.members.cache.get(client.user.id).roles.highest.position) {
            return message.reply('❌ I cannot delete a role that is higher than or equal to my highest role.');
        }

        if (role.managed) {
            return message.reply('❌ I cannot delete managed roles (bot roles, booster roles, etc.).');
        }

        try {
            const roleName = role.name;
            const roleColor = role.hexColor;

            await role.delete(`Deleted by ${message.author.tag}`);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Role Deleted')
                .setDescription(`Role **${roleName}** has been deleted.`)
                .addFields(
                    { name: '📝 Name', value: roleName, inline: true },
                    { name: '🎨 Color', value: roleColor, inline: true },
                    { name: '👮 Deleted By', value: message.author.tag, inline: true }
                )
                .setColor('#FF0000')
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error deleting role:', error);
            message.reply('❌ An error occurred while deleting the role.');
        }
    }
};
