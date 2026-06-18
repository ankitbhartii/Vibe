import { NextResponse } from 'next/server'
import { getSongLyrics } from '@/utils/saavn'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const title = searchParams.get('title')
    const artist = searchParams.get('artist')

    let data = { lyrics: '', copyright: '' }

    // 1. Try JioSaavn first
    if (id) {
      try {
        const saavnData = await getSongLyrics(id)
        if (saavnData && saavnData.lyrics && !saavnData.lyrics.includes('failure')) {
          data = saavnData
        }
      } catch (err) {
        console.warn("JioSaavn lyrics fetch failed, falling back to LRCLIB:", err.message)
      }
    }

    // 2. If JioSaavn failed, returned nothing, or returned failure status, fallback to LRCLIB
    if ((!data.lyrics || data.lyrics.includes('failure')) && title && artist) {
      try {
        // Clean up title (remove parenthesis and brackets like "(From ...)", "[Remix]", etc.)
        const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim()
        
        // Clean up artist (extract primary artist by splitting on comma, &, vs, feat. and trim)
        const cleanArtist = artist
          .split(/,|\b&\b|\bvs\b|\bfeat\b/i)[0]
          .replace(/Yo Yo/i, 'Yo Yo')
          .trim()

        console.log(`🔍 LRCLIB Lookup: Querying lyrics for "${cleanTitle}" by "${cleanArtist}"`)
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`
        
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'VibeMusicPlayer/1.0 (contact: github.com/ankit)'
          }
        })

        if (res.ok) {
          const lrcData = await res.json()
          if (lrcData && lrcData.plainLyrics) {
            // Convert newline carriage returns to <br> format expected by frontend component
            const formattedLyrics = lrcData.plainLyrics.replace(/\r?\n/g, '<br>')
            data = {
              lyrics: formattedLyrics,
              syncedLyrics: lrcData.syncedLyrics || '',
              copyright: lrcData.albumName ? `From album: ${lrcData.albumName} (Lyrics via LRCLIB)` : 'Lyrics provided by LRCLIB'
            }
            console.log(`✅ LRCLIB Match: Found lyrics for "${cleanTitle}"`)
          }
        } else {
          console.log(`⚠️ LRCLIB Miss: Returned status ${res.status} for "${cleanTitle}" by "${cleanArtist}"`)
        }
      } catch (err) {
        console.error("❌ LRCLIB fallback execution failed:", err)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ JioSaavn lyrics API route failure:", error)
    return NextResponse.json(
      { error: error.message, lyrics: '' },
      { status: 500 }
    )
  }
}
