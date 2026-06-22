'use client'
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { logSearchQuery, scoreAndSortTracks } from '@/utils/recoEngine'

const AudioContext = createContext()

export function AudioProvider({ children }) {
  const [playlist, setPlaylist] = useState([])
  const [currentSong, setCurrentSongState] = useState(null)

  // Normalizer: auto-tag yt_ prefixed IDs with source/rawId so all consumers
  // can reliably check currentSong.source === 'ytmusic'
  const setCurrentSong = useCallback((songOrFunc) => {
    const normalize = (song) => {
      if (!song || typeof song !== 'object') return song
      const idStr = String(song.id || '')
      if (idStr.startsWith('yt_') && song.source !== 'ytmusic') {
        return {
          ...song,
          source: 'ytmusic',
          rawId: song.rawId || idStr.replace('yt_', '')
        }
      }
      return song
    }
    if (typeof songOrFunc === 'function') {
      setCurrentSongState(prev => normalize(songOrFunc(prev)))
    } else {
      setCurrentSongState(normalize(songOrFunc))
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

  // Dynamically record search terms into the preference profile for ranking affinity
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 2) {
      const timer = setTimeout(() => {
        logSearchQuery(searchQuery)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [searchQuery])

  const [history, setHistory] = useState([])
  const [savedAlbums, setSavedAlbums] = useState([])
  const [savedArtists, setSavedArtists] = useState([])
  const [savedPodcasts, setSavedPodcasts] = useState([])

  const audioRef = useRef(null)
  const currentSongIdRef = useRef(null)
  const queueNeedsInitRef = useRef(false)
  const addToHistoryRef = useRef(null)
  const autoplayEnabledRef = useRef(true)

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

  // Keep a stable ref so playback effect can call it without being in deps
  useEffect(() => { addToHistoryRef.current = addToHistory }, [addToHistory])
  useEffect(() => { autoplayEnabledRef.current = autoplayEnabled }, [autoplayEnabled])

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

  // ── Playback engine: fires ONLY when song ID or isPlaying changes ──
  // NOTE: addToHistory is intentionally excluded from deps — we use a ref
  // to call it so that history state updates never re-trigger this effect.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!currentSong) {
      audio.pause()
      return
    }

    // ── YouTube Music tracks: bypass HTML5 audio entirely ──
    // The YouTube IFrame Player inside GlobalPlayer handles these.
    if (currentSong.source === 'ytmusic') {
      audio.pause()
      audio.src = '' // clear any previous src so it doesn't linger
      addToHistoryRef.current?.(currentSong)
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

    // Add to history via stable ref — does NOT trigger this effect to re-run
    addToHistoryRef.current?.(currentSong)

    // Load new src only if it changed
    if (!alreadyLoaded) {
      audio.src = fullSrc
    }

    // Play immediately — the browser will fetch and buffer in parallel
    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        if (currentSongIdRef.current !== songId) return // stale
        if (err.name === 'AbortError') return // interrupted by next song, fine
        if (err.name === 'NotAllowedError') {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id, isPlaying])

  // Autoplay Recommendations Engine
  const triggerAutoplayRecommendations = useCallback(async () => {
    if (!currentSong) return

    try {
      // ── YouTube Music tracks: use YouTube's own "Up Next" recommendations ──
      if (currentSong.source === 'ytmusic' && currentSong.rawId) {
        console.log(`📡 Autoplay [YouTube]: Fetching related videos for "${currentSong.title}"`)
        const res = await fetch(`/api/ytmusic/recommendations?videoId=${currentSong.rawId}&limit=15`)
        if (res.ok) {
          const { recommendations } = await res.json()
          if (Array.isArray(recommendations) && recommendations.length > 0) {
            const ranked = scoreAndSortTracks(recommendations, currentSong)
            setCurrentSong(ranked[0])
            setQueue(ranked.slice(1))
            setIsPlaying(true)
            return
          }
        }
        // Fallback: if YT recs fail, just keep playing (no action)
        console.warn('⚠️ YouTube autoplay recommendations returned empty')
        return
      }

      // ── JioSaavn tracks: use JioSaavn's recommendation engine ──
      console.log(`📡 Autoplay [JioSaavn]: Fetching recommendations for "${currentSong.title}"`)
      const res = await fetch(
        `/api/saavn/recommendations?id=${currentSong.rawId || ''}&artist=${encodeURIComponent(currentSong.artist || '')}`
      )
      if (res.ok) {
        const recs = await res.json()
        if (Array.isArray(recs) && recs.length > 0) {
          const ranked = scoreAndSortTracks(recs, currentSong)
          const firstRec = ranked[0]
          setQueue(ranked.slice(1))
          setCurrentSong(firstRec)
          setIsPlaying(true)
        }
      }
    } catch (err) {
      console.error('❌ Autoplay failed to fetch recommendations:', err)
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

  const appendAutoplayRecommendations = useCallback(async (seedTrack) => {
    if (!autoplayEnabled || !seedTrack) return
    try {
      console.log(`📡 Appending radio recommendations for seed: "${seedTrack.title}"`)
      let recs = []
      if (seedTrack.source === 'ytmusic' && seedTrack.rawId) {
        const res = await fetch(`/api/ytmusic/recommendations?videoId=${seedTrack.rawId}&limit=10`)
        if (res.ok) {
          const { recommendations } = await res.json()
          recs = recommendations || []
        }
      } else {
        const res = await fetch(
          `/api/saavn/recommendations?id=${seedTrack.rawId || ''}&artist=${encodeURIComponent(seedTrack.artist || '')}`
        )
        if (res.ok) {
          recs = await res.json()
        }
      }
      
      if (recs.length > 0) {
        const ranked = scoreAndSortTracks(recs, seedTrack)
        const autoTracks = ranked.map(t => ({ ...t, isAuto: true }))
        setQueue(prev => {
          const existingIds = new Set(prev.map(s => String(s.id)))
          const filtered = autoTracks.filter(t => !existingIds.has(String(t.id)))
          return [...prev, ...filtered]
        })
      }
    } catch (err) {
      console.error('Failed to append radio recommendations:', err)
    }
  }, [autoplayEnabled])

  const handleNext = useCallback(() => {
    // 1. Play first item from queue if available
    if (queue.length > 0) {
      const nextSong = queue[0]
      const remainingQueue = queue.slice(1)
      setQueue(remainingQueue)
      setCurrentSong(nextSong)
      setIsPlaying(true)

      // Pre-fetch more radio items if queue is running low
      if (remainingQueue.length < 3) {
        const seed = remainingQueue[remainingQueue.length - 1] || nextSong
        appendAutoplayRecommendations(seed)
      }
      return
    }

    // 2. Play from playlist
    if (playlist.length > 0 && currentSong) {
      const idx = playlist.findIndex(s => String(s.id) === String(currentSong.id))
      
      if (idx === -1) {
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
          setCurrentSong(next)
          setIsPlaying(true)
        }
      }
    } else if (autoplayEnabled && currentSong) {
      triggerAutoplayRecommendations()
    }
  }, [playlist, currentSong, isShuffle, queue, autoplayEnabled, triggerAutoplayRecommendations, appendAutoplayRecommendations])

  const handlePrev = useCallback((currentTimeSecs) => {
    const t = currentTimeSecs !== undefined
      ? currentTimeSecs
      : (audioRef.current?.currentTime ?? 0)

    if (t > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0
      return
    }
    if (!playlist.length || !currentSong) return
    const idx = playlist.findIndex(s => String(s.id) === String(currentSong.id))
    if (idx === -1) {
      if (audioRef.current) audioRef.current.currentTime = 0
      return
    }
    const prev = playlist[idx <= 0 ? playlist.length - 1 : idx - 1]
    if (prev) {
      setCurrentSong(prev)
      setIsPlaying(true)
    }
  }, [playlist, currentSong, audioRef])

  const playTrack = useCallback((song, newPlaylist = []) => {
    queueNeedsInitRef.current = true // Flag that we need to rebuild queue for this new seed track
    if (newPlaylist.length > 0) {
      setPlaylist(newPlaylist)
    } else {
      // Single track click — set playlist to contain just this track
      setPlaylist([song])
    }
    
    if (currentSong && String(currentSong.id) === String(song.id)) {
      setIsPlaying(p => !p)
    } else {
      setCurrentSong(song)
      setIsPlaying(true)
    }
  }, [currentSong])

  // Pre-populate queue on manual song play
  // Depends only on currentSong?.id — playlist & autoplayEnabled are read via
  // refs/closure snapshots so they don't re-trigger this effect on every render.
  useEffect(() => {
    if (!currentSong || !queueNeedsInitRef.current) return

    // Snapshot stable values at the time the effect runs
    const songSnapshot = currentSong
    const playlistSnapshot = playlist

    const initRadioQueue = async () => {
      try {
        let upcomingTracks = []
        
        // 1. If playing from an album/playlist, load remaining tracks
        if (playlistSnapshot.length > 1) {
          const idx = playlistSnapshot.findIndex(s => String(s.id) === String(songSnapshot.id))
          if (idx !== -1) {
            upcomingTracks = playlistSnapshot.slice(idx + 1).map(t => ({ ...t, isAuto: false }))
          }
        }

        // 2. Fetch autoplay recommendations to append (read autoplayEnabled from ref)
        if (autoplayEnabledRef.current) {
          console.log(`📡 Prefetching initial radio queue for: "${songSnapshot.title}"`)
          let recs = []
          if (songSnapshot.source === 'ytmusic' && songSnapshot.rawId) {
            const res = await fetch(`/api/ytmusic/recommendations?videoId=${songSnapshot.rawId}&limit=15`)
            if (res.ok) {
              const data = await res.json()
              recs = data.recommendations || []
            }
          } else {
            const res = await fetch(
              `/api/saavn/recommendations?id=${songSnapshot.rawId || ''}&artist=${encodeURIComponent(songSnapshot.artist || '')}`
            )
            if (res.ok) {
              recs = await res.json()
            }
          }
          
          if (recs.length > 0) {
            const ranked = scoreAndSortTracks(recs, songSnapshot)
            const autoTracks = ranked.map(t => ({ ...t, isAuto: true }))
            upcomingTracks = [...upcomingTracks, ...autoTracks]
          }
        }

        setQueue(upcomingTracks)
        queueNeedsInitRef.current = false
      } catch (err) {
        console.error('Failed to pre-populate radio queue:', err)
      }
    }

    initRadioQueue()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id])

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
      searchQuery, setSearchQuery
    }}>
      {children}
    </AudioContext.Provider>
  )
}

export const useAudio = () => useContext(AudioContext)