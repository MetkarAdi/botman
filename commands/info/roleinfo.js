const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'roleinfo',
    aliases: ['ri'],
    description: 'Shows information about a role',
    usage: 'roleinfo <@role or role name>',
    category: 'info',
    guildOnly: true,

    async execute(message, args) {
        const query = args.join(' ').toLowerCase();
        const role = message.mentions.roles.first() ||
            message.guild.roles.cache.find(r => r.name.toLowerCase() === query);

        if (!role) {
            return message.reply('Role not found. Mention a role or provide its exact name.');
        }

        const embed = buildRoleInfoEmbed(role);
        return message.reply({ embeds: [embed] });
    }
};

function buildRoleInfoEmbed(role) {
    const onlineStatuses = new Set(['online', 'idle', 'dnd']);
    const onlineCount = role.members.filter(member => onlineStatuses.has(member.presence?.status)).size;
    const totalCount = role.members.size;

    return new EmbedBuilder()
        .setTitle(`Role Information - ${role.name}`)
        .setColor(role.hexColor)
        .addFields(
            { name: 'Name', value: role.name, inline: true },
            { name: 'Members', value: `${onlineCount} / ${totalCount}`, inline: true },
            { name: 'Color', value: role.hexColor, inline: true },
            { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:D>`, inline: true },
            { name: 'Role ID', value: role.id, inline: true },
            { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
            { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
            { name: 'Position', value: `${role.position}`, inline: true }
        )
        .setTimestamp();
}
