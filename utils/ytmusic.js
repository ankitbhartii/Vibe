import { Innertube } from 'youtubei.js'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

let ytInstance = null

async function getYtInstance() {
  if (!ytInstance) {
    ytInstance = await Innertube.create()
  }
  return ytInstance
}

/**
 * Searches YouTube Music / YouTube videos and normalizes them into standard track objects
 */
export async function searchYTMusic(query, limit = 20) {
  try {
    console.log(`📡 Searching YouTube Music catalog for: "${query}" using youtubei.js...`)
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
    ytInstance = null
    return []
  }
}

/**
 * Resolves the direct high-quality audio stream URL from YouTube using yt-dlp
 */
export async function getYTStreamUrl(videoId) {
  try {
    console.log(`📡 Resolving YouTube stream URL for video ID: ${videoId} using yt-dlp...`)
    const { stdout, stderr } = await execPromise(`yt-dlp -f bestaudio -g "${videoId}"`)
    const url = stdout.trim()
    if (!url) {
      if (stderr) {
        console.error(`❌ yt-dlp stderr: ${stderr}`)
      }
      return null
    }
    return url
  } catch (err) {
    console.error(`❌ yt-dlp failed to resolve stream for video ID: ${videoId}:`, err)
    return null
  }
}
