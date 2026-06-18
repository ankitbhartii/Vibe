import { NextResponse } from 'next/server'
import { searchSongs } from '@/utils/saavn'

const SAAVN_BASE_URL = 'https://www.jiosaavn.com/api.php'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchSaavn(call, queryParams = {}) {
  const urlObj = new URL(SAAVN_BASE_URL)
  urlObj.searchParams.set('__call', call)
  urlObj.searchParams.set('_format', 'json')
  urlObj.searchParams.set('_marker', '0')
  urlObj.searchParams.set('cc', 'in')
  urlObj.searchParams.set('includeMetaTags', '1')
  urlObj.searchParams.set('api_version', '4')
  urlObj.searchParams.set('v', '4')
  urlObj.searchParams.set('ctx', 'web6dot0')

  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      urlObj.searchParams.set(k, String(v))
    }
  })

  try {
    const res = await fetch(urlObj.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error(`JioSaavn recommendations fetch failed for ${call}:`, err)
    return null
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const songId = searchParams.get('id')
    const artist = searchParams.get('artist')

    let recommendations = []

    // 1. Attempt JioSaavn's internal reco.getreco first
    if (songId) {
      try {
        const data = await fetchSaavn('reco.getreco', { pid: songId })
        const list = data?.[songId] || (Array.isArray(data) ? data : [])
        if (Array.isArray(list) && list.length > 0) {
          // Normalize recommendations if they are in raw format
          recommendations = list.map(song => {
            if (!song) return null
            let artistName = song.primary_artists || song.singers || 'Unknown Artist'
            artistName = artistName.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"')
            
            let title = song.song || song.title || 'Unknown Track'
            title = title.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"')

            let imageUrl = song.image || null
            if (imageUrl) {
              imageUrl = imageUrl.replace('150x150', '500x500').replace('50x50', '500x500')
            }

            return {
              id: `saavn_${song.id}`,
              rawId: song.id,
              title,
              artist: artistName,
              album: song.album || '',
              image_url: imageUrl,
              audio_url: `/api/saavn/play/${song.id}`,
              duration: parseInt(song.duration || '0', 10),
              year: song.year || '',
              source: 'saavn',
              is_favorite: false
            }
          }).filter(Boolean)
          console.log(`✅ Recommendations loaded via reco.getreco: found ${recommendations.length} items`)
        }
      } catch (err) {
        console.warn("JioSaavn internal reco endpoint error:", err.message)
      }
    }

    // 2. Fallback: Search similar songs by the primary artist
    if (recommendations.length === 0 && artist) {
      try {
        // Extract primary artist
        const cleanArtist = artist
          .split(/,|\b&\b|\bvs\b|\bfeat\b/i)[0]
          .replace(/Yo Yo/i, 'Yo Yo')
          .trim()

        console.log(`🔍 Recommendations Lookup: Fetching songs by artist "${cleanArtist}"`)
        const artistSongs = await searchSongs(cleanArtist, 25)
        
        if (artistSongs && artistSongs.length > 0) {
          // Filter out the currently playing song
          recommendations = artistSongs.filter(s => s.rawId !== songId)
          
          // Shuffle the remaining list to give fresh suggestions each time
          recommendations.sort(() => Math.random() - 0.5)
          
          // Slice to a reasonable recommendation set
          recommendations = recommendations.slice(0, 15)
          console.log(`✅ Recommendations loaded via Artist Search fallback: resolved ${recommendations.length} songs`)
        }
      } catch (err) {
        console.error("Artist Search recommendation fallback failed:", err)
      }
    }

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error("❌ Recommendations API route failure:", error)
    return NextResponse.json({ error: error.message, recommendations: [] }, { status: 500 })
  }
}
