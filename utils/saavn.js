import CryptoJS from 'crypto-js'

const SAAVN_BASE_URL = 'https://www.jiosaavn.com/api.php'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Decrypts JioSaavn's encrypted media URL using DES-ECB with the static key '38346591'.
 * Escalates quality to 320kbps.
 */
export function decryptMediaUrl(encryptedUrl) {
  if (!encryptedUrl) return null
  try {
    const key = CryptoJS.enc.Utf8.parse('38346591')
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) },
      key,
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      }
    )
    let url = decrypted.toString(CryptoJS.enc.Utf8)
    if (!url) return null

    // Upgrade the default quality suffix (e.g. _96 or _160) to _320 for high-fidelity audio
    url = url.replace(/_([0-9]+)\.(mp4|m4a|mp3)/, '_320.$2')
    return url
  } catch (err) {
    console.error('❌ Error decrypting JioSaavn media URL:', err)
    return null
  }
}

/**
 * Normalizes a single song object from the JioSaavn API response into our standard player structure.
 */
export function normalizeSong(song) {
  if (!song) return null
  
  // Clean up artist names
  let artist = song.primary_artists || song.singers || 'Unknown Artist'
  // Unescape HTML entities (e.g., &amp; -> &)
  artist = artist.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"')
  
  let title = song.song || song.title || 'Unknown Track'
  title = title.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"')

  let album = song.album || ''
  album = album.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"')

  // Normalise image: Saavn CDN images have quality suffixes. We replace 150x150 with 500x500 for premium visuals.
  let imageUrl = song.image || null
  if (imageUrl) {
    imageUrl = imageUrl.replace('150x150', '500x500').replace('50x50', '500x500')
  }

  return {
    id: `saavn_${song.id}`,
    rawId: song.id,
    title,
    artist,
    album,
    image_url: imageUrl,
    audio_url: `/api/saavn/play/${song.id}`, // Route through play redirection endpoint as a path parameter
    duration: parseInt(song.duration || '0', 10),
    year: song.year || '',
    source: 'saavn',
    is_favorite: song.starred === 'true' || false
  }
}

/**
 * Fetch helper with browser user agent.
 */
async function fetchSaavn(call, queryParams = {}) {
  const urlObj = new URL(SAAVN_BASE_URL)
  urlObj.searchParams.set('__call', call)
  urlObj.searchParams.set('_format', 'json')
  urlObj.searchParams.set('_marker', '0')
  urlObj.searchParams.set('cc', 'in')
  urlObj.searchParams.set('includeMetaTags', '1')

  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      urlObj.searchParams.set(k, String(v))
    }
  })

  try {
    const res = await fetch(urlObj.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

    if (!res.ok) {
      throw new Error(`JioSaavn fetch failed: ${res.status} ${res.statusText}`)
    }

    return await res.json()
  } catch (err) {
    console.error(`❌ JioSaavn call ${call} failed:`, err)
    throw err
  }
}

/**
 * Fetches homepage launch data (trending, new releases, charts, top playlists)
 */
export async function getLaunchData() {
  const data = await fetchSaavn('webapi.getLaunchData')
  return {
    new_trending: (data.new_trending || []).map((item, index) => {
      const details = item.details || {}
      return {
        id: details.id || details.albumid || details.listid || item.id || `trending-${index}`,
        type: item.type || (details.albumid ? 'album' : (details.listid ? 'playlist' : 'song')),
        title: (details.title || details.name || details.listname || item.title || '').replace(/&amp;/g, '&'),
        subtitle: (details.subtitle || details.subtitle_desc || (details.artist ? details.artist.name : '') || item.subtitle || '').replace(/&amp;/g, '&'),
        image_url: (details.image || item.image || '').replace('150x150', '500x500'),
        language: details.language || item.language || '',
        year: details.year || item.year || ''
      }
    }),
    new_albums: (data.new_albums || []).map((item, index) => ({
      id: item.albumid || item.id || `album-${index}`,
      type: 'album',
      title: (item.title || item.name || '').replace(/&amp;/g, '&'),
      subtitle: item.subtitle || item.artist || '',
      image_url: (item.image || '').replace('150x150', '500x500'),
      language: item.language || '',
      year: item.year || ''
    })),
    top_playlists: (data.top_playlists || []).map((item, index) => ({
      id: item.listid || item.id || `playlist-${index}`,
      type: 'playlist',
      title: (item.listname || item.title || '').replace(/&amp;/g, '&'),
      subtitle: item.subtitle || `By ${item.firstname || 'JioSaavn'}`,
      image_url: (item.image || '').replace('150x150', '500x500'),
      count: parseInt(item.count || '0', 10)
    })),
    charts: (data.charts || []).map((item, index) => ({
      id: item.listid || item.id || `chart-${index}`,
      type: 'playlist',
      title: (item.listname || item.title || '').replace(/&amp;/g, '&'),
      subtitle: item.subtitle || `Chart`,
      image_url: (item.image || '').replace('150x150', '500x500'),
      count: parseInt(item.count || '0', 10)
    })),
    radio: (data.radio || []).map((item, index) => ({
      id: item.name || `radio-${index}`,
      type: 'radio',
      title: item.station_display_text || item.name || '',
      subtitle: item.description || 'JioSaavn Radio Station',
      image_url: (item.image || '').replace('150x150', '500x500'),
      language: item.language || '',
      color: item.color || '#121212'
    }))
  }
}

