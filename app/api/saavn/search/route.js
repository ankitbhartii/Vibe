import { NextResponse } from 'next/server'
import { searchSongs, searchAlbums, searchPlaylists } from '@/utils/saavn'

export async function POST(request) {
  try {
    const { query } = await request.json()

    if (!query || !query.trim()) {
      return NextResponse.json({ songs: [], albums: [], playlists: [] })
    }

    const trimmed = query.trim()
    console.log(`📡 JioSaavn unified search initiated for: "${trimmed}"`)

    const [songs, albums, playlists] = await Promise.all([
      searchSongs(trimmed, 20),
      searchAlbums(trimmed, 10),
      searchPlaylists(trimmed, 10)
    ])

    return NextResponse.json({ songs, albums, playlists })
  } catch (error) {
    console.error("❌ JioSaavn search API route failure:", error)
    return NextResponse.json(
      { error: error.message, songs: [], albums: [], playlists: [] },
      { status: 500 }
    )
  }
}
