import { NextResponse } from 'next/server'
import { getTopArtists } from '@/utils/saavn'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const topArtists = await getTopArtists()
    return NextResponse.json(topArtists)
  } catch (error) {
    console.error(`❌ JioSaavn Top Artists API error:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