/**
 * Searches JioSaavn songs.
 */
export async function searchSongs(query, limit = 20) {
  try {
    const data = await fetchSaavn('search.getResults', { q: query, n: limit })
    const results = data.results || []
    return results.map(normalizeSong).filter(Boolean)
  } catch (err) {
    return []
  }
}

/**
 * Searches JioSaavn albums.
 */
export async function searchAlbums(query, limit = 10) {
  try {
    const data = await fetchSaavn('search.getAlbumResults', { q: query, n: limit })
    const results = data.results || []
    return results.map(item => ({
      id: item.albumid,
      type: 'album',
      title: (item.title || item.name || '').replace(/&amp;/g, '&'),
      subtitle: item.primary_artists || item.music || '',
      image_url: (item.image || '').replace('150x150', '500x500'),
      year: item.year || '',
      language: item.language || ''
    }))
  } catch (err) {
    return []
  }
}

/**
 * Searches JioSaavn playlists.
 */
export async function searchPlaylists(query, limit = 10) {
  try {
    const data = await fetchSaavn('search.getPlaylistResults', { q: query, n: limit })
    const results = data.results || []
    return results.map(item => ({
      id: item.listid,
      type: 'playlist',
      title: (item.listname || item.title || '').replace(/&amp;/g, '&'),
      subtitle: `Playlist by ${item.firstname || 'JioSaavn'}`,
      image_url: (item.image || '').replace('150x150', '500x500'),
      count: parseInt(item.count || '0', 10)
    }))
  } catch (err) {
    return []
  }
}

/**
 * Gets details and songs of an album.
 */
export async function getAlbumDetails(albumId) {
  const data = await fetchSaavn('content.getAlbumDetails', { albumid: albumId })
  const songs = (data.songs || []).map(normalizeSong).filter(Boolean)
  return {
    id: data.albumid || albumId,
    title: (data.title || data.name || '').replace(/&amp;/g, '&'),
    artist: data.primary_artists || '',
    image_url: (data.image || '').replace('150x150', '500x500'),
    year: data.year || '',
    songs
  }
}

/**
 * Gets details and songs of a playlist.
 */
export async function getPlaylistDetails(playlistId) {
  const data = await fetchSaavn('playlist.getDetails', { listid: playlistId })
  const songs = (data.songs || []).map(normalizeSong).filter(Boolean)
  return {
    id: data.listid || playlistId,
    title: (data.listname || data.title || '').replace(/&amp;/g, '&'),
    artist: `Playlist by ${data.firstname || 'JioSaavn'}`,
    image_url: (data.image || '').replace('150x150', '500x500'),
    songs
  }
}

/**
 * Gets details of an artist, including top songs and top albums.
 */
