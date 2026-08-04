const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ComponentType
} = require('discord.js');
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
                return sendFullGuildInfo(message, guild);
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
        return sendFullGuildInfo(message, guild, vanity);
    }
};

async function sendFullGuildInfo(message, guild, vanity = null) {
    const pages = buildFullGuildEmbeds(guild, vanity);
    let currentPage = 0;
    const response = await message.reply({
        embeds: [pages[currentPage]],
        components: [buildNavigationRow(currentPage, pages.length)]
    });

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000
    });

    collector.on('collect', async interaction => {
        if (interaction.user.id !== message.author.id) {
            await interaction.reply({ content: 'Only the command user can use these buttons.', ephemeral: true });
            return;
        }

        if (interaction.customId === 'serverinfo_close') {
            collector.stop('closed');
            await interaction.deferUpdate();
            await interaction.message.delete().catch(() => response.edit({ components: [buildNavigationRow(currentPage, pages.length, true)] }));
            return;
        }

        if (interaction.customId === 'serverinfo_prev') currentPage = Math.max(0, currentPage - 1);
        if (interaction.customId === 'serverinfo_next') currentPage = Math.min(pages.length - 1, currentPage + 1);

        await interaction.update({
            embeds: [pages[currentPage]],
            components: [buildNavigationRow(currentPage, pages.length)]
        });
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'closed') return;
        await response.edit({ components: [buildNavigationRow(currentPage, pages.length, true)] }).catch(() => null);
    });
}

function buildNavigationRow(page, pageCount, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('serverinfo_prev')
            .setLabel('Previous')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page === 0),
        new ButtonBuilder()
            .setCustomId('serverinfo_next')
            .setLabel(page === pageCount - 1 ? 'Last Page' : 'Next')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || page === pageCount - 1),
        new ButtonBuilder()
            .setCustomId('serverinfo_close')
            .setLabel('Close')
            .setEmoji('✖️')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
}

function buildFullGuildEmbeds(guild, vanity = null) {
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

    const title = `Server Information - ${guild.name || 'Unknown Server'}`;
    const icon = safeImageUrl(() => guild.iconURL());
    const banner = safeImageUrl(() => guild.bannerURL());
    const overview = new EmbedBuilder()
        .setTitle(title)
        .setColor('#5865F2')
        .addFields(
            { name: 'General', value: '\u200b', inline: false },
            { name: '🆔 ID', value: String(guild.id || 'Unknown'), inline: true },
            { name: '👑 Owner', value: guild.ownerId ? `<@${guild.ownerId}>` : 'Unknown', inline: true },
            { name: '📅 Created', value: createdTimestamp ? `<t:${createdTimestamp}:D>` : 'Unknown', inline: true },
            { name: '🔗 Vanity URL', value: vanity?.code || guild.vanityURLCode ? `discord.gg/${vanity?.code || guild.vanityURLCode}` : 'None', inline: true },
            { name: '✅ Verified · 🤝 Partnered', value: `${guild.verified ? 'Yes' : 'No'} · ${guild.partnered ? 'Yes' : 'No'}`, inline: true },
            { name: '\u200b', value: '\u200b', inline: false },
            { name: 'Security', value: '\u200b', inline: false },
            { name: '🔒 Verification', value: verificationLabel(guild.verificationLevel), inline: true },
            { name: '🔞 NSFW Level', value: String(guild.nsfwLevel ?? 'Unknown'), inline: true },
            { name: '🔔 Default Notifications', value: notificationLabel(guild.defaultMessageNotifications), inline: true }
        )
        .setFooter({ text: 'Page 1 / 3 · Overview' })
        .setTimestamp();

    if (guild.description) overview.setDescription(guild.description.slice(0, 4096));
    if (icon) overview.setThumbnail(icon);
    if (banner) overview.setImage(banner);

    const membersPage = new EmbedBuilder()
        .setTitle(title)
        .setColor('#5865F2')
        .setDescription('Member statistics for this server.')
        .addFields(
            { name: 'Members', value: '\u200b', inline: false },
            { name: '👥 Total Members', value: formatCount(totalMembers), inline: true },
            { name: '🤖 Bots', value: formatCount(botCount), inline: true },
            { name: '🟢 Online', value: formatCount(onlineCount), inline: true }
        )
        .setFooter({ text: 'Page 2 / 3 · Members' })
        .setTimestamp();
    if (icon) membersPage.setThumbnail(icon);

    const channelsPage = new EmbedBuilder()
        .setTitle(title)
        .setColor('#5865F2')
        .setDescription('Channel and boost information for this server.')
        .addFields(
            { name: 'Channels', value: '\u200b', inline: false },
            { name: '💬 Text Channels', value: formatCount(textChannels), inline: true },
            { name: '🔊 Voice Channels', value: formatCount(voiceChannels), inline: true },
            { name: '📁 Categories', value: formatCount(categoryChannels), inline: true },
            { name: '📊 Total Channels', value: formatCount(totalChannels), inline: true },
            { name: '\u200b', value: '\u200b', inline: false },
            { name: 'Boost', value: '\u200b', inline: false },
            { name: '💎 Tier', value: formatCount(boostTier), inline: true },
            { name: '🚀 Boosts', value: formatCount(boostCount), inline: true },
            { name: '📈 Progress', value: boostProgress, inline: true }
        )
        .setFooter({ text: 'Page 3 / 3 · Channels & Boosts' })
        .setTimestamp();
    if (icon) channelsPage.setThumbnail(icon);

    return [overview, membersPage, channelsPage];
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
