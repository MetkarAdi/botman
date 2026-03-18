const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { spotifyGet, formatTrackDuration } = require('../../utils/spotify');
const { truncate } = require('../../utils/helpers');

const SPOTIFY_GREEN = '#1DB954';

module.exports = {
    name: 'spotify',
    aliases: ['sp', 'music'],
    description: 'Search Spotify — tracks, albums, artists, playlists',
    usage: 'spotify <track|album|artist|playlist|new> <query>',
    category: 'api',
    cooldown: 5,

    async execute(message, args, client) {
        if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
            return message.reply('❌ `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are not set in `.env`.\nGet them free at https://developer.spotify.com/dashboard');
        }

        const subcommand = args[0]?.toLowerCase();
        const query = args.slice(1).join(' ').trim();

        const validSubs = ['track', 'album', 'artist', 'playlist', 'new', 'charts'];

        if (!subcommand || !validSubs.includes(subcommand)) {
            return message.reply([
                '❌ Invalid subcommand.',
                '',
                '**Usage:**',
                '`>>spotify track <name>` — search for a track',
                '`>>spotify album <name>` — search for an album',
                '`>>spotify artist <name>` — search for an artist',
                '`>>spotify playlist <name>` — search for a playlist',
                '`>>spotify new` — show new releases',
            ].join('\n'));
        }

        if (subcommand !== 'new' && !query) {
            return message.reply(`❌ Provide a search query. E.g. \`>>spotify ${subcommand} Kendrick Lamar\``);
        }

        const loading = await message.reply('<:spotify:0> Searching Spotify...');

        try {
            switch (subcommand) {
                case 'track': return await searchTrack(message, loading, query);
                case 'album': return await searchAlbum(message, loading, query);
                case 'artist': return await searchArtist(message, loading, query);
                case 'playlist': return await searchPlaylist(message, loading, query);
                case 'new': return await newReleases(message, loading);
            }
        } catch (error) {
            console.error('Spotify error:', error.response?.data || error.message);
            if (error.message.includes('not set')) return loading.edit(`❌ ${error.message}`);
            loading.edit('❌ Spotify API error. Check your credentials or try again later.');
        }
    }
};

// ── Track Search ──────────────────────────────────────────────────────────────
async function searchTrack(message, loading, query) {
    const data = await spotifyGet('/search', { q: query, type: 'track', limit: 5 });
    const tracks = data.tracks?.items?.filter(t => t);

    if (!tracks?.length) return loading.edit(`❌ No tracks found for **"${query}"**.`);

    let page = 0;

    const buildEmbed = (i) => {
        const track = tracks[i];
        const artists = track.artists.map(a => `[${a.name}](${a.external_urls.spotify})`).join(', ');
        const embed = new EmbedBuilder()
            .setTitle(`🎵 ${track.name}`)
            .setURL(track.external_urls.spotify)
            .setThumbnail(track.album.images[0]?.url || null)
            .setColor(SPOTIFY_GREEN)
            .addFields(
                { name: '👤 Artist(s)', value: artists, inline: true },
                { name: '💿 Album', value: `[${track.album.name}](${track.album.external_urls.spotify})`, inline: true },
                { name: '📅 Released', value: track.album.release_date, inline: true },
                { name: '⏱️ Duration', value: formatTrackDuration(track.duration_ms), inline: true },
                { name: '🔥 Popularity', value: `${track.popularity}/100`, inline: true },
                { name: '💽 Disc / Track', value: `Disc ${track.disc_number} • Track ${track.track_number}`, inline: true }
            )
            .setFooter({ text: `Result ${i + 1}/${tracks.length} • Spotify` })
            .setTimestamp();

        if (track.preview_url) embed.addFields({ name: '🎧 Preview', value: `[30s Preview](${track.preview_url})`, inline: true });
        if (track.explicit) embed.addFields({ name: '🔞 Explicit', value: 'Yes', inline: true });

        return embed;
    };

    await paginate(message, loading, tracks, buildEmbed, page);
}