export async function getArtistDetails(artistId) {
  const data = await fetchSaavn('artist.getArtistPageDetails', { artistId })
  const topSongs = (data.topSongs || []).map(normalizeSong).filter(Boolean)
  const topAlbums = (data.topAlbums || []).map(item => ({
    id: item.albumid || item.id,
    type: 'album',
    title: (item.title || item.name || '').replace(/&amp;/g, '&'),
    subtitle: item.subtitle || item.artist || '',
    image_url: (item.image || '').replace('150x150', '500x500'),
    year: item.year || ''
  }))
  return {
    id: data.artistId || artistId,
    name: data.name || '',
    type: 'artist',
    subtitle: data.subtitle || '',
    image_url: (data.image || '').replace('150x150', '500x500'),
    follower_count: data.follower_count || '',
    topSongs,
    topAlbums
  }
}

/**
 * Gets the list of top artists dynamically from JioSaavn.
 */
export async function getTopArtists() {
  const data = await fetchSaavn('social.getTopArtists')
  const results = data.top_artists || []
  return results.map(item => ({
    id: item.artistid || item.id,
    type: 'artist',
    name: item.name || '',
    title: item.name || '',
    image_url: (item.image || '').replace('150x150', '500x500'),
    follower_count: item.follower_count || 0
  }))
}

/**
 * Gets details of a show (podcast) and its episodes.
 */
export async function getShowDetails(showId) {
  try {
    const homeData = await fetchSaavn('show.getHomePage', { show_id: showId })
    const details = homeData.show_details || {}
    const seasons = homeData.seasons || []
    
    let allEpisodes = []
    
    // Fetch episodes for all seasons in parallel
    const episodePromises = seasons.map(async (season) => {
      const seasonNum = season.season_number || 1
      const numEpisodes = parseInt(season.more_info?.numEpisodes || '50', 10)
      
      try {
        const episodesData = await fetchSaavn('show.getAllEpisodes', {
          show_id: showId,
          season_number: seasonNum,
          n: numEpisodes,
          sort_order: 'asc'
        })
        return Array.isArray(episodesData) ? episodesData : []
      } catch (err) {
        console.error(`Error fetching episodes for show ${showId} season ${seasonNum}:`, err)
        return []
      }
    })
    
    const episodesResults = await Promise.all(episodePromises)
    episodesResults.forEach(episodes => {
      allEpisodes = allEpisodes.concat(episodes)
    })
    
    // Normalize episodes into standard track structure
    const songs = allEpisodes.map(ep => {
      if (!ep) return null
      
      let title = ep.title || ep.song || 'Episode'
      title = title.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"')
      
      let artist = ep.primary_artists || ep.singers || details.title || 'Podcast Episode'
      artist = artist.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"')

      let imageUrl = ep.image || details.image || null
      if (imageUrl) {
        imageUrl = imageUrl.replace('150x150', '500x500').replace('50x50', '500x500')
      }

      return {
        id: `saavn_${ep.id}`,
        rawId: ep.id,
        title,
        artist,
        album: details.title || 'Podcast',
        image_url: imageUrl,
        audio_url: `/api/saavn/play/${ep.id}`,
        duration: parseInt(ep.duration || '0', 10),
        year: ep.year || '',
        source: 'saavn',
        is_favorite: false
      }
    }).filter(Boolean)

    return {
      id: details.id || showId,
      title: (details.title || '').replace(/&amp;/g, '&'),
      artist: details.partner_name || 'JioSaavn Podcast',
      subtitle: details.header_desc || '',
      image_url: (details.image || '').replace('150x150', '500x500'),
      type: 'show',
      songs
    }
  } catch (err) {
    console.error(`Error in getShowDetails for show ${showId}:`, err)
    throw err
  }
}

/**
 * Gets lyrics of a song from JioSaavn.
 */
export async function getSongLyrics(songId) {
  try {
    const data = await fetchSaavn('lyrics.getLyrics', { lyrics_id: songId })
    return {
      lyrics: data.lyrics || '',
      copyright: data.lyrics_copyright || ''
    }
  } catch (err) {
    console.error(`❌ Error fetching lyrics for song ${songId}:`, err)
    return { lyrics: '', copyright: '' }
  }
}

/**
 * Resolves a single song's stream URL from its ID.
 */
export async function getSongStreamUrl(songId) {
  const data = await fetchSaavn('song.getDetails', { pids: songId })
  const songs = data.songs || Object.values(data) || []
  if (songs.length === 0 || !songs[0]) return null
  
  const targetSong = songs[0]
  const decrypted = decryptMediaUrl(targetSong.encrypted_media_url)
  return decrypted
}
