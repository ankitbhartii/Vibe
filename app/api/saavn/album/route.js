import { NextResponse } from 'next/server'
import { getAlbumDetails } from '@/utils/saavn'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Album ID is required' }, { status: 400 })
    }

    const albumDetails = await getAlbumDetails(id)
    return NextResponse.json(albumDetails)
  } catch (error) {
    console.error(`❌ JioSaavn Album API error (ID: ${request.url}):`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
