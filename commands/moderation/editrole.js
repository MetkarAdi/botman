const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'editrole',
    aliases: ['er', 'modifyrole', 'roleedit'],
    description: 'Edit a role — name, color, hoist, mentionable, permissions',
    usage: 'editrole @role <property> <value>',
    category: 'moderation',
    guildOnly: true,
    permissions: ['ManageRoles'],
    botPermissions: ['ManageRoles'],
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const role = message.mentions.roles.first();
        if (!role) {
            return message.reply([
                '❌ Please mention a role.',
                '',
                '**Usage:** `editrole @role <property> <value>`',
                '',
                '**Properties:**',
                '`name <new name>` — rename the role',
                '`color <hex|colorname>` — set color (e.g. `#FF0000`, `red`, `blue`)',
                '`hoist <on|off>` — show separately in member list',
                '`mentionable <on|off>` — allow @mentioning',
                '`icon <emoji>` — set role icon (requires level 2 boost)',
            ].join('\n'));
        }

        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply('❌ I cannot edit a role that is higher than or equal to my highest role.');
        }

        if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.reply('❌ You cannot edit a role equal to or higher than your own highest role.');
        }

        const property = args[1]?.toLowerCase();
        const value = args.slice(2).join(' ');

        if (!property || !value) {
            return message.reply('❌ Provide a property and value. E.g. `editrole @role color #FF5500`');
        }

        const changes = {};
        let displayValue = value;

        switch (property) {
            case 'name':
                if (value.length > 100) return message.reply('❌ Role name cannot exceed 100 characters.');
                changes.name = value;
                break;

            case 'color':
            case 'colour': {
                // Accept hex or named colors
                const namedColors = {
                    red: '#FF0000', blue: '#0000FF', green: '#00FF00', yellow: '#FFFF00',
                    purple: '#800080', orange: '#FF8C00', pink: '#FF69B4', white: '#FFFFFF',
                    black: '#000000', cyan: '#00FFFF', teal: '#008080', gold: '#FFD700',
                    silver: '#C0C0C0', lime: '#00FF00', magenta: '#FF00FF', navy: '#000080',
                    indigo: '#4B0082', violet: '#EE82EE', coral: '#FF7F50', none: '#000000'
                };

                let hex = namedColors[value.toLowerCase()] || value;
                if (!hex.startsWith('#')) hex = `#${hex}`;
                if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    return message.reply('❌ Invalid color. Use a hex code like `#FF5500` or a color name like `red`.');
                }
                changes.color = hex;
                displayValue = hex;
                break;
            }

            case 'hoist': {
                const val = value.toLowerCase();
                if (!['on', 'off', 'true', 'false', 'yes', 'no'].includes(val)) {
                    return message.reply('❌ Use `on` or `off` for hoist.');
                }
                changes.hoist = ['on', 'true', 'yes'].includes(val);
                displayValue = changes.hoist ? 'Enabled' : 'Disabled';
                break;
            }

            case 'mentionable': {
                const val = value.toLowerCase();
                if (!['on', 'off', 'true', 'false', 'yes', 'no'].includes(val)) {
                    return message.reply('❌ Use `on` or `off` for mentionable.');
                }
                changes.mentionable = ['on', 'true', 'yes'].includes(val);
                displayValue = changes.mentionable ? 'Enabled' : 'Disabled';
                break;
            }

            default:
                return message.reply(`❌ Unknown property \`${property}\`. Valid: \`name\`, \`color\`, \`hoist\`, \`mentionable\``);
        }

        try {
            await role.edit({ ...changes, reason: `Edited by ${message.author.tag}` });

            const embed = new EmbedBuilder()
                .setTitle('🎨 Role Updated')
                .addFields(
                    { name: '🎭 Role', value: `${role}`, inline: true },
                    { name: '✏️ Property', value: property, inline: true },
                    { name: '📝 New Value', value: displayValue, inline: true },
                    { name: '👮 Edited By', value: message.author.tag, inline: true }
                )
                .setColor(role.hexColor || '#00BFFF')
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('editrole error:', error);
            message.reply('❌ Failed to edit role. Check my permissions and role hierarchy.');
        }
    }
};