const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'createrole',
    aliases: ['cr', 'newrole'],
    description: 'Create a new role',
    usage: 'createrole <name> [color] [hoist]',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ManageRoles'],
    botPermissions: ['ManageRoles'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        if (!guildData.moderationEnabled) {
            return message.reply('❌ The moderation system is currently disabled.');
        }

        const roleName = args[0];
        if (!roleName) {
            return message.reply('❌ Please provide a name for the role.');
        }

        const color = args[1] || null;
        const hoist = args[2]?.toLowerCase() === 'true' || false;

        try {
            const role = await message.guild.roles.create({
                name: roleName,
                color: color,
                hoist: hoist,
                reason: `Created by ${message.author.tag}`
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Role Created')
                .setDescription(`Role **${role.name}** has been created successfully.`)
                .addFields(
                    { name: '📝 Name', value: role.name, inline: true },
                    { name: '🎨 Color', value: role.hexColor, inline: true },
                    { name: '📌 Hoisted', value: hoist ? 'Yes' : 'No', inline: true },
                    { name: '🆔 Role ID', value: role.id, inline: true }
                )
                .setColor(role.color || '#00FF00')
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error creating role:', error);
            message.reply('❌ An error occurred while creating the role. Make sure the color is valid (hex code).');
        }
    }
};