// ── Album Search ──────────────────────────────────────────────────────────────
async function searchAlbum(message, loading, query) {
    const data = await spotifyGet('/search', { q: query, type: 'album', limit: 5 });
    const albums = data.albums?.items?.filter(a => a);

    if (!albums?.length) return loading.edit(`❌ No albums found for **"${query}"**.`);

    let page = 0;

    const buildEmbed = async (i) => {
        const album = albums[i];
        // Fetch full album for tracklist
        const full = await spotifyGet(`/albums/${album.id}`);
        const artists = album.artists.map(a => `[${a.name}](${a.external_urls.spotify})`).join(', ');
        const trackList = full.tracks.items.slice(0, 10)
            .map((t, idx) => `${idx + 1}. [${t.name}](${t.external_urls.spotify}) — ${formatTrackDuration(t.duration_ms)}`)
            .join('\n');

        const totalDuration = full.tracks.items.reduce((acc, t) => acc + t.duration_ms, 0);

        const embed = new EmbedBuilder()
            .setTitle(`💿 ${album.name}`)
            .setURL(album.external_urls.spotify)
            .setThumbnail(album.images[0]?.url || null)
            .setColor(SPOTIFY_GREEN)
            .addFields(
                { name: '👤 Artist(s)', value: artists, inline: true },
                { name: '📅 Released', value: album.release_date, inline: true },
                { name: '🎵 Tracks', value: `${full.total_tracks}`, inline: true },
                { name: '⏱️ Total Duration', value: formatTrackDuration(totalDuration), inline: true },
                { name: '💽 Type', value: album.album_type.charAt(0).toUpperCase() + album.album_type.slice(1), inline: true }
            )
            .setFooter({ text: `Result ${i + 1}/${albums.length} • Spotify` })
            .setTimestamp();

        if (trackList) {
            embed.addFields({ name: `🎶 Tracklist${full.total_tracks > 10 ? ' (first 10)' : ''}`, value: truncate(trackList, 1024), inline: false });
        }

        return embed;
    };

    await paginateAsync(message, loading, albums, buildEmbed, page);
}

// ── Artist Search ─────────────────────────────────────────────────────────────
async function searchArtist(message, loading, query) {
    const data = await spotifyGet('/search', { q: query, type: 'artist', limit: 5 });
    const artists = data.artists?.items?.filter(a => a);

    if (!artists?.length) return loading.edit(`❌ No artists found for **"${query}"**.`);

    let page = 0;

    const buildEmbed = async (i) => {
        const artist = artists[i];
        // Fetch top tracks
        const topData = await spotifyGet(`/artists/${artist.id}/top-tracks`, { market: 'US' });
        const topTracks = topData.tracks?.slice(0, 5)
            .map((t, idx) => `${idx + 1}. [${t.name}](${t.external_urls.spotify}) — ${formatTrackDuration(t.duration_ms)}`)
            .join('\n') || 'N/A';

        const embed = new EmbedBuilder()
            .setTitle(`🎤 ${artist.name}`)
            .setURL(artist.external_urls.spotify)
            .setColor(SPOTIFY_GREEN)
            .addFields(
                { name: '👥 Followers', value: artist.followers?.total ? artist.followers.total.toLocaleString() : 'N/A', inline: true },
                { name: '🔥 Popularity', value: `${artist.popularity}/100`, inline: true },
                { name: '🎭 Genres', value: artist.genres?.length ? artist.genres.slice(0, 5).join(', ') : 'N/A', inline: false },
                { name: '🎵 Top Tracks', value: topTracks, inline: false }
            )
            .setFooter({ text: `Result ${i + 1}/${artists.length} • Spotify` })
            .setTimestamp();

        if (artist.images?.[0]?.url) embed.setThumbnail(artist.images[0].url);

        return embed;
    };

    await paginateAsync(message, loading, artists, buildEmbed, page);
}

