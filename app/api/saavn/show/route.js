import { NextResponse } from 'next/server'
import { getShowDetails } from '@/utils/saavn'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Show ID required' }, { status: 400 })
    }
    const data = await getShowDetails(id)
    return NextResponse.json(data)
  } catch (error) {
    console.error(`❌ JioSaavn show API route failure for ${id}:`, error)
    return NextResponse.json(
      { error: error.message, songs: [] },
      { status: 500 }
    )
  }
}
