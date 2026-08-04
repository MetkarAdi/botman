const sportsDbPhotoCache = new Map();

async function resolveFootballImage(card) {
    const isPremierLeagueResource = card.playerPhoto?.includes('resources.premierleague.com');
    const sportsDbPhoto = isPremierLeagueResource ? await getSportsDbPhoto(card.playerName) : null;
    const candidates = [
        sportsDbPhoto,
        isPremierLeagueResource ? null : card.playerPhoto,
        !isPremierLeagueResource && card.playerId ? `https://api.sofascore.com/api/v1/player/${card.playerId}/image` : null,
        `https://ui-avatars.com/api/?name=${encodeURIComponent(card.playerName || 'Player')}&background=3498db&color=fff&size=256`
    ].filter(Boolean);
    const { default: fetch } = await import('node-fetch');

    for (const url of candidates) {
        try {
            if ((await fetch(url, { method: 'HEAD' })).status === 200) return url;
        } catch {
            // Continue through the fallback chain.
        }
    }
    return null;
}

async function getSportsDbPhoto(playerName) {
    const key = String(playerName || '').trim().toLowerCase();
    if (!key) return null;
    if (sportsDbPhotoCache.has(key)) return sportsDbPhotoCache.get(key);

    try {
        const { default: fetch } = await import('node-fetch');
        const response = await fetch(`https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=${encodeURIComponent(playerName)}`);
        if (!response.ok) throw new Error(`TheSportsDB returned ${response.status}`);
        const data = await response.json();
        const normalizedName = key.replace(/[^a-z0-9]/g, '');
        const player = data.player?.find(candidate => (
            String(candidate.strPlayer || '').toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName
        )) || data.player?.[0];
        const photo = player?.strCutout || player?.strThumb || null;
        sportsDbPhotoCache.set(key, photo);
        return photo;
    } catch {
        sportsDbPhotoCache.set(key, null);
        return null;
    }
}

module.exports = { resolveFootballImage };
