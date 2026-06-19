import { getYTStream } from '@/utils/ytmusic'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id

    if (!id) {
      return new Response('Video ID is required', { status: 400 })
    }

    const isVercel = process.env.VERCEL === '1'
    const hasProxy = !!process.env.PROXY_HOST

    // Parse Range header if present
    const rangeHeader = request.headers.get('range')
    let range = undefined
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : undefined
      if (!isNaN(start)) {
        range = { start, end }
      }
    }

    console.log(`📡 Resolving YouTube stream for video ID: ${id} (isVercel=${isVercel}, hasProxy=${hasProxy}, rangeHeader=${rangeHeader || 'none'})`)
    
    // Attempt direct streaming with a strict 9-second timeout to prevent serverless function hangs on Vercel
    const result = await Promise.race([
      getYTStream(id, range),
      new Promise((_, reject) => setTimeout(() => reject(new Error('YouTube stream resolution timed out')), 9000))
    ]).catch(err => {
      console.warn(`⚠️ YouTube direct stream resolution failed or timed out:`, err.message)
      return null
    })

    if (result && result.stream) {
      const totalSize = result.contentLength || 0
      
      const headers = {
        'Content-Type': result.mimeType || 'audio/mp4',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes'
      }

      let status = 200

      if (range && totalSize > 0) {
        status = 206
        const start = range.start
        const end = range.end !== undefined ? range.end : (totalSize - 1)
        const contentLength = end - start + 1
        headers['Content-Range'] = `bytes ${start}-${end}/${totalSize}`
        headers['Content-Length'] = String(contentLength)
        console.log(`🔗 Streaming YouTube audio range: bytes ${start}-${end}/${totalSize} (size=${contentLength})`)
      } else {
        if (totalSize > 0) {
          headers['Content-Length'] = String(totalSize)
        }
        console.log(`🔗 Streaming YouTube audio directly: mime=${result.mimeType}, size=${totalSize}`)
      }

      return new Response(result.stream, {
        status,
        headers
      })
    }

    console.error(`❌ Could not resolve YouTube stream for: ${id}`)
    return new Response('Stream could not be resolved', { status: 404 })
  } catch (error) {
    console.error('❌ YouTube Music Play API route failure:', error)
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
