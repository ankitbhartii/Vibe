import { NextResponse } from 'next/server'
import { getYtInstance } from '@/utils/ytmusic'

export const dynamic = 'force-dynamic'

function parseDuration(durationStr) {
  if (!durationStr) return 0
  const parts = durationStr.split(':').map(Number)
  if (parts.some(isNaN)) return 0
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return 0
}

/**
 * YouTube Music Recommendations API
 * 
 * Fetches related/recommended videos for a given YouTube video ID.
 * Uses youtubei.js (Innertube) watch_next_feed directly.
 * 
 * Returns normalized track objects enriched with YouTube metadata (views, date).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (!videoId?.trim()) {
      return NextResponse.json({ recommendations: [] })
    }

    console.log(`📡 YouTube recommendations requested via Innertube for: ${videoId}`)

    const yt = await getYtInstance()
    const info = await yt.getInfo(videoId)
    
    if (!info.watch_next_feed) {
      console.warn(`⚠️ No watch_next_feed found for video ${videoId}`)
      return NextResponse.json({ recommendations: [] })
    }

    const items = Array.isArray(info.watch_next_feed) ? info.watch_next_feed : Object.values(info.watch_next_feed)
    const videoItems = items.filter(item => item.content_type === 'VIDEO')
    
    const recommendations = videoItems.slice(0, limit).map(item => {
      const rawId = item.content_id
      const title = item.metadata?.title?.text || 'Unknown Title'
      
      const metaRows = item.metadata?.metadata?.metadata_rows || []
      const artist = metaRows[0]?.metadata_parts?.[0]?.text?.text || 'YouTube Music'
      
      // Extract views and publish time ago from the second metadata row
      const views = metaRows[1]?.metadata_parts?.[0]?.text?.text || null
      const timeAgo = metaRows[1]?.metadata_parts?.[1]?.text?.text || null
      
      const image = item.content_image?.image?.[0]?.url || item.content_image?.image?.[1]?.url || null
      const durationStr = item.content_image?.overlays?.[0]?.badges?.[0]?.text || ''
      const duration = parseDuration(durationStr)
      
      return {
        id: `yt_${rawId}`,
        rawId,
        title,
        artist,
        album: 'YouTube Music',
        image_url: image,
        audio_url: `/api/ytmusic/play/${rawId}`,
        duration,
        views,      // e.g. "4.4M"
        timeAgo,    // e.g. "2y ago"
        source: 'ytmusic',
        is_favorite: false
      }
    })

    console.log(`✅ Resolved ${recommendations.length} YouTube recommendations directly from Innertube`)
    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error('❌ YouTube recommendations error:', error)
    return NextResponse.json({ recommendations: [], error: error.message }, { status: 500 })
  }
}
