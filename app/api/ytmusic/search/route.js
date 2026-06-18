import { NextResponse } from 'next/server'
import { searchYTMusic } from '@/utils/ytmusic'

export async function POST(request) {
  try {
    const { query } = await request.json()

    if (!query || !query.trim()) {
      return NextResponse.json({ songs: [] })
    }

    console.log(`📡 YouTube Music search initiated for: "${query}"`)
    const songs = await searchYTMusic(query.trim())

    return NextResponse.json({ songs })
  } catch (error) {
    console.error("❌ YouTube Music search API route failure:", error)
    return NextResponse.json({ error: error.message, songs: [] }, { status: 500 })
  }
}
