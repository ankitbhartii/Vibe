import { NextResponse } from 'next/server'
import { searchNavidrome } from '@/utils/subsonic'

export async function POST(request) {
  try {
    const { query } = await request.json()
    
    if (!query || !query.trim()) {
      return NextResponse.json({ tracks: [] })
    }
    
    console.log(`📡 Searching Navidrome catalog for: "${query}"`)
    const tracks = await searchNavidrome(query.trim())
    return NextResponse.json({ tracks })
  } catch (error) {
    console.error("❌ Navidrome search error:", error)
    return NextResponse.json({ error: error.message, tracks: [] }, { status: 500 })
  }
}
