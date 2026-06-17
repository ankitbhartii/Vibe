import { NextResponse } from 'next/server'
import { getPlaylistDetails } from '@/utils/saavn'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 })
    }

    const playlistDetails = await getPlaylistDetails(id)
    return NextResponse.json(playlistDetails)
  } catch (error) {
    console.error(`❌ JioSaavn Playlist API error:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
