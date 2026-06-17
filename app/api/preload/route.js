import { NextResponse } from 'next/server'
import { resolveStreamUrl } from '@/utils/tidal'

export const dynamic = 'force-dynamic'

/**
 * GET /api/preload?id=<trackId>&isrc=<isrc>
 * 
 * Pre-warms the stream resolution cache for a given track.
 * Called in the background when user hovers over a track card
 * so that when they actually click Play, the URL is already cached.
 * 
 * Returns the resolved type and a success flag (not the URL itself for security).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('id')
    const isrc = searchParams.get('isrc')

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    console.log(`🔥 Pre-warming cache for track: ${trackId} (ISRC: ${isrc || 'None'})`)
    const result = await resolveStreamUrl(trackId, 'HIGH', isrc)

    return NextResponse.json({
      success: true,
      type: result.type,
      cached: true,
      trackId,
    })
  } catch (error) {
    // Don't fail loudly — preload is best-effort
    console.warn(`⚠️ Preload failed for track:`, error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 200 })
  }
}
