import { NextResponse } from 'next/server'
import { getLaunchData } from '@/utils/saavn'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const launchData = await getLaunchData()
    return NextResponse.json(launchData)
  } catch (error) {
    console.error('❌ JioSaavn Home API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
