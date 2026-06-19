import { Innertube, Platform } from 'youtubei.js'
import { exec } from 'child_process'
import util from 'util'

// Configure signature decipher shim for Vercel and Node environments
Platform.shim.eval = (code, env) => {
  return new Function(code.output)();
};

const execPromise = util.promisify(exec)

let ytInstanceProxied = null
let ytInstanceDirect = null

export async function getYtInstance(forceDirect = false) {
  const useProxy = (process.env.VERCEL === '1' || process.env.FORCE_PROXY === '1') && !forceDirect

  if (useProxy) {
    if (!ytInstanceProxied) {
      const proxyHost = process.env.PROXY_HOST
      const proxyPort = process.env.PROXY_PORT
      const proxyUser = process.env.PROXY_USERNAME
      const proxyPass = process.env.PROXY_PASSWORD

      if (proxyHost && proxyPort) {
        const protocol = process.env.PROXY_PROTOCOL || 'http'
        console.log(`📡 Initializing Innertube with Residential Proxy (${protocol}): ${proxyHost}:${proxyPort}`)
        try {
          const { ProxyAgent } = await import('undici')
          const authPart = proxyUser && proxyPass ? `${proxyUser}:${proxyPass}@` : ''
          const proxyUrl = `${protocol}://${authPart}${proxyHost}:${proxyPort}`
          const proxyAgent = new ProxyAgent(proxyUrl)

          ytInstanceProxied = await Innertube.create({
            fetch(input, init) {
              return Platform.shim.fetch(input, {
                ...init,
                dispatcher: proxyAgent
              })
            }
          })
        } catch (proxyError) {
          console.error("❌ Failed to initialize Innertube with ProxyAgent, falling back to direct connection:", proxyError)
          ytInstanceProxied = await Innertube.create()
        }
      } else {
        console.log("📡 Initializing Innertube with direct connection (no proxy configured)...")
        ytInstanceProxied = await Innertube.create()
      }
    }
    return ytInstanceProxied
  } else {
    if (!ytInstanceDirect) {
      console.log("📡 Initializing Innertube with direct connection (forceDirect or localhost)...")
      ytInstanceDirect = await Innertube.create()
    }
    return ytInstanceDirect
  }
}

/**
 * Searches YouTube Music / YouTube videos and normalizes them into standard track objects
 */
export async function searchYTMusic(query, limit = 20) {
  try {
    console.log(`📡 Searching YouTube Music catalog for: "${query}" (direct connection)...`)
    const yt = await getYtInstance(true)
    const results = await yt.music.search(query, { type: 'song' })

    if (!results || !results.songs || !results.songs.contents) {
      console.log(`⚠️ No songs found in YouTube Music search results for "${query}"`)
      return []
    }

    return results.songs.contents.slice(0, limit).map(song => {
      // Extract thumbnail url
      let thumbnail = null
      if (song.thumbnail && song.thumbnail.contents && song.thumbnail.contents.length > 0) {
        thumbnail = song.thumbnail.contents[0].url
      } else if (song.thumbnail && song.thumbnail.url) {
        thumbnail = song.thumbnail.url
      }

      // Extract artist name
      const artistName = song.artists && song.artists.length > 0 
        ? song.artists.map(a => a.name).join(', ') 
        : 'Unknown Artist'

      // Extract album name
      const albumName = song.album && song.album.name 
        ? song.album.name 
        : 'YouTube Music'

      // Extract duration in seconds
      const durationSeconds = song.duration && song.duration.seconds 
        ? song.duration.seconds 
        : 0

      return {
        id: `yt_${song.id}`,
        rawId: song.id,
        title: song.title || 'Unknown Title',
        artist: artistName,
        album: albumName,
        image_url: thumbnail,
        audio_url: `/api/ytmusic/play/${song.id}`,
        duration: durationSeconds,
        source: 'ytmusic',
        is_favorite: false
      }
    })
  } catch (err) {
    console.error("❌ YouTube Music search utility error:", err)
    // Clear instance to force recreation next time on error
    ytInstanceDirect = null
    return []
  }
}

export async function getYTStream(videoId) {
  try {
    console.log(`📡 Resolving YouTube stream for video ID: ${videoId} using youtubei.js with ANDROID_VR client...`)
    const yt = await getYtInstance()
    const info = await yt.getBasicInfo(videoId, { client: 'ANDROID_VR' })
    const format = info.chooseFormat({
      type: 'audio',
      quality: 'best',
      client: 'ANDROID_VR'
    })
    const stream = await info.download({
      type: 'audio',
      quality: 'best',
      client: 'ANDROID_VR'
    })
    return {
      stream,
      mimeType: format.mime_type,
      contentLength: format.content_length
    }
  } catch (err) {
    console.error(`❌ youtubei.js failed to resolve stream for video ID: ${videoId}:`, err)
    return null
  }
}
