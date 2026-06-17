import { getSongStreamUrl } from '@/utils/saavn'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    // Await params to support Next.js 15+ asynchronous dynamic parameters
    const resolvedParams = await params
    const id = resolvedParams.id

    if (!id) {
      return new Response('Song ID is required', { status: 400 })
    }

    console.log(`📡 Resolving JioSaavn playback stream for track: ${id}`)
    const streamUrl = await getSongStreamUrl(id)

    if (!streamUrl) {
      console.error(`❌ Could not resolve stream URL for JioSaavn track: ${id}`)
      return new Response('Stream URL could not be resolved', { status: 404 })
    }

    console.log(`🔗 Redirecting stream request to JioSaavn CDN: ${streamUrl}`)
    
    // Return a 307 redirect so the browser can stream directly from JioSaavn CDN
    return new Response(null, {
      status: 307,
      headers: {
        'Location': streamUrl,
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('❌ JioSaavn Play API route failure:', error)
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
