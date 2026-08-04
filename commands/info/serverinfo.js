const { EmbedBuilder, ChannelType } = require('discord.js');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
    name: 'serverinfo',
    aliases: ['si', 'guildinfo', 'server'],
    description: 'Get information about the server',
    usage: 'serverinfo',
    category: 'info',
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client, guildData) {
        const target = args[0];
        if (target) {
            try {
                await client.guilds.fetch(target, { force: true });
                const guild = await client.guilds.fetch({ guild: target, force: true });
                await guild.members.fetch();
                await guild.channels.fetch();

                const embed = buildFullGuildEmbed(guild);
                return message.reply({ embeds: [embed] });
            } catch (error) {
                try {
                    const inviteCode = parseInviteCode(target);
                    const invite = await client.fetchInvite(inviteCode, { withCounts: true });
                    const embed = buildInviteGuildEmbed(invite);
                    return message.reply({ embeds: [embed] });
                } catch (inviteError) {
                    return message.reply('\u274C Could not find any server with that ID or invite code.');
                }
            }
        }

        let guild = message.guild;
        guild = await guild.fetch();
        const vanity = await guild.fetchVanityData().catch(() => null);

        // Count channel types
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const forumChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size;
        const announcementChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size;
        const stageChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size;

        // Count members
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = totalMembers - botCount;

        // Count roles (excluding @everyone)
        const roleCount = guild.roles.cache.size - 1;

        // Count emojis
        const emojiCount = guild.emojis.cache.size;
        const animatedEmojis = guild.emojis.cache.filter(e => e.animated).size;
        const staticEmojis = emojiCount - animatedEmojis;

        // Count boosts
        const boostCount = guild.premiumSubscriptionCount;
        const boostLevel = guild.premiumTier;

        // Get verification level
        const verificationLevels = {
            0: 'None',
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Very High'
        };

        // Get explicit content filter
        const contentFilters = {
            0: 'Disabled',
            1: 'Members without roles',
            2: 'All members'
        };

        // Get default notifications
        const defaultNotifications = {
            0: 'All messages',
            1: 'Only @mentions'
        };

        return message.reply({ embeds: [buildFullGuildEmbed(guild, vanity)] });

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(`📊 Server Information - ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .setColor('#00FFFF')
            .addFields(
                { name: '📝 Name', value: guild.name, inline: true },
                { name: '🆔 Server ID', value: guild.id, inline: true },
                { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false }
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        // Add server description if available
        if (guild.description) {
            embed.addFields({ name: '📄 Description', value: guild.description, inline: false });
        }

        // Add member stats
        embed.addFields({
            name: '👥 Members',
            value: `Total: ${formatNumber(totalMembers)}\nHumans: ${formatNumber(humanCount)}\nBots: ${formatNumber(botCount)}`,
            inline: true
        });

        // Add channel stats
        embed.addFields({
            name: '📺 Channels',
            value: `Text: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categoryChannels}\nForums: ${forumChannels}\nAnnouncements: ${announcementChannels}\nStage: ${stageChannels}`,
            inline: true
        });

        // Add other stats
        embed.addFields({
            name: '📊 Other Stats',
            value: `Roles: ${roleCount}\nEmojis: ${emojiCount} (${staticEmojis} static, ${animatedEmojis} animated)`,
            inline: true
        });

        // Add boost info
        embed.addFields({
            name: '💎 Boosts',
            value: `Level: ${boostLevel}\nBoosts: ${boostCount}`,
            inline: true
        });

        // Add security settings
        embed.addFields({
            name: '🔒 Security',
            value: `Verification: ${verificationLevels[guild.verificationLevel]}\nContent Filter: ${contentFilters[guild.explicitContentFilter]}\nNotifications: ${defaultNotifications[guild.defaultMessageNotifications]}`,
            inline: true
        });

        embed.addFields(
            {
                name: 'AFK Channel',
                value: guild.afkChannel ? `${guild.afkChannel.name} (${guild.afkTimeout / 60} mins)` : 'None',
                inline: true
            },
            { name: 'NSFW Level', value: `${guild.nsfwLevel}`, inline: true },
            {
                name: 'Default Notifications',
                value: guild.defaultMessageNotifications === 0 ? 'All Messages' : 'Only Mentions',
                inline: true
            },
            { name: 'Rules Channel', value: guild.rulesChannel?.toString() || 'None', inline: true },
            { name: 'System Channel', value: guild.systemChannel?.toString() || 'None', inline: true },
            { name: 'Max Members', value: guild.maximumMembers?.toLocaleString() || 'Unknown', inline: true },
            { name: 'Scheduled Events', value: `${guild.scheduledEvents.cache.size}`, inline: true },
            { name: 'Stickers', value: `${guild.stickers.cache.size}`, inline: true },
            { name: 'Verified', value: guild.verified ? '✅ Yes' : 'No', inline: true },
            { name: 'Partnered', value: guild.partnered ? 'Yes' : 'No', inline: true },
            { name: 'Boost Bar', value: guild.premiumProgressBarEnabled ? 'Enabled' : 'Disabled', inline: true }
        );

        if (vanity) {
            embed.addFields({
                name: 'Vanity Uses',
                value: `${vanity.uses}`,
                inline: true
            });
        }

        // Add features if any
        if (guild.features.length > 0) {
            const featureEmojis = {
                'ANIMATED_BANNER': '🎨 Animated Banner',
                'ANIMATED_ICON': '🖼️ Animated Icon',
                'APPLICATION_COMMAND_PERMISSIONS_V2': '⚙️ App Command Perms V2',
                'AUTO_MODERATION': '🤖 Auto Moderation',
                'BANNER': '🎨 Banner',
                'COMMUNITY': '👥 Community',
                'CREATOR_MONETIZABLE_PROVISIONAL': '💰 Creator Monetizable',
                'CREATOR_STORE_PAGE': '🏪 Creator Store Page',
                'DEVELOPER_SUPPORT_SERVER': '🛠️ Dev Support Server',
                'DISCOVERABLE': '🔍 Discoverable',
                'FEATURABLE': '⭐ Featurable',
                'INVITES_DISABLED': '🚫 Invites Disabled',
                'INVITE_SPLASH': '💦 Invite Splash',
                'MEMBER_VERIFICATION_GATE_ENABLED': '✅ Member Verification',
                'MORE_STICKERS': '🎭 More Stickers',
                'NEWS': '📰 News',
                'PARTNERED': '🤝 Partnered',
                'PREVIEW_ENABLED': '👁️ Preview Enabled',
                'ROLE_ICONS': '🎭 Role Icons',
                'ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE': '💳 Role Subscriptions',
                'ROLE_SUBSCRIPTIONS_ENABLED': '💳 Role Subscriptions Enabled',
                'TICKETED_EVENTS_ENABLED': '🎫 Ticketed Events',
                'VANITY_URL': '🔗 Vanity URL',
                'VERIFIED': '✅ Verified',
                'VIP_REGIONS': '🌐 VIP Regions',
                'WELCOME_SCREEN_ENABLED': '👋 Welcome Screen'
            };

            const features = guild.features
                .slice(0, 10)
                .map(f => featureEmojis[f] || f)
                .join(', ');

            embed.addFields({
                name: '✨ Features',
                value: features || 'None',
                inline: false
            });
        }

        // Add server icon and banner if available
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
        }

        message.reply({ embeds: [embed] });
    }
};

function buildFullGuildEmbed(guild, vanity = null) {
    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
    const totalChannels = guild.channels.cache.size;

    const totalMembers = guild.members.cache.size || guild.memberCount;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;
    const onlineCount = guild.members.cache.filter(member => member.presence?.status && member.presence.status !== 'offline').size;

    const verificationLevels = {
        0: 'None',
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Very High'
    };

    const notifications = { 0: 'All messages', 1: 'Only @mentions' };
    const boostCount = Number(guild.premiumSubscriptionCount) || 0;
    const boostTier = Number(guild.premiumTier) || 0;
    const boostGoal = [2, 2, 7, 14][boostTier] || 14;
    const filledSegments = Math.max(0, Math.min(10, Math.round((boostCount / boostGoal) * 10)));
    const boostProgress = `${'█'.repeat(filledSegments)}${'░'.repeat(10 - filledSegments)}`;

    const embed = new EmbedBuilder()
        .setTitle(`Server Information - ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .setColor('#5865F2')
        .addFields(
            { name: 'General', value: '\u200b', inline: false },
            { name: '🆔 ID', value: guild.id, inline: true },
            { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
            { name: '🔗 Vanity URL', value: guild.vanityURLCode || vanity?.code ? `discord.gg/${guild.vanityURLCode || vanity.code}` : 'None', inline: true },
            { name: '✅ Verified', value: guild.verified ? 'Yes' : 'No', inline: true },
            { name: '🤝 Partnered', value: guild.partnered ? 'Yes' : 'No', inline: true },
            { name: '\u200b', value: '\u200b', inline: false },
            { name: 'Members', value: '\u200b', inline: false },
            { name: '👥 Total', value: formatNumber(totalMembers), inline: true },
            { name: '🤖 Bots', value: formatNumber(botCount), inline: true },
            { name: '🟢 Online', value: formatNumber(onlineCount), inline: true },
            { name: '\u200b', value: '\u200b', inline: false },
            { name: 'Channels', value: '\u200b', inline: false },
            { name: '💬 Text', value: String(textChannels), inline: true },
            { name: '🔊 Voice', value: String(voiceChannels), inline: true },
            { name: '📁 Categories', value: String(categoryChannels), inline: true },
            { name: '📊 Total', value: String(totalChannels), inline: true },
            { name: '\u200b', value: '\u200b', inline: false },
            { name: 'Boost', value: '\u200b', inline: false },
            { name: '💎 Tier', value: String(boostTier), inline: true },
            { name: '🚀 Boosts', value: String(boostCount), inline: true },
            { name: '📈 Progress Bar', value: boostProgress, inline: true },
            { name: '\u200b', value: '\u200b', inline: false },
            { name: 'Security', value: '\u200b', inline: false },
            { name: '🔒 Verification', value: verificationLevels[guild.verificationLevel] || String(guild.verificationLevel), inline: true },
            { name: '🔞 NSFW Level', value: String(guild.nsfwLevel), inline: true },
            { name: '🔔 Default Notifications', value: notifications[guild.defaultMessageNotifications] || String(guild.defaultMessageNotifications), inline: true }
        )
        .setTimestamp();

    if (guild.description) {
        embed.addFields({ name: 'Description', value: guild.description, inline: false });
    }

    if (guild.features.length > 0) {
        embed.addFields({ name: 'Features', value: guild.features.join(', '), inline: false });
    }

    if (guild.bannerURL()) {
        embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
    }

    return embed;
}

function buildInviteGuildEmbed(invite) {
    const guild = invite.guild;
    const channel = invite.channel;
    const iconUrl = getInviteGuildIconUrl(guild);
    const memberCount = invite.memberCount ?? null;
    const presenceCount = invite.presenceCount ?? null;

    const embed = new EmbedBuilder()
        .setTitle(`Server Information - ${guild?.name || 'Unknown Server'}`)
        .setColor('#5865F2')
        .setDescription('⚠️ **Limited data — bot is not in this server**')
        .addFields(
            { name: 'Name', value: guild?.name || 'Unknown', inline: true },
            { name: 'ID', value: guild?.id || 'Unknown', inline: true },
            { name: 'Members', value: memberCount == null ? 'Unknown' : `${formatNumber(memberCount)}`, inline: true },
            { name: 'Online', value: presenceCount == null ? 'Unknown' : `${formatNumber(presenceCount)}`, inline: true },
            { name: 'Channel', value: formatInviteChannel(channel), inline: true }
        )
        .setTimestamp();

    if (invite.expiresTimestamp) {
        embed.addFields({
            name: 'Expires',
            value: `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>`,
            inline: true
        });
    }

    if (iconUrl) {
        embed.setThumbnail(iconUrl);
    }

    return embed;
}

function parseInviteCode(target) {
    return target
        .trim()
        .replace(/^https?:\/\/(www\.)?discord\.gg\//i, '')
        .replace(/^https?:\/\/(www\.)?discord(?:app)?\.com\/invite\//i, '')
        .split(/[/?#]/)[0];
}

function getInviteGuildIconUrl(guild) {
    if (!guild) return null;
    if (typeof guild.iconURL === 'function') {
        return guild.iconURL({ dynamic: true, size: 256 });
    }
    if (guild.icon && guild.id) {
        const extension = guild.icon.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${extension}?size=256`;
    }
    return null;
}

function formatInviteChannel(channel) {
    if (!channel) return 'Unknown';
    if (channel.name) return `#${channel.name}`;
    if (channel.id) return `<#${channel.id}>`;
    return 'Unknown';
}
