import { NextResponse } from 'next/server'
import { getNavidromeTracks } from '@/utils/subsonic'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log("📡 Fetching tracks from local Navidrome library...")
    const tracks = await getNavidromeTracks(50)
    return NextResponse.json({ tracks })
  } catch (error) {
    console.error("❌ Navidrome tracks fetch error:", error)
    return NextResponse.json({ error: error.message, tracks: [] }, { status: 500 })
  }
}
