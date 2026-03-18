// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format duration (ms to readable string)
function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
}

// Get user badges (flags)
function getUserBadges(user) {
    const badges = [];
    const flags = user.flags?.toArray() || [];

    const badgeMap = {
        'Staff': '👨‍💼 Discord Staff',
        'Partner': '👑 Partnered Server Owner',
        'Hypesquad': '🎉 HypeSquad Events',
        'BugHunterLevel1': '🐛 Bug Hunter',
        'BugHunterLevel2': '🐛 Bug Hunter (Gold)',
        'HypeSquadOnlineHouse1': '🏠 Bravery House',
        'HypeSquadOnlineHouse2': '🏠 Brilliance House',
        'HypeSquadOnlineHouse3': '🏠 Balance House',
        'PremiumEarlySupporter': '💎 Early Supporter',
        'TeamPseudoUser': '👥 Team User',
        'VerifiedBot': '✅ Verified Bot',
        'VerifiedDeveloper': '🧑‍💻 Early Verified Bot Developer',
        'CertifiedModerator': '🛡️ Moderator Programs Alumni',
        'BotHTTPInteractions': '🤖 HTTP Interactions Bot',
        'ActiveDeveloper': '🔧 Active Developer'
    };

    for (const flag of flags) {
        if (badgeMap[flag]) {
            badges.push(badgeMap[flag]);
        }
    }

    // Check for Nitro (approximation based on avatar decoration or banner)
    if (user.banner || user.accentColor) {
        badges.push('💳 Nitro');
    }

    return badges.length > 0 ? badges : ['None'];
}

// Get progress bar
function getProgressBar(current, total, length = 20) {
    const progress = Math.round((current / total) * length);
    const empty = length - progress;
    return '█'.repeat(progress) + '░'.repeat(empty);
}

// Truncate string
function truncate(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

// Generate random ID
function generateId(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

// Parse time string (e.g., "1h30m" to milliseconds)
function parseTime(timeStr) {
    const regex = /(\d+)([smhdw])/g;
    let match;
    let totalMs = 0;

    const multipliers = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000
    };

    while ((match = regex.exec(timeStr)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2];
        totalMs += value * multipliers[unit];
    }

    return totalMs;
}

// Capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
    formatNumber,
    formatDuration,
    getUserBadges,
    getProgressBar,
    truncate,
    generateId,
    parseTime,
    capitalize
};
