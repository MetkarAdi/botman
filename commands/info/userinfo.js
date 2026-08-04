const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const { getUserBadges, formatDuration } = require('../../utils/helpers');
const Level = require('../../models/Level');
const Warning = require('../../models/Warning');

module.exports = {
    name: 'userinfo',
    aliases: ['ui', 'whois', 'user'],
    description: 'Get information about a user (works for users not in the server too!)',
    usage: 'userinfo [@user or user_id]',
    category: 'info',
    guildOnly: false,
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const arg = args.join(' ').trim();
        if (arg) {
            const member = resolveMember(message, arg);
            if (member) {
                args = [member.id];
            } else {
                const idMatch = arg.match(/^<@!?(\d+)>$/)?.[1] || (/^\d{17,20}$/.test(arg) ? arg : null);
                if (!idMatch) {
                    return message.reply('❌ Member not found. Try mentioning them, or providing their username, nickname, or ID.');
                }
                args = [idMatch];
            }
        }

        let target;
        let userId;
        let permissionsRow = null;
        let keyPermissions = [];

        // Try to get user from mention
        if (message.mentions.users.first()) {
            target = message.mentions.users.first();
            userId = target.id;
        }
        // Try to get user from ID
        else if (args[0]) {
            try {
                userId = args[0];
                target = await client.users.fetch(userId, { force: true });
            } catch (error) {
                return message.reply('❌ Could not find a user with that ID.');
            }
        }
        // Default to message author
        else {
            target = message.author;
            userId = target.id;
        }

        if (!target) {
            return message.reply('❌ Please mention a user or provide a valid user ID.');
        }

        // Force fetch to get banner and accent color
        try {
            target = await client.users.fetch(userId, { force: true });
        } catch (error) {
            console.error('Error force-fetching user:', error);
        }

        // Get member data if in guild
        const member = message.guild?.members.cache.get(target.id);

        // Get badges
        const badges = getUserBadges(target);

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(`👤 User Information - ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .setColor(member?.displayHexColor || '#00FFFF')
            .addFields(
                { name: '📝 Username', value: target.username, inline: true },
                { name: '🏷️ Discriminator', value: target.discriminator !== '0' ? `#${target.discriminator}` : 'None', inline: true },
                { name: '🆔 User ID', value: target.id, inline: true },
                { name: '🤖 Bot', value: target.bot ? 'Yes' : 'No', inline: true },
                { name: '🏅 Badges', value: badges.join('\n'), inline: false }
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        // Add account creation date
        const createdAt = Math.floor(target.createdTimestamp / 1000);
        embed.addFields({
            name: '📅 Account Created',
            value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`,
            inline: false
        });

        // If member is in the guild, add more info
        if (member) {
            const joinedAt = Math.floor(member.joinedTimestamp / 1000);
            embed.addFields({
                name: '📥 Joined Server',
                value: `<t:${joinedAt}:F> (<t:${joinedAt}:R>)`,
                inline: false
            });

            const memberFlags = member.flags?.toArray().join(', ') || 'None';
            embed.addFields(
                { name: 'Member Flags', value: memberFlags, inline: true },
                { name: 'Voice Channel', value: member.voice.channel?.name || 'Not in voice', inline: true }
            );

            if (member.communicationDisabledUntil && member.communicationDisabledUntil.getTime() > Date.now()) {
                const timeoutExpiresAt = member.communicationDisabledUntil.getTime();
                const timeoutTimestamp = Math.floor(timeoutExpiresAt / 1000);

                embed.addFields({
                    name: 'Timeout',
                    value: `Timed Out: Yes\nTimeout Expires: <t:${timeoutTimestamp}:F> (<t:${timeoutTimestamp}:R>)\nTime Remaining: ${formatDuration(timeoutExpiresAt - Date.now())}`,
                    inline: true
                });
            }

            if (member.pending) {
                embed.addFields({
                    name: 'Membership Gate',
                    value: '⚠️ Pending',
                    inline: true
                });
            }

            const guildAvatarURL = member.avatarURL({ dynamic: true, size: 256 });
            const globalAvatarURL = target.displayAvatarURL({ dynamic: true, size: 256 });
            if (guildAvatarURL && guildAvatarURL !== globalAvatarURL) {
                embed.addFields({
                    name: 'Server Avatar',
                    value: `[Click to view](${guildAvatarURL})`,
                    inline: true
                });
            }

            // Add roles
            const roles = member.roles.cache
                .filter(role => role.id !== message.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .slice(0, 10);

            if (roles.length > 0) {
                embed.addFields({
                    name: `🎭 Roles [${member.roles.cache.size - 1}]`,
                    value: roles.join(', ') || 'None',
                    inline: false
                });
            }

            // Add nickname
            if (member.nickname) {
                embed.addFields({
                    name: '🎭 Nickname',
                    value: member.nickname,
                    inline: true
                });
            }

            // Add presence info
            if (member.presence) {
                const status = member.presence.status;
                const statusEmojis = {
                    online: '🟢 Online',
                    idle: '🟡 Idle',
                    dnd: '🔴 Do Not Disturb',
                    offline: '⚫ Offline'
                };
                embed.addFields({
                    name: '📊 Status',
                    value: statusEmojis[status] || status,
                    inline: true
                });

                // Add activity
                const activity = member.presence.activities[0];
                if (activity) {
                    let activityText = activity.name;
                    if (activity.details) activityText += ` - ${activity.details}`;
                    if (activity.state) activityText += ` (${activity.state})`;
                    embed.addFields({
                        name: '🎮 Activity',
                        value: activityText,
                        inline: true
                    });
                }
            }

            // Add levelling info if enabled
            if (guildData?.levellingEnabled) {
                try {
                    const levelData = await Level.findOne({
                        userId: target.id,
                        guildId: message.guild.id
                    });

                    if (levelData) {
                        embed.addFields({
                            name: '⭐ Level Stats',
                            value: `Level: ${levelData.level}\nXP: ${levelData.xp}\nMessages: ${levelData.messages}`,
                            inline: true
                        });
                    }
                } catch (error) {
                    console.error('Error fetching level data:', error);
                }
            }

            // Add warning count if moderation is enabled
            if (guildData?.moderationEnabled) {
                try {
                    const warningCount = await Warning.countDocuments({
                        userId: target.id,
                        guildId: message.guild.id
                    });

                    if (warningCount > 0) {
                        embed.addFields({
                            name: '⚠️ Warnings',
                            value: `${warningCount}`,
                            inline: true
                        });
                    }
                } catch (error) {
                    console.error('Error fetching warning count:', error);
                }
            }

            // Add permissions
            keyPermissions = member.permissions.toArray().filter(perm =>
                ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'KickMembers', 'BanMembers', 'ManageMessages'].includes(perm)
            );

            if (keyPermissions.length > 0) {
                permissionsRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`whois_perms_${target.id}_${message.author.id}`)
                        .setLabel('View Permissions')
                        .setStyle(ButtonStyle.Secondary)
                );
            }
        } else {
            embed.setDescription('⚠️ This user is **not in this server**. Showing basic info only.');
        }

        // Show global banner if user has one (requires Nitro)
        const bannerURL = target.bannerURL({ dynamic: true, size: 1024 });
        if (bannerURL) {
            embed.setImage(bannerURL);
            embed.addFields({
                name: 'Global Banner',
                value: `[Click to view](${bannerURL})`,
                inline: true
            });
        }

        // Show accent color if no banner but has one set
        if (!bannerURL && target.accentColor) {
            embed.addFields({
                name: '🎨 Accent Color',
                value: `#${target.accentColor.toString(16).padStart(6, '0').toUpperCase()}`,
                inline: true
            });
        }

        const replyOptions = { embeds: [embed] };
        if (permissionsRow) {
            replyOptions.components = [permissionsRow];
        }

        const response = await message.reply(replyOptions);

        if (permissionsRow) {
            const collector = response.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async (interaction) => {
                if (interaction.customId !== `whois_perms_${target.id}_${message.author.id}`) return;

                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({
                        content: 'Only the person who ran this command can view these permissions.',
                        ephemeral: true
                    });
                }

                try {
                    return await interaction.reply({
                        content: ` **Key Permissions for ${target.username}:**\n${keyPermissions.join(', ')}`,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error replying with key permissions:', error);
                }
            });

            collector.on('end', async () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    ButtonBuilder.from(permissionsRow.components[0]).setDisabled(true)
                );

                await response.edit({
                    embeds: [embed],
                    components: [disabledRow]
                }).catch(() => null);
            });
        }
    }
};

function resolveMember(message, arg) {
    if (!message.guild || !arg) return null;

    const normalizedArg = arg.toLowerCase();
    const userId = arg.match(/^<@!?(\d+)>$/)?.[1] || arg;

    return message.mentions.members.first() ||
        message.guild.members.cache.get(userId) ||
        message.guild.members.cache.find(m => m.user.tag.toLowerCase() === normalizedArg) ||
        message.guild.members.cache.find(m => m.displayName.toLowerCase() === normalizedArg) ||
        message.guild.members.cache.find(m => m.displayName.toLowerCase().includes(normalizedArg)) ||
        message.guild.members.cache.find(m => m.user.username.toLowerCase().includes(normalizedArg)) ||
        null;
}
