const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'userinfo',
    aliases: ['ui', 'whois', 'user'],
    description: 'Get information about a user (works for users not in the server too!)',
    usage: 'userinfo [@user or user_id]',
    category: 'info',
    guildOnly: false,
    cooldown: 5,

    async execute(message, args, client) {
        const userId = getUserId(message, args);

        if (!userId) {
            return message.reply('❌ Please mention a user or provide a valid user ID.');
        }

        let user;
        try {
            user = await client.users.fetch(userId, {
                force: true,
                cache: true
            });
        } catch (error) {
            if (isUnknownUserError(error)) {
                return message.reply(`❌ Unknown user: \`${userId}\`.`);
            }

            console.error('Error fetching user:', error);
            return message.reply('❌ Could not fetch that user.');
        }

        const member = message.guild
            ? await message.guild.members.fetch({ user: user.id, force: true, cache: true }).catch(() => null)
            : null;

        return message.reply({ embeds: [buildUserInfoEmbed(user, member, message)] });
    }
};

function getUserId(message, args) {
    const arg = args.join(' ').trim();
    const mentionId = message.mentions.users.first()?.id || arg.match(/^<@!?(\d{17,20})>$/)?.[1];

    if (mentionId) {
        return mentionId;
    }

    if (/^\d{17,20}$/.test(arg)) {
        return arg;
    }

    if (!arg) {
        return message.author.id;
    }

    return null;
}

function buildUserInfoEmbed(user, member, message) {
    const avatarURL = user.displayAvatarURL({ size: 256 });
    const bannerURL = user.bannerURL({ size: 1024 });
    const embed = new EmbedBuilder()
        .setTitle(`User Information - ${user.username}`)
        .setThumbnail(avatarURL)
        .setColor(member?.displayHexColor || user.hexAccentColor || '#00FFFF')
        .addFields(
            { name: 'Username', value: formatValue(user.username), inline: true },
            { name: 'Global Name', value: formatValue(user.globalName), inline: true },
            { name: 'User ID', value: user.id, inline: true },
            { name: 'Avatar URL', value: avatarURL ? `[Click to view](${avatarURL})` : 'None', inline: false },
            { name: 'Banner URL', value: bannerURL ? `[Click to view](${bannerURL})` : 'None', inline: false },
            { name: 'Accent Color', value: formatAccentColor(user), inline: true },
            { name: 'Created', value: formatTimestamp(user.createdTimestamp), inline: false },
            { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
            { name: 'System', value: user.system ? 'Yes' : 'No', inline: true }
        )
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

    if (bannerURL) {
        embed.setImage(bannerURL);
    }

    if (member) {
        embed.addFields(
            { name: 'Nickname', value: formatValue(member.nickname), inline: true },
            { name: 'Joined Server', value: formatTimestamp(member.joinedTimestamp), inline: false },
            { name: 'Boost Status', value: member.premiumSinceTimestamp ? `Boosting since ${formatTimestamp(member.premiumSinceTimestamp)}` : 'Not boosting', inline: false },
            { name: `Roles [${Math.max(member.roles.cache.size - 1, 0)}]`, value: formatRoles(member), inline: false },
            { name: 'Permissions', value: formatPermissions(member), inline: false }
        );
    } else {
        embed.setDescription('This user is not a member of this server. Showing global user information only.');
    }

    return embed;
}

function formatRoles(member) {
    const roles = member.roles.cache
        .filter((role) => role.id !== member.guild.id)
        .sort((a, b) => b.position - a.position)
        .map((role) => role.toString());

    return truncate(roles.join(', ') || 'None');
}

function formatPermissions(member) {
    return truncate(member.permissions.toArray().join(', ') || 'None');
}

function formatTimestamp(timestamp) {
    if (!timestamp) {
        return 'N/A';
    }

    const unix = Math.floor(timestamp / 1000);
    return `<t:${unix}:F> (<t:${unix}:R>)`;
}

function formatAccentColor(user) {
    if (user.hexAccentColor) {
        return user.hexAccentColor.toUpperCase();
    }

    if (typeof user.accentColor === 'number') {
        return `#${user.accentColor.toString(16).padStart(6, '0').toUpperCase()}`;
    }

    return 'None';
}

function formatValue(value) {
    return value === null || value === undefined || value === '' ? 'None' : String(value);
}

function truncate(value, maxLength = 1024) {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
}

function isUnknownUserError(error) {
    return error?.code === 10013 ||
        error?.status === 404 ||
        String(error?.message || '').toLowerCase().includes('unknown user');
}