// ── Playlist Search ───────────────────────────────────────────────────────────
async function searchPlaylist(message, loading, query) {
    const data = await spotifyGet('/search', { q: query, type: 'playlist', limit: 5 });
    const playlists = data.playlists?.items?.filter(p => p);

    if (!playlists?.length) return loading.edit(`❌ No playlists found for **"${query}"**.`);

    let page = 0;

    const buildEmbed = (i) => {
        const pl = playlists[i];
        const embed = new EmbedBuilder()
            .setTitle(`📋 ${pl.name}`)
            .setURL(pl.external_urls.spotify)
            .setColor(SPOTIFY_GREEN)
            .addFields(
                { name: '👤 Owner', value: pl.owner.display_name || pl.owner.id, inline: true },
                { name: '🎵 Tracks', value: `${pl.tracks?.total ?? 'N/A'}`, inline: true },
                { name: '🔓 Public', value: pl.public !== false ? 'Yes' : 'No', inline: true }
            )
            .setFooter({ text: `Result ${i + 1}/${playlists.length} • Spotify` })
            .setTimestamp();

        if (pl.description) embed.setDescription(truncate(pl.description.replace(/<[^>]+>/g, ''), 300));
        if (pl.images?.[0]?.url) embed.setThumbnail(pl.images[0].url);

        return embed;
    };

    await paginate(message, loading, playlists, buildEmbed, page);
}

// ── New Releases ──────────────────────────────────────────────────────────────
async function newReleases(message, loading) {
    const data = await spotifyGet('/browse/new-releases', { limit: 8 });
    const albums = data.albums?.items?.filter(a => a);

    if (!albums?.length) return loading.edit('❌ Couldn\'t fetch new releases right now.');

    const list = albums.map((a, i) => {
        const artists = a.artists.map(x => x.name).join(', ');
        return `${i + 1}. **[${a.name}](${a.external_urls.spotify})** — ${artists} *(${a.release_date})*`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setTitle('🆕 New Releases on Spotify')
        .setDescription(truncate(list, 2048))
        .setColor(SPOTIFY_GREEN)
        .setThumbnail(albums[0]?.images?.[0]?.url || null)
        .setFooter({ text: 'Spotify • New Releases' })
        .setTimestamp();

    await loading.edit({ content: null, embeds: [embed] });
}

// ── Pagination Helpers ────────────────────────────────────────────────────────
async function paginate(message, loading, items, buildEmbed, startPage) {
    let page = startPage;
    const row = (p) => {
        if (items.length <= 1) return null;
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('sp_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
            new ButtonBuilder().setCustomId('sp_next').setLabel('▶').setStyle(ButtonStyle.Primary).setDisabled(p === items.length - 1)
        );
    };

    const r = row(page);
    const reply = await loading.edit({ content: null, embeds: [buildEmbed(page)], components: r ? [r] : [] });
    if (items.length <= 1) return;

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === message.author.id,
        time: 60000
    });

    collector.on('collect', async i => {
        if (i.customId === 'sp_prev') page = Math.max(0, page - 1);
        if (i.customId === 'sp_next') page = Math.min(items.length - 1, page + 1);
        await i.update({ embeds: [buildEmbed(page)], components: [row(page)] });
    });

    collector.on('end', () => reply.edit({ components: [] }).catch(() => {}));
}

async function paginateAsync(message, loading, items, buildEmbed, startPage) {
    let page = startPage;
    const row = (p) => {
        if (items.length <= 1) return null;
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('sp_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
            new ButtonBuilder().setCustomId('sp_next').setLabel('▶').setStyle(ButtonStyle.Primary).setDisabled(p === items.length - 1)
        );
    };

    const r = row(page);
    const reply = await loading.edit({ content: null, embeds: [await buildEmbed(page)], components: r ? [r] : [] });
    if (items.length <= 1) return;

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === message.author.id,
        time: 60000
    });

    collector.on('collect', async i => {
        if (i.customId === 'sp_prev') page = Math.max(0, page - 1);
        if (i.customId === 'sp_next') page = Math.min(items.length - 1, page + 1);
        await i.deferUpdate();
        const embed = await buildEmbed(page);
        await i.editReply({ embeds: [embed], components: [row(page)] });
    });

    collector.on('end', () => reply.edit({ components: [] }).catch(() => {}));
}