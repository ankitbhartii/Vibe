'use client'
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

const AudioContext = createContext()

export function AudioProvider({ children }) {
  const [playlist, setPlaylist] = useState([])
  const [currentSong, setCurrentSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [activeMenu, setActiveMenu] = useState('new_releases')
  const [customPlaylists, setCustomPlaylists] = useState([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null)

  const audioRef = useRef(null)
  const currentSongIdRef = useRef(null)

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
  }, [currentSong, isPlaying])

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
  }, [playlist, currentSong, isShuffle, isRepeat])

  useEffect(() => { fetchPlaylists() }, [])

  const playTrack = (song, newPlaylist = []) => {
    if (newPlaylist.length > 0) setPlaylist(newPlaylist)
    if (currentSong && String(currentSong.id) === String(song.id)) {
      setIsPlaying(p => !p)
    } else {
      setCurrentSong(song)
      setIsPlaying(true)
    }
  }

  const handleNext = () => {
    if (!playlist.length || !currentSong) return
    const idx = playlist.findIndex(s => String(s.id) === String(currentSong.id))
    const next = isShuffle
      ? playlist[Math.floor(Math.random() * playlist.length)]
      : playlist[(idx + 1) % playlist.length]
    if (next) { setCurrentSong(next); setIsPlaying(true) }
  }

  const handlePrev = () => {
    if (!playlist.length || !currentSong) return
    if (audioRef.current?.currentTime > 3) { audioRef.current.currentTime = 0; return }
    const idx = playlist.findIndex(s => String(s.id) === String(currentSong.id))
    const prev = playlist[idx <= 0 ? playlist.length - 1 : idx - 1]
    if (prev) { setCurrentSong(prev); setIsPlaying(true) }
  }

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
    }}>
      {children}
    </AudioContext.Provider>
  )
}

export const useAudio = () => useContext(AudioContext)