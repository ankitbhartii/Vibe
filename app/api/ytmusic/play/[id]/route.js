import { getYTStreamUrl } from '@/utils/ytmusic'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id

    if (!id) {
      return new Response('Video ID is required', { status: 400 })
    }

    console.log(`📡 Resolving YouTube stream for video ID: ${id}`)
    const streamUrl = await getYTStreamUrl(id)

    if (!streamUrl) {
      console.error(`❌ Could not resolve YouTube stream URL for: ${id}`)
      return new Response('Stream URL could not be resolved', { status: 404 })
    }

    console.log(`🔗 Redirecting stream request to Google Video CDN: ${streamUrl.substring(0, 80)}...`)
    
    // Return a 307 redirect so the browser streams directly
    return new Response(null, {
      status: 307,
      headers: {
        'Location': streamUrl,
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('❌ YouTube Music Play API route failure:', error)
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
