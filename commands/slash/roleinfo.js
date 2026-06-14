const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Shows information about a role')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('Role to inspect')
                .setRequired(true)
        ),
    category: 'info',

    async execute(interaction) {
        const role = interaction.options.getRole('role', true);
        const embed = buildRoleInfoEmbed(role);
        return interaction.reply({ embeds: [embed] });
    }
};

function buildRoleInfoEmbed(role) {
    const onlineStatuses = new Set(['online', 'idle', 'dnd']);
    const onlineCount = role.members.filter(member => onlineStatuses.has(member.presence?.status)).size;
    const totalCount = role.members.size;
    const permissions = role.permissions.toArray().slice(0, 10).join(', ') || 'None';
    const type = getRoleType(role);

    return new EmbedBuilder()
        .setTitle(`Role Information - ${role.name}`)
        .setColor(role.hexColor)
        .addFields(
            { name: 'Name', value: role.name, inline: true },
            { name: 'Members', value: `${onlineCount} / ${totalCount}`, inline: true },
            { name: 'Color', value: role.hexColor, inline: true },
            { name: 'Role Emoji', value: role.unicodeEmoji || 'None', inline: true },
            { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:D>`, inline: true },
            { name: 'Role ID', value: role.id, inline: true },
            { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
            { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
            { name: 'Position', value: `${role.position}`, inline: true },
            { name: 'Permissions', value: permissions, inline: false },
            { name: 'Managed', value: role.managed ? 'Yes' : 'No', inline: true },
            { name: 'Type', value: type, inline: true }
        )
        .setTimestamp();
}

function getRoleType(role) {
    if (role.tags?.botId) return 'Bot Role';
    if (role.tags?.integrationId) return 'Integration Role';
    if (role.tags?.premiumSubscriberRole !== undefined) return 'Boost Role';
    return 'Regular';
}
