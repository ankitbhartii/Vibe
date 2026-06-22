// Local Machine Learning Preference Engine for Vibe Music Player
// Builds a user preference profile based on listening history, search terms, likes, and skips.
// Ranks and weights recommendations using multi-factor interest scoring.

const PROFILE_KEY = 'vibe_user_preference_profile'

const DEFAULT_PROFILE = {
  preferredArtists: {},   // e.g., { "Arijit Singh": 12, "Mitraz": 8 }
  preferredLanguages: {}, // e.g., { "Hindi": 15, "English": 6 }
  searchKeywords: [],     // recent search query terms
  dislikedSongIds: {},    // e.g., { "song_id": true } (heavily skipped or manually removed)
  preferredGenres: {},    // e.g., { "Indie": 5, "Pop": 10 }
  totalPlays: 0
}

// Retrieves profile from localStorage
export function getProfile() {
  if (typeof window === 'undefined') return DEFAULT_PROFILE
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const profile = JSON.parse(raw)
    // Merge with defaults to ensure backward compatibility
    return { ...DEFAULT_PROFILE, ...profile }
  } catch (err) {
    console.error('Failed to parse preference profile:', err)
    return DEFAULT_PROFILE
  }
}

// Persists profile to localStorage
function saveProfile(profile) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch (err) {
    console.error('Failed to save preference profile:', err)
  }
}

// Logs search keywords to build taste affinity
export function logSearchQuery(query) {
  if (!query || typeof query !== 'string') return
  const profile = getProfile()
  
  // Tokenize and clean search terms
  const terms = query
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, '') // Keep alphanumeric + Hindi characters
    .split(/\s+/)
    .filter(t => t.length > 2) // skip very short words
    
  if (terms.length === 0) return

  // Prep recent keywords list (keep last 30 keywords)
  const currentKeywords = [...profile.searchKeywords]
  terms.forEach(term => {
    const idx = currentKeywords.indexOf(term)
    if (idx !== -1) currentKeywords.splice(idx, 1) // move to front/end (most recent)
    currentKeywords.push(term)
  })

  if (currentKeywords.length > 30) {
    currentKeywords.splice(0, currentKeywords.length - 30)
  }

  profile.searchKeywords = currentKeywords
  saveProfile(profile)
}

// Update taste weights based on user action (full play, early skip, like, unlike)
export function updateProfileOnInteraction(track, durationListened = 0, totalDuration = 0, action = '') {
  if (!track) return
  const profile = getProfile()
  
  const artist = track.artist || ''
  const songId = track.id
  
  // 1. Detect if it was an early skip (less than 20 seconds or under 20% of track length)
  const isSkip = action === 'skip' || (totalDuration > 30 && durationListened < 20) || (totalDuration > 0 && durationListened / totalDuration < 0.20)
  
  // 2. Detect if it was a complete play (listened to >70% of the track)
  const isCompletePlay = action === 'complete' || (totalDuration > 0 && durationListened / totalDuration >= 0.70)

  // Initialize weights if not exists
  if (artist) {
    profile.preferredArtists[artist] = profile.preferredArtists[artist] || 0
  }

  // Adjust weights
  if (action === 'like') {
    // Heavy positive reinforcement
    if (artist) profile.preferredArtists[artist] += 5
    if (profile.dislikedSongIds[songId]) delete profile.dislikedSongIds[songId]
  } else if (action === 'unlike') {
    if (artist) profile.preferredArtists[artist] = Math.max(0, (profile.preferredArtists[artist] || 0) - 5)
  } else if (isSkip) {
    // Negative reinforcement
    if (artist) profile.preferredArtists[artist] = Math.max(0, (profile.preferredArtists[artist] || 0) - 2)
    profile.dislikedSongIds[songId] = (profile.dislikedSongIds[songId] || 0) + 1
  } else if (isCompletePlay) {
    // Standard positive reinforcement
    if (artist) profile.preferredArtists[artist] += 1
    profile.totalPlays += 1
  }

  // Cap artist weights to prevent runaway values
  if (artist && profile.preferredArtists[artist] > 50) {
    profile.preferredArtists[artist] = 50
  }

  saveProfile(profile)
}

// Marks a song as disliked/removed
export function markAsDisliked(songId) {
  if (!songId) return
  const profile = getProfile()
  profile.dislikedSongIds[songId] = (profile.dislikedSongIds[songId] || 0) + 3 // heavy penalty
  saveProfile(profile)
}

// Computes a match score for a track and sorts the list descending
export function scoreAndSortTracks(tracks, seedTrack = null) {
  if (!Array.isArray(tracks) || tracks.length === 0) return []
  const profile = getProfile()

  const scored = tracks.map(track => {
    let score = 0

    // 1. Artist Affinity (weights up to +10.0)
    const artist = track.artist || ''
    if (artist && profile.preferredArtists[artist]) {
      const weight = profile.preferredArtists[artist]
      score += Math.min(10.0, weight * 0.5) // Scale down weight to reasonable range
    }

    // 2. Disliked / Skipped Songs Penalty (heavy negative, up to -100)
    const songId = track.id
    if (profile.dislikedSongIds[songId]) {
      score -= (profile.dislikedSongIds[songId] * 10.0)
    }

    // 3. Search History Keywords Match (up to +5.0)
    const titleLower = (track.title || '').toLowerCase()
    const artistLower = artist.toLowerCase()
    let keywordMatches = 0
    
    profile.searchKeywords.forEach(keyword => {
      if (titleLower.includes(keyword) || artistLower.includes(keyword)) {
        keywordMatches++
      }
    })
    
    score += Math.min(5.0, keywordMatches * 1.5)

    // 4. Seed Track Similarity (Up next context boost, up to +3.0)
    if (seedTrack) {
      // Artist matches seed track
      if (artist && seedTrack.artist && artist.toLowerCase() === seedTrack.artist.toLowerCase()) {
        score += 3.0
      }
      
      // Title overlap with seed track (e.g. shared words in remix or cover)
      const seedTitleTerms = (seedTrack.title || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 3) // only match meaningful words
        
      let titleTermMatches = 0
      seedTitleTerms.forEach(term => {
        if (titleLower.includes(term)) titleTermMatches++
      })
      score += Math.min(2.0, titleTermMatches * 1.0)
    }

    // 5. Implicit Randomization / Exploration factor (slight jitter)
    // Ensures recommendations aren't completely static and allow discovery
    score += (Math.random() * 0.5)

    return { track, score }
  })

  // Sort descending by score
  return scored
    .sort((a, b) => b.score - a.score)
    .map(item => item.track)
}
