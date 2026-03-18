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
        const guild = message.guild;

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
