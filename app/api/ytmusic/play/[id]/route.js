import { getYTStream } from '@/utils/ytmusic'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id

    if (!id) {
      return new Response('Video ID is required', { status: 400 })
    }

    console.log(`📡 Resolving YouTube stream for video ID: ${id}`)
    const result = await getYTStream(id)

    if (!result || !result.stream) {
      console.error(`❌ Could not resolve YouTube stream for: ${id}`)
      return new Response('Stream could not be resolved', { status: 404 })
    }

    console.log(`🔗 Streaming YouTube audio directly: mime=${result.mimeType}, size=${result.contentLength}`)
    
    const headers = {
      'Content-Type': result.mimeType || 'audio/mp4',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
    
    if (result.contentLength) {
      headers['Content-Length'] = String(result.contentLength)
    }

    return new Response(result.stream, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('❌ YouTube Music Play API route failure:', error)
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
