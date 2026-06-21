import { getYTStream } from '@/utils/ytmusic'
import { searchSongs, getSongStreamUrl } from '@/utils/saavn'

export const dynamic = 'force-dynamic'

function cleanSearchQuery(title, artist) {
  if (!title) return ''
  let cleanTitle = title
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/official video/i, '')
    .replace(/official music video/i, '')
    .replace(/official audio/i, '')
    .replace(/lyric video/i, '')
    .replace(/lyrics/i, '')
    .replace(/hd/i, '')
    .replace(/4k/i, '')
    .trim()

  let cleanArtist = (artist || '')
    .replace(/vevo/i, '')
    .replace(/official/i, '')
    .trim()

  return `${cleanTitle} ${cleanArtist}`.trim()
}

function findBestSaavnMatch(saavnSongs, ytTitle) {
  const lowercaseYtTitle = ytTitle.toLowerCase();
  const isYtInstrumental = lowercaseYtTitle.includes('instrumental') || lowercaseYtTitle.includes('karaoke');
  const isYtCover = lowercaseYtTitle.includes('cover') || lowercaseYtTitle.includes('tribute') || lowercaseYtTitle.includes('tribute cover');
  const isYtRemix = lowercaseYtTitle.includes('remix');

  for (const song of saavnSongs) {
    const lowercaseSaavnTitle = song.title.toLowerCase();
    
    const isSaavnInstrumental = lowercaseSaavnTitle.includes('instrumental') || lowercaseSaavnTitle.includes('karaoke');
    const isSaavnCover = lowercaseSaavnTitle.includes('cover') || lowercaseSaavnTitle.includes('tribute') || lowercaseSaavnTitle.includes('tribute cover');
    const isSaavnRemix = lowercaseSaavnTitle.includes('remix');

    if (!isYtInstrumental && isSaavnInstrumental) continue;
    if (!isYtCover && isSaavnCover) continue;
    if (!isYtRemix && isSaavnRemix) continue;

    return song;
  }

  return saavnSongs[0];
}

async function getJioSaavnFallbackUrl(id) {
  try {
    let title = null
    let author = null

    try {
      console.log(`📡 Fetching metadata for YouTube video ID ${id} via oEmbed...`)
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
      if (res.ok) {
        const data = await res.json()
        title = data.title
        author = data.author_name
        console.log(`✅ Metadata resolved via oEmbed: "${title}" by "${author}"`)
      }
    } catch (oembedErr) {
      console.warn(`⚠️ oEmbed metadata lookup failed:`, oembedErr.message)
    }

    if (!title || !author) {
      console.log(`📡 Falling back to Innertube for metadata resolution...`)
      const { getYtInstance } = await import('@/utils/ytmusic')
      const yt = await getYtInstance()
      const info = await yt.getBasicInfo(id, { client: 'ANDROID_VR' })
      title = info.basic_info?.title
      author = info.basic_info?.author
    }

    if (title && author) {
      const query = cleanSearchQuery(title, author)
      console.log(`🔍 Searching JioSaavn for fallback: "${query}"`)
      const saavnSongs = await searchSongs(query, 5)

      if (saavnSongs.length > 0) {
        const bestMatch = findBestSaavnMatch(saavnSongs, title)
        console.log(`✅ Found JioSaavn match: ${bestMatch.title} (ID: ${bestMatch.rawId})`)
        const streamUrl = await getSongStreamUrl(bestMatch.rawId)
        if (streamUrl) {
          return streamUrl
        }
      }
    }
  } catch (err) {
    console.error(`❌ JioSaavn fallback failed:`, err.message)
  }
  return null
}

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

    console.log(`⚠️ YouTube stream resolution failed. Attempting JioSaavn fallback for ID: ${id}...`)
    const fallbackUrl = await getJioSaavnFallbackUrl(id)
    if (fallbackUrl) {
      console.log(`✅ Redirecting to JioSaavn fallback: ${fallbackUrl}`)
      return new Response(null, {
        status: 307,
        headers: {
          'Location': fallbackUrl,
          'Cache-Control': 'public, max-age=60'
        }
      })
    }

    console.error(`❌ Could not resolve YouTube stream or find fallback for: ${id}`)
    return new Response('Stream could not be resolved', { status: 404 })
  } catch (error) {
    console.error('❌ YouTube Music Play API route failure:', error)
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
