import { NextResponse } from 'next/server'
import { getArtistDetails } from '@/utils/saavn'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 })
    }

    const artistDetails = await getArtistDetails(id)
    return NextResponse.json(artistDetails)
  } catch (error) {
    console.error(`❌ JioSaavn Artist API error (ID: ${request.url}):`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
