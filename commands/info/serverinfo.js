const { EmbedBuilder, ChannelType } = require('discord.js');
const { formatNumber } = require('../../utils/helpers');

module.exports = {
    name: 'serverinfo',
    aliases: ['si', 'guildinfo', 'server'],
    description: 'Get information about the server',
    usage: 'serverinfo [server_id|invite]',
    category: 'info',
    guildOnly: true,
    cooldown: 5,

    async execute(message, args, client) {
        const target = args[0];
        if (target) {
            try {
                const guild = await client.guilds.fetch({ guild: target, force: true });
                await Promise.all([guild.members.fetch(), guild.channels.fetch()]);
                return message.reply({ embeds: [buildFullGuildEmbed(guild)] });
            } catch {
                try {
                    const invite = await client.fetchInvite(parseInviteCode(target), { withCounts: true });
                    return message.reply({ embeds: [buildInviteGuildEmbed(invite)] });
                } catch {
                    return message.reply('❌ Could not find any server with that ID or invite code.');
                }
            }
        }

        const guild = await message.guild.fetch();
        const vanity = await guild.fetchVanityData().catch(() => null);
        return message.reply({ embeds: [buildFullGuildEmbed(guild, vanity)] });
    }
};

function buildFullGuildEmbed(guild, vanity = null) {
    const channels = guild.channels?.cache;
    const members = guild.members?.cache;
    const textChannels = channels?.filter(channel => channel.type === ChannelType.GuildText).size || 0;
    const voiceChannels = channels?.filter(channel => channel.type === ChannelType.GuildVoice).size || 0;
    const categoryChannels = channels?.filter(channel => channel.type === ChannelType.GuildCategory).size || 0;
    const totalChannels = channels?.size || 0;
    const totalMembers = safeNumber(guild.memberCount, members?.size || 0);
    const botCount = members?.filter(member => member.user?.bot).size || 0;
    const onlineCount = members?.filter(member => member.presence?.status && member.presence.status !== 'offline').size || 0;
    const boostCount = safeNumber(guild.premiumSubscriptionCount, 0);
    const boostTier = safeNumber(guild.premiumTier, 0);
    const boostGoal = [2, 2, 7, 14][boostTier] || 14;
    const filledSegments = clamp(Math.round((boostCount / boostGoal) * 10), 0, 10);
    const boostProgress = `${'█'.repeat(filledSegments)}${'░'.repeat(10 - filledSegments)}`;
    const createdTimestamp = safeTimestamp(guild.createdTimestamp);

    const embed = new EmbedBuilder()
        .setTitle(`Server Information - ${guild.name || 'Unknown Server'}`)
        .setColor('#5865F2')
        .addFields(
            { name: 'General', value: '\u200b', inline: false },
            { name: '🆔 ID', value: String(guild.id || 'Unknown'), inline: true },
            { name: '👑 Owner', value: guild.ownerId ? `<@${guild.ownerId}>` : 'Unknown', inline: true },
            { name: '📅 Created', value: createdTimestamp ? `<t:${createdTimestamp}:D>` : 'Unknown', inline: true },
            { name: '🔗 Vanity URL', value: vanity?.code || guild.vanityURLCode ? `discord.gg/${vanity?.code || guild.vanityURLCode}` : 'None', inline: true },
            { name: '✅ Verified · 🤝 Partnered', value: `${guild.verified ? 'Yes' : 'No'} · ${guild.partnered ? 'Yes' : 'No'}`, inline: true },
            { name: '\u200b', value: '\u200b', inline: false },
            { name: 'Members', value: '\u200b', inline: false },
            { name: '👥 Total · 🤖 Bots', value: `${formatCount(totalMembers)} · ${formatCount(botCount)}`, inline: true },
            { name: '🟢 Online', value: formatCount(onlineCount), inline: true },
            { name: '\u200b', value: '\u200b', inline: false },
            { name: 'Channels', value: '\u200b', inline: false },
            { name: '💬 Text · 🔊 Voice', value: `${formatCount(textChannels)} · ${formatCount(voiceChannels)}`, inline: true },
            { name: '📁 Categories · 📊 Total', value: `${formatCount(categoryChannels)} · ${formatCount(totalChannels)}`, inline: true },
            { name: '\u200b', value: '\u200b', inline: false },
            { name: 'Boost', value: '\u200b', inline: false },
            { name: '💎 Tier', value: formatCount(boostTier), inline: true },
            { name: '🚀 Boosts', value: formatCount(boostCount), inline: true },
            { name: '📈 Progress Bar', value: boostProgress, inline: true },
            { name: '\u200b', value: '\u200b', inline: false },
            { name: 'Security', value: '\u200b', inline: false },
            { name: '🔒 Verification', value: verificationLabel(guild.verificationLevel), inline: true },
            { name: '🔞 NSFW Level', value: String(guild.nsfwLevel ?? 'Unknown'), inline: true },
            { name: '🔔 Default Notifications', value: notificationLabel(guild.defaultMessageNotifications), inline: true }
        )
        .setTimestamp();

    // The section layout already uses Discord's 25-field maximum. Keep an
    // optional server description outside the fields so it cannot overflow.
    if (guild.description) embed.setDescription(guild.description.slice(0, 4096));

    const icon = safeImageUrl(() => guild.iconURL());
    const banner = safeImageUrl(() => guild.bannerURL());
    if (icon) embed.setThumbnail(icon);
    if (banner) embed.setImage(banner);
    return embed;
}

function buildInviteGuildEmbed(invite) {
    const guild = invite.guild;
    const createdTimestamp = safeTimestamp(guild?.createdTimestamp);
    const embed = new EmbedBuilder()
        .setTitle(`Server Information - ${guild?.name || 'Unknown Server'}`)
        .setColor('#5865F2')
        .setDescription('⚠️ **Limited data — bot is not in this server**')
        .addFields(
            { name: '🆔 ID', value: String(guild?.id || 'Unknown'), inline: true },
            { name: '👥 Members', value: formatCount(invite.memberCount), inline: true },
            { name: '🟢 Online', value: formatCount(invite.presenceCount), inline: true },
            { name: '📺 Channel', value: invite.channel?.name ? `#${invite.channel.name}` : 'Unknown', inline: true },
            { name: '📅 Created', value: createdTimestamp ? `<t:${createdTimestamp}:D>` : 'Unknown', inline: true }
        )
        .setTimestamp();
    const icon = safeImageUrl(() => guild?.iconURL?.());
    if (icon) embed.setThumbnail(icon);
    return embed;
}

function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function safeTimestamp(value) {
    const timestamp = Math.floor(safeNumber(value, 0) / 1000);
    return timestamp > 0 ? timestamp : null;
}

function formatCount(value) {
    return formatNumber(safeNumber(value, 0));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function safeImageUrl(getUrl) {
    try {
        return getUrl() || null;
    } catch {
        return null;
    }
}

function verificationLabel(level) {
    return ({ 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Very High' })[safeNumber(level, -1)] || 'Unknown';
}

function notificationLabel(level) {
    return ({ 0: 'All messages', 1: 'Only @mentions' })[safeNumber(level, -1)] || 'Unknown';
}

function parseInviteCode(target) {
    return target.trim()
        .replace(/^https?:\/\/(www\.)?discord\.gg\//i, '')
        .replace(/^https?:\/\/(www\.)?discord(?:app)?\.com\/invite\//i, '')
        .split(/[/?#]/)[0];
}
