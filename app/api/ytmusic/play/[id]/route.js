import { getYTStream, getYtInstance } from '@/utils/ytmusic'
import { searchSongs, getSongStreamUrl } from '@/utils/saavn'

export const dynamic = 'force-dynamic'

// Clean up title and artist to make saavn search more accurate
function cleanSearchQuery(title, artist) {
  let cleanTitle = title
    .replace(/\(from\s+[^)]+\)/gi, '')
    .replace(/\(feat\.[^)]+\)/gi, '')
    .replace(/\(official\s+[^)]+\)/gi, '')
    .replace(/\bLyrical\b/gi, '')
    .replace(/\bAudio\b/gi, '')
    .replace(/\bVideo\b/gi, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\([^)]+\)/g, '')
    .trim()
  
  let cleanArtist = artist
    .replace(/- Topic\b/gi, '')
    .replace(/\bVEVO\b/gi, '')
    .trim()
    
  return `${cleanTitle} ${cleanArtist}`
}

function findBestSaavnMatch(saavnSongs, ytTitle) {
  const lowercaseYtTitle = ytTitle.toLowerCase();
  const isYtInstrumental = lowercaseYtTitle.includes('instrumental') || lowercaseYtTitle.includes('karaoke');
  const isYtCover = lowercaseYtTitle.includes('cover') || lowercaseYtTitle.includes('tribute') || lowercaseYtTitle.includes('tribute cover');
  const isYtRemix = lowercaseYtTitle.includes('remix');

  for (const song of saavnSongs) {
    const lowercaseSaavnTitle = song.title.toLowerCase();
    
    // Check if the Saavn match is an instrumental/karaoke/cover, but the original YouTube video was NOT
    const isSaavnInstrumental = lowercaseSaavnTitle.includes('instrumental') || lowercaseSaavnTitle.includes('karaoke');
    const isSaavnCover = lowercaseSaavnTitle.includes('cover') || lowercaseSaavnTitle.includes('tribute') || lowercaseSaavnTitle.includes('tribute cover');
    const isSaavnRemix = lowercaseSaavnTitle.includes('remix');

    if (!isYtInstrumental && isSaavnInstrumental) continue;
    if (!isYtCover && isSaavnCover) continue;
    if (!isYtRemix && isSaavnRemix) continue;

    // Found a good match that doesn't mismatch on cover/instrumental/remix tags
    return song;
  }

  // Fallback to the first song if no strict match satisfies the filter
  return saavnSongs[0];
}

async function getJioSaavnFallbackUrl(id, queryTitle, queryArtist) {
  try {
    let title = queryTitle || null
    let author = queryArtist || null

    // 1. Try public YouTube oEmbed endpoint (very fast, no proxy needed, never blocked)
    if (!title || !author) {
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
    }

    // 2. Fallback to youtubei.js if oEmbed failed
    if (!title || !author) {
      console.log(`📡 Falling back to Innertube for metadata resolution...`)
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

    const { searchParams } = new URL(request.url)
    const queryTitle = searchParams.get('title')
    const queryArtist = searchParams.get('artist')

    const isVercel = process.env.VERCEL === '1'
    const hasProxy = !!process.env.PROXY_HOST

    if (isVercel && !hasProxy) {
      console.log(`📡 Vercel environment without proxy detected. Attempting JioSaavn fallback for YouTube ID: ${id}`)
      const redirectUrl = await getJioSaavnFallbackUrl(id, queryTitle, queryArtist)
      if (redirectUrl) {
        console.log(`🔗 Redirecting Vercel client to JioSaavn CDN: ${redirectUrl}`)
        return new Response(null, {
          status: 307,
          headers: {
            'Location': redirectUrl,
            'Access-Control-Allow-Origin': '*'
          }
        })
      }
    }

    console.log(`📡 Resolving YouTube stream for video ID: ${id} (isVercel=${isVercel}, hasProxy=${hasProxy})`)
    
    // Attempt direct streaming with a strict 3.5-second timeout to prevent serverless function hangs
    const result = await Promise.race([
      getYTStream(id),
      new Promise((_, reject) => setTimeout(() => reject(new Error('YouTube stream resolution timed out')), 3500))
    ]).catch(err => {
      console.warn(`⚠️ YouTube direct stream resolution failed or timed out:`, err.message)
      return null
    })

    if (result && result.stream) {
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
    }

    if (isVercel && hasProxy) {
      console.warn(`⚠️ Proxy streaming failed on Vercel. Trying JioSaavn fallback as last resort...`)
      const redirectUrl = await getJioSaavnFallbackUrl(id, queryTitle, queryArtist)
      if (redirectUrl) {
        console.log(`🔗 Redirecting Vercel client to JioSaavn CDN (last resort): ${redirectUrl}`)
        return new Response(null, {
          status: 307,
          headers: {
            'Location': redirectUrl,
            'Access-Control-Allow-Origin': '*'
          }
        })
      }
    }

    console.error(`❌ Could not resolve YouTube stream for: ${id}`)
    return new Response('Stream could not be resolved', { status: 404 })
  } catch (error) {
    console.error('❌ YouTube Music Play API route failure:', error)
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
