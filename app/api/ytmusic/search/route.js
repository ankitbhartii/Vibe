import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Search YouTube Music via youtubei.js (music catalog) with a fallback
 * to YouTube's public Data v3 API-compatible search endpoint.
 *
 * youtubei.js music search hits: music.youtube.com InnerTube API
 * This only fetches metadata (title, artist, thumbnail, duration) —
 * NO stream resolution — so it is NOT blocked by Vercel's datacenter IPs.
 */
async function searchViaYoutubeiJS(query, limit = 30) {
  const { searchYTMusic } = await import('@/utils/ytmusic')
  const songs = await searchYTMusic(query.trim(), limit)
  return songs
}

/**
 * Fallback: use YouTube's public Piped API (community-run, no key needed)
 * Returns the same normalized track shape.
 */
async function searchViaPipedAPI(query, limit = 30) {
  const encoded = encodeURIComponent(query)
  // Piped instances — try a few in order until one responds
  const instances = [
    'https://pipedapi.kavin.rocks',
    'https://piped-api.garudalinux.org',
    'https://api.piped.yt',
  ]

  for (const base of instances) {
    try {
      const res = await fetch(`${base}/search?q=${encoded}&filter=music_songs`, {
        headers: { 'User-Agent': 'VibeMusicPlayer/1.0' },
        signal: AbortSignal.timeout(5000)
      })
      if (!res.ok) continue
      const data = await res.json()
      const items = data.items || []
      return items.slice(0, limit).map(item => ({
        id: `yt_${item.url?.replace('/watch?v=', '') || item.videoId || ''}`,
        rawId: item.url?.replace('/watch?v=', '') || item.videoId || '',
        title: item.title || 'Unknown Title',
        artist: item.uploaderName || item.uploader || 'Unknown Artist',
        album: 'YouTube Music',
        image_url: item.thumbnail || item.thumbnailUrl || null,
        audio_url: `/api/ytmusic/play/${item.url?.replace('/watch?v=', '') || item.videoId}`,
        duration: item.duration || 0,
        source: 'ytmusic',
        is_favorite: false
      })).filter(s => s.rawId)
    } catch (_) {
      continue
    }
  }
  return []
}

export async function POST(request) {
  try {
    const { query } = await request.json()

    if (!query || !query.trim()) {
      return NextResponse.json({ songs: [] })
    }

    console.log(`📡 YouTube Music search initiated for: "${query}"`)

    // Try youtubei.js first (best quality results) with 8s timeout
    let songs = []
    try {
      songs = await Promise.race([
        searchViaYoutubeiJS(query, 30),
        new Promise((_, reject) => setTimeout(() => reject(new Error('ytmusic search timeout')), 8000))
      ])
    } catch (err) {
      console.warn(`⚠️ youtubei.js search failed (${err.message}), trying Piped API fallback...`)
    }

    // If youtubei.js returned nothing or failed, try Piped
    if (!songs || songs.length === 0) {
      console.log(`📡 Falling back to Piped API for YouTube search: "${query}"`)
      songs = await searchViaPipedAPI(query, 30)
    }

    console.log(`✅ YouTube Music search returned ${songs.length} results for "${query}"`)
    return NextResponse.json({ songs })
  } catch (error) {
    console.error('❌ YouTube Music search API route failure:', error)
    return NextResponse.json({ error: error.message, songs: [] }, { status: 500 })
  }
}
