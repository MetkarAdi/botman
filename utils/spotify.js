const axios = require('axios');

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get a valid Spotify access token using Client Credentials flow.
 * Automatically refreshes when expired.
 */
async function getSpotifyToken() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set in .env');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await axios.post('https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );

    cachedToken = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000; // Expire 60s early to be safe
    return cachedToken;
}

/**
 * Make a Spotify API request, auto-handling token refresh.
 */
async function spotifyGet(endpoint, params = {}) {
    const token = await getSpotifyToken();
    const res = await axios.get(`https://api.spotify.com/v1${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        params
    });
    return res.data;
}

/**
 * Format duration from ms to m:ss
 */
function formatTrackDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = { getSpotifyToken, spotifyGet, formatTrackDuration };