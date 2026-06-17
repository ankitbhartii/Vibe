// utils/subsonic.js
import crypto from 'crypto'

const NAVIDROME_URL = process.env.NEXT_PUBLIC_NAVIDROME_URL || 'http://localhost:4533/rest'
const USERNAME = process.env.NAVIDROME_USERNAME || 'admin'
const PASSWORD = process.env.NAVIDROME_PASSWORD || 'admin'

/**
 * Builds the authenticated query parameters required for standard Subsonic REST API.
 */
export function getSubsonicParams() {
  const salt = crypto.randomBytes(8).toString('hex')
  const token = crypto.createHash('md5').update(PASSWORD + salt).digest('hex')
  
  const params = new URLSearchParams()
  params.set('u', USERNAME)
  params.set('t', token)
  params.set('s', salt)
  params.set('v', '1.16.1')
  params.set('c', 'vibe-player')
  params.set('f', 'json')
  
  return params
}

/**
 * Normalizes Navidrome Subsonic song structures to the Vibe Player's format.
 */
export function normalizeSubsonicTrack(song) {
  return {
    id: `navidrome_${song.id}`,
    title: song.title || 'Unknown Track',
    artist: song.artist || 'Unknown Artist',
    album: song.album || '',
    image_url: song.coverArt ? `${NAVIDROME_URL}/getCoverArt.view?${getSubsonicParams().toString()}&id=${song.coverArt}` : null,
    audio_url: `${NAVIDROME_URL}/stream.view?${getSubsonicParams().toString()}&id=${song.id}`,
    source: 'local',
    duration: song.duration || 0,
  }
}

/**
 * Fetches a list of random songs from the Navidrome library.
 */
export async function getNavidromeTracks(limit = 30) {
  try {
    const params = getSubsonicParams()
    params.set('size', String(limit))
    
    const url = `${NAVIDROME_URL}/getRandomSongs.view?${params.toString()}`
    const res = await fetch(url, { cache: 'no-store' })
    
    if (!res.ok) throw new Error(`Subsonic getRandomSongs failed: ${res.status}`)
    const data = await res.json()
    
    const songs = data['subsonic-response']?.randomSongs?.song || []
    return Array.isArray(songs) ? songs.map(normalizeSubsonicTrack) : [normalizeSubsonicTrack(songs)]
  } catch (error) {
    console.error('Error fetching random songs from Navidrome:', error)
    return []
  }
}

/**
 * Searches the Navidrome Subsonic catalog.
 */
export async function searchNavidrome(query) {
  try {
    const params = getSubsonicParams()
    params.set('query', query)
    
    const url = `${NAVIDROME_URL}/search3.view?${params.toString()}`
    const res = await fetch(url, { cache: 'no-store' })
    
    if (!res.ok) throw new Error(`Subsonic search3 failed: ${res.status}`)
    const data = await res.json()
    
    const songs = data['subsonic-response']?.searchResult3?.song || []
    return Array.isArray(songs) ? songs.map(normalizeSubsonicTrack) : [normalizeSubsonicTrack(songs)]
  } catch (error) {
    console.error('Error searching Navidrome library:', error)
    return []
  }
}
