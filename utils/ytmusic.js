import { Innertube, Platform } from 'youtubei.js'
import { exec } from 'child_process'
import util from 'util'

// Configure signature decipher shim for Vercel and Node environments
Platform.shim.eval = (code, env) => {
  return new Function(code.output)();
};

const execPromise = util.promisify(exec)

let ytInstance = null
let proxyAgent = null

// Initialize ProxyAgent on load if proxy settings are configured
const proxyHost = process.env.PROXY_HOST
const proxyPort = process.env.PROXY_PORT
const proxyUser = process.env.PROXY_USERNAME
const proxyPass = process.env.PROXY_PASSWORD
const protocol = process.env.PROXY_PROTOCOL || 'http'
const useProxyEnabled = process.env.VERCEL === '1' || process.env.FORCE_PROXY === '1'

if (useProxyEnabled && proxyHost && proxyPort) {
  try {
    const { ProxyAgent } = await import('undici')
    const authPart = proxyUser && proxyPass ? `${proxyUser}:${proxyPass}@` : ''
    const proxyUrl = `${protocol}://${authPart}${proxyHost}:${proxyPort}`
    proxyAgent = new ProxyAgent(proxyUrl)
    console.log(`📡 Selective proxy active: ${protocol}://***:***@${proxyHost}:${proxyPort}`)
  } catch (err) {
    console.error("❌ Failed to initialize ProxyAgent:", err)
  }
}

// Override Platform.shim.fetch globally to selectively route through the proxy
const originalPlatformFetch = Platform.shim.fetch
Platform.shim.fetch = function(input, init) {
  const urlStr = typeof input === 'string' ? input : (input.url || '')

  // Only proxy actual media streams (googlevideo.com) and the playback endpoint (/youtubei/v1/player)
  const isPlaybackOrStream = urlStr.includes('googlevideo.com') || urlStr.includes('/youtubei/v1/player')

  if (proxyAgent && isPlaybackOrStream) {
    console.log(`📡 [Proxied Request] ${urlStr.slice(0, 120)}...`)
    return originalPlatformFetch(input, {
      ...init,
      dispatcher: proxyAgent
    })
  }

  // Otherwise, use direct high-speed connection
  return originalPlatformFetch(input, init)
}

export async function getYtInstance() {
  if (!ytInstance) {
    console.log("📡 Initializing single Innertube instance directly (selective proxy active)...")
    ytInstance = await Innertube.create()
  }
  return ytInstance
}

/**
 * Searches YouTube Music / YouTube videos and normalizes them into standard track objects
 */
export async function searchYTMusic(query, limit = 20) {
  try {
    console.log(`📡 Searching YouTube Music catalog for: "${query}"...`)
    const yt = await getYtInstance()
    const results = await yt.music.search(query, { type: 'song' })

    if (!results || !results.songs || !results.songs.contents) {
      console.log(`⚠️ No songs found in YouTube Music search results for "${query}"`)
      return []
    }

    return results.songs.contents.slice(0, limit).map(song => {
      // Extract thumbnail url
      let thumbnail = null
      if (song.thumbnail && song.thumbnail.contents && song.thumbnail.contents.length > 0) {
        // Take the highest resolution thumbnail (usually the last one in the contents array)
        thumbnail = song.thumbnail.contents[song.thumbnail.contents.length - 1].url
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
    ytInstance = null
    return []
  }
}

export async function getYTStream(videoId, range = undefined) {
  try {
    console.log(`📡 Resolving YouTube stream for video ID: ${videoId} using youtubei.js with ANDROID_VR client (range=${range ? `${range.start}-${range.end || ''}` : 'none'})...`)
    const yt = await getYtInstance()
    const info = await yt.getBasicInfo(videoId, { client: 'ANDROID_VR' })
    const format = info.chooseFormat({
      type: 'audio',
      quality: 'best',
      client: 'ANDROID_VR'
    })
    const downloadOpts = {
      type: 'audio',
      quality: 'best',
      client: 'ANDROID_VR'
    }
    if (range) {
      downloadOpts.range = range
    }
    const stream = await info.download(downloadOpts)
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
