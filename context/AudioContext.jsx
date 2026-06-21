'use client'
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

const AudioContext = createContext()

export function AudioProvider({ children }) {
  const [playlist, setPlaylist] = useState([])
  const [currentSong, setCurrentSongState] = useState(null)

  const setCurrentSong = useCallback((songOrFunc) => {
    if (typeof songOrFunc === 'function') {
      setCurrentSongState((prev) => {
        const song = songOrFunc(prev)
        if (song && typeof song === 'object') {
          const normalized = { ...song }
          const idStr = String(normalized.id || '')
          if (idStr.startsWith('yt_')) {
            normalized.source = 'ytmusic'
            if (!normalized.rawId) {
              normalized.rawId = idStr.replace('yt_', '')
            }
          }
          return normalized
        }
        return song
      })
    } else if (songOrFunc && typeof songOrFunc === 'object') {
      const normalized = { ...songOrFunc }
      const idStr = String(normalized.id || '')
      if (idStr.startsWith('yt_')) {
        normalized.source = 'ytmusic'
        if (!normalized.rawId) {
          normalized.rawId = idStr.replace('yt_', '')
        }
      }
      setCurrentSongState(normalized)
    } else {
      setCurrentSongState(songOrFunc)
    }
  }, [])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [activeMenu, setActiveMenu] = useState('new_releases')
  const [customPlaylists, setCustomPlaylists] = useState([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null)
  const [queue, setQueue] = useState([])
  const [autoplayEnabled, setAutoplayEnabled] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showQueueSidebar, setShowQueueSidebar] = useState(true)


  const [history, setHistory] = useState([])
  const [savedAlbums, setSavedAlbums] = useState([])
  const [savedArtists, setSavedArtists] = useState([])
  const [savedPodcasts, setSavedPodcasts] = useState([])

  const audioRef = useRef(null)
  const currentSongIdRef = useRef(null)

  // Load library states on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const h = localStorage.getItem('vibe_history')
        if (h) setHistory(JSON.parse(h))
        
        const al = localStorage.getItem('vibe_saved_albums')
        if (al) setSavedAlbums(JSON.parse(al))
        
        const ar = localStorage.getItem('vibe_saved_artists')
        if (ar) setSavedArtists(JSON.parse(ar))
        
        const po = localStorage.getItem('vibe_saved_podcasts')
        if (po) setSavedPodcasts(JSON.parse(po))
      } catch (e) {
        console.error('Failed to load library from localStorage:', e)
      }
    }
  }, [])

  const addToHistory = useCallback((song) => {
    if (!song) return
    setHistory((prev) => {
      const filtered = prev.filter(s => String(s.id) !== String(song.id))
      const updated = [song, ...filtered].slice(0, 100)
      if (typeof window !== 'undefined') {
        localStorage.setItem('vibe_history', JSON.stringify(updated))
      }
      return updated
    })
  }, [])

  const toggleSaveAlbum = (album) => {
    if (!album) return
    setSavedAlbums((prev) => {
      const exists = prev.some(a => String(a.id) === String(album.id))
      let updated
      if (exists) {
        updated = prev.filter(a => String(a.id) !== String(album.id))
      } else {
        updated = [album, ...prev]
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('vibe_saved_albums', JSON.stringify(updated))
      }
      return updated
    })
  }

  const toggleFollowArtist = (artist) => {
    if (!artist) return
    setSavedArtists((prev) => {
      const exists = prev.some(a => String(a.id) === String(artist.id))
      let updated
      if (exists) {
        updated = prev.filter(a => String(a.id) !== String(artist.id))
      } else {
        updated = [artist, ...prev]
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('vibe_saved_artists', JSON.stringify(updated))
      }
      return updated
    })
  }

  const toggleSubscribePodcast = (podcast) => {
    if (!podcast) return
    setSavedPodcasts((prev) => {
      const exists = prev.some(p => String(p.id) === String(podcast.id))
      let updated
      if (exists) {
        updated = prev.filter(p => String(p.id) !== String(podcast.id))
      } else {
        updated = [podcast, ...prev]
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('vibe_saved_podcasts', JSON.stringify(updated))
      }
      return updated
    })
  }

  // Create ONE Audio element for the lifetime of the app
  if (typeof window !== 'undefined' && !audioRef.current) {
    const a = new Audio()
    a.preload = 'auto'
    a.volume = 0.7
    audioRef.current = a
  }

  const supabase = createClient()
  const fetchPlaylists = async () => {
    const { data, error } = await supabase.from('playlists').select('*').order('created_at', { ascending: true })
    if (!error && data) setCustomPlaylists(data)
  }

  // Warm the cache silently on hover
  const preloadTrack = useCallback((song) => {
    if (!song?.id?.startsWith('tidal_')) return
    const id = song.id.replace('tidal_', '')
    try {
      const qs = song.audio_url?.includes('?') ? song.audio_url.split('?')[1] : ''
      const isrc = new URLSearchParams(qs).get('isrc') || ''
      fetch(`/api/preload?id=${id}${isrc ? `&isrc=${isrc}` : ''}`).catch(() => {})
    } catch (_) {}
  }, [])

  // ── Playback engine: ALWAYS call play() directly, never wait for canplay first ──
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!currentSong) {
      audio.pause()
      return
    }

    const songId = currentSong.id
    currentSongIdRef.current = songId

    const rawSrc = currentSong.audio_url || ''
    const fullSrc = rawSrc.startsWith('http')
      ? rawSrc
      : `${window.location.origin}${rawSrc.startsWith('/') ? rawSrc : '/' + rawSrc}`

    // Check if this song is already loaded in the audio element
    const loadedPath = audio.src
      ? audio.src.replace(window.location.origin, '').split('?')[0]
      : ''
    const newPath = rawSrc.startsWith('/') ? rawSrc.split('?')[0] : '/' + rawSrc.split('?')[0]
    const alreadyLoaded = loadedPath && loadedPath === newPath

    if (!isPlaying) {
      audio.pause()
      return
    }

    // Add to history
    addToHistory(currentSong)

    // Load new src if it changed
    if (!alreadyLoaded) {
      audio.src = fullSrc
      // Don't call audio.load() — play() will trigger loading automatically
    }

    // Play immediately — the browser will fetch and buffer in parallel
    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        if (currentSongIdRef.current !== songId) return // stale
        if (err.name === 'AbortError') return // interrupted by next song, fine
        if (err.name === 'NotAllowedError') {
          // Autoplay blocked — need user gesture. Set isPlaying to false so UI is accurate.
          setIsPlaying(false)
          return
        }
        console.warn(`Audio play error (${err.name}): ${err.message}`)
        // On MEDIA_ERR or other errors, retry once after 1s
        setTimeout(() => {
          if (currentSongIdRef.current !== songId) return
          audio.load()
          audio.play().catch(() => {})
        }, 1000)
      })
    }
  }, [currentSong, isPlaying, addToHistory])

  // Autoplay Recommendations Engine
  const triggerAutoplayRecommendations = useCallback(async () => {
    if (!currentSong) return
    try {
      console.log(`📡 Autoplay: Fetching recommendations for "${currentSong.title}"`)
      const res = await fetch(
        `/api/saavn/recommendations?id=${currentSong.rawId || ''}&artist=${encodeURIComponent(currentSong.artist || '')}`
      )
      if (res.ok) {
        const recs = await res.json()
        console.log(`📡 Autoplay: recommendations fetched:`, recs ? recs.length : 0)
        if (Array.isArray(recs) && recs.length > 0) {
          const firstRec = recs[0]
          // The rest go to the queue
          setQueue(recs.slice(1))
          setCurrentSong(firstRec)
          setIsPlaying(true)
        }
      }
    } catch (err) {
      console.error("❌ Autoplay failed to fetch recommendations:", err)
    }
  }, [currentSong])

  // Queue Modifiers
  const playNext = useCallback((song) => {
    if (!song) return
    setQueue(prev => {
      const filtered = prev.filter(s => String(s.id) !== String(song.id))
      return [song, ...filtered]
    })
  }, [])

  const addToQueue = useCallback((song) => {
    if (!song) return
    setQueue(prev => {
      const filtered = prev.filter(s => String(s.id) !== String(song.id))
      return [...filtered, song]
    })
  }, [])

  const removeFromQueue = useCallback((songId) => {
    setQueue(prev => prev.filter(s => String(s.id) !== String(songId)))
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
  }, [])

  const handleNext = useCallback(() => {
    console.log("⏭ handleNext called. Playlist size:", playlist.length, "Queue size:", queue.length, "Current song:", currentSong?.title, "ID:", currentSong?.id)
    // 1. Play first item from queue if available
    if (queue.length > 0) {
      const nextSong = queue[0]
      setQueue(prev => prev.slice(1))
      setCurrentSong(nextSong)
      setIsPlaying(true)
      console.log("⏭ handleNext playing from queue:", nextSong.title)
      return
    }

    // 2. Play from playlist
    if (playlist.length > 0 && currentSong) {
      const idx = playlist.findIndex(s => String(s.id) === String(currentSong.id))
      console.log("⏭ handleNext findIndex result:", idx)
      
      if (idx === -1) {
        console.log("⏭ handleNext: idx is -1, autoplayEnabled:", autoplayEnabled)
        if (autoplayEnabled) {
          triggerAutoplayRecommendations()
        } else if (playlist.length > 0) {
          setCurrentSong(playlist[0])
          setIsPlaying(true)
        }
        return
      }

      const isEnd = idx === playlist.length - 1
      if (isEnd) {
        console.log("⏭ handleNext: playlist reached end, isEnd=true, autoplayEnabled:", autoplayEnabled)
        if (autoplayEnabled) {
          triggerAutoplayRecommendations()
        } else {
          setCurrentSong(playlist[0])
          setIsPlaying(true)
        }
      } else {
        const next = isShuffle
          ? playlist[Math.floor(Math.random() * playlist.length)]
          : playlist[idx + 1]
        if (next) {
          console.log("⏭ handleNext playing next song in playlist:", next.title)
          setCurrentSong(next)
          setIsPlaying(true)
        }
      }
    } else if (autoplayEnabled && currentSong) {
      console.log("⏭ handleNext: no playlist, calling triggerAutoplayRecommendations")
      triggerAutoplayRecommendations()
    }
  }, [playlist, currentSong, isShuffle, queue, autoplayEnabled, triggerAutoplayRecommendations])

  const handlePrev = useCallback(() => {
    if (audioRef.current?.currentTime > 3) {
      audioRef.current.currentTime = 0
      return
    }
    if (!playlist.length || !currentSong) return
    const idx = playlist.findIndex(s => String(s.id) === String(currentSong.id))
    if (idx === -1) {
      audioRef.current.currentTime = 0
      return
    }
    const prev = playlist[idx <= 0 ? playlist.length - 1 : idx - 1]
    if (prev) {
      setCurrentSong(prev)
      setIsPlaying(true)
    }
  }, [playlist, currentSong])

  const playTrack = (song, newPlaylist = []) => {
    if (newPlaylist.length > 0) setPlaylist(newPlaylist)
    if (currentSong && String(currentSong.id) === String(song.id)) {
      setIsPlaying(p => !p)
    } else {
      setCurrentSong(song)
      setIsPlaying(true)
    }
  }

  // Auto-advance when track ends
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else {
        handleNext()
      }
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [handleNext, isRepeat])

  // ── Media Session API: Update lock screen / background media controls metadata ──
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !currentSong) return

    try {
      const artworkUrl = currentSong.image_url || '/placeholder.png'
      const absoluteArtworkUrl = artworkUrl.startsWith('http')
        ? artworkUrl
        : `${window.location.origin}${artworkUrl.startsWith('/') ? artworkUrl : '/' + artworkUrl}`

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist || 'Unknown Artist',
        album: currentSong.album || 'Vibe',
        artwork: [
          { src: absoluteArtworkUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: absoluteArtworkUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: absoluteArtworkUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: absoluteArtworkUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: absoluteArtworkUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: absoluteArtworkUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      })
    } catch (error) {
      console.error('Failed to set media session metadata:', error)
    }
  }, [currentSong])

  // ── Media Session API: Sync playback state (playing vs paused) ──
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    } catch (error) {
      console.warn('Failed to sync media session playback state:', error)
    }
  }, [isPlaying])

  // ── Media Session API: Register system controls action handlers ──
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return

    const ms = navigator.mediaSession

    try {
      ms.setActionHandler('play', () => {
        setIsPlaying(true)
      })
      ms.setActionHandler('pause', () => {
        setIsPlaying(false)
      })
      ms.setActionHandler('previoustrack', () => {
        handlePrev()
      })
      ms.setActionHandler('nexttrack', () => {
        handleNext()
      })
      ms.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime
        }
      })
    } catch (error) {
      console.error('Failed to register media session action handlers:', error)
    }

    return () => {
      try {
        ms.setActionHandler('play', null)
        ms.setActionHandler('pause', null)
        ms.setActionHandler('previoustrack', null)
        ms.setActionHandler('nexttrack', null)
        ms.setActionHandler('seekto', null)
      } catch (_) {}
    }
  }, [handleNext, handlePrev, setIsPlaying])

  // ── Media Session API: Update playback progress (scrubber) on lock screen ──
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || typeof window === 'undefined' || !('mediaSession' in navigator)) return

    const updatePosition = () => {
      if ('setPositionState' in navigator.mediaSession) {
        try {
          if (audio.duration && !isNaN(audio.duration)) {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate || 1.0,
              position: audio.currentTime
            })
          }
        } catch (error) {
          console.debug('Failed to set media session position state:', error)
        }
      }
    }

    audio.addEventListener('timeupdate', updatePosition)
    audio.addEventListener('durationchange', updatePosition)
    
    return () => {
      audio.removeEventListener('timeupdate', updatePosition)
      audio.removeEventListener('durationchange', updatePosition)
    }
  }, [])

  useEffect(() => { fetchPlaylists() }, [])

  const toggleFavorite = async (songOrId, currentVal) => {
    const isObj = typeof songOrId === 'object' && songOrId !== null
    const songId = isObj ? songOrId.id : songOrId
    const { data: ex } = await supabase.from('songs').select('id').eq('id', songId).maybeSingle()
    if (!ex) {
      const sd = isObj ? songOrId : currentSong
      if (sd) await supabase.from('songs').insert([{ id: songId, title: sd.title, artist: sd.artist, image_url: sd.image_url, audio_url: sd.audio_url, is_favorite: !currentVal }])
    } else {
      await supabase.from('songs').update({ is_favorite: !currentVal }).eq('id', songId)
    }
    if (currentSong && String(currentSong.id) === String(songId))
      setCurrentSong(p => ({ ...p, is_favorite: !currentVal }))
  }

  const toggleBookmark = async (songOrId, currentVal) => {
    const isObj = typeof songOrId === 'object' && songOrId !== null
    const songId = isObj ? songOrId.id : songOrId
    const { data: ex } = await supabase.from('songs').select('id').eq('id', songId).maybeSingle()
    if (!ex) {
      const sd = isObj ? songOrId : currentSong
      if (sd) await supabase.from('songs').insert([{ id: songId, title: sd.title, artist: sd.artist, image_url: sd.image_url, audio_url: sd.audio_url, is_bookmarked: !currentVal }])
    } else {
      await supabase.from('songs').update({ is_bookmarked: !currentVal }).eq('id', songId)
    }
    if (currentSong && String(currentSong.id) === String(songId))
      setCurrentSong(p => ({ ...p, is_bookmarked: !currentVal }))
  }

  const createNewPlaylist = async () => {
    const name = prompt('Enter new playlist name:')
    if (!name?.trim()) return
    const { data, error } = await supabase.from('playlists').insert([{ name: name.trim() }]).select()
    if (!error && data) {
      setCustomPlaylists(p => [...p, data[0]])
      setSelectedPlaylistId(data[0].id)
      setActiveMenu('custom_playlist')
    }
  }

  return (
    <AudioContext.Provider value={{
      currentSong, isPlaying, playTrack, setIsPlaying, audioRef,
      isShuffle, setIsShuffle, isRepeat, setIsRepeat, handleNext, handlePrev,
      toggleFavorite, toggleBookmark, setCurrentSong,
      activeMenu, setActiveMenu, customPlaylists, setCustomPlaylists,
      selectedPlaylistId, setSelectedPlaylistId, createNewPlaylist, fetchPlaylists,
      preloadTrack,
      history, savedAlbums, savedArtists, savedPodcasts,
      toggleSaveAlbum, toggleFollowArtist, toggleSubscribePodcast,
      queue, setQueue, autoplayEnabled, setAutoplayEnabled,
      playNext, addToQueue, removeFromQueue, clearQueue,
      playlist, setPlaylist,
      searchQuery, setSearchQuery,
      showQueueSidebar, setShowQueueSidebar
    }}>
      {children}
    </AudioContext.Provider>
  )
}

export const useAudio = () => useContext(AudioContext)