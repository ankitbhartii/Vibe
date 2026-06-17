import { NextResponse } from 'next/server'
import { searchTracks } from '@/utils/tidal'

export async function POST(request) {
  try {
    const { query } = await request.json()

    if (!query || !query.trim()) {
      return NextResponse.json({ tracks: [] })
    }

    console.log(`📡 Tidal search initiated for: "${query}"`)
    const normalizedTracks = await searchTracks(query.trim())

    return NextResponse.json({ tracks: normalizedTracks })
  } catch (error) {
    console.error("❌ Tidal search API route failure:", error)
    return NextResponse.json({ error: error.message, tracks: [] }, { status: 500 })
  }
}