'use client'
import { createContext, useContext, useState, useEffect, useRef } from 'react'
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
  const supabase = createClient()

  const fetchPlaylists = async () => {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error && data) setCustomPlaylists(data)
  }

  useEffect(() => {
    fetchPlaylists()
    audioRef.current = new Audio()
    
    const handleEnded = () => {
      if (isRepeat) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(err => console.error("Loop failed:", err))
        }
      } else {
        handleNext()
      }
    }
    audioRef.current.addEventListener('ended', handleEnded)
    return () => audioRef.current?.removeEventListener('ended', handleEnded)
  }, [playlist, currentSong, isShuffle, isRepeat])

  // SAFE HARDWARE HANDSHAKE ENGINE LAYER
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentSong) return

    const executePlayback = async () => {
      try {
        // 1. If the audio source path has changed, cleanly mount the new file link
        if (audio.src !== currentSong.audio_url) {
          audio.src = currentSong.audio_url
          audio.load()
        }

        // 2. Only execute player instructions if state matches cleanly
        if (isPlaying) {
          // Check if audio asset context has enough data frames built up
          if (audio.readyState >= 2) {
            await audio.play()
          } else {
            // Wait for metadata parameters to initialize before firing execution threads
            const handleCanPlay = async () => {
              try {
                await audio.play()
                audio.removeEventListener('canplay', handleCanPlay)
              } catch (playErr) {
                console.log("Buffered block aborted:", playErr.message)
              }
            };
            audio.addEventListener('canplay', handleCanPlay)
          }
        } else {
          audio.pause()
        }
      } catch (err) {
        console.warn("Handled DOM Abort Exception Context safely:", err.message)
      }
    }

    executePlayback()
  }, [currentSong, isPlaying])

  const playTrack = (song, tracksNewContext = []) => {
    if (tracksNewContext.length > 0) setPlaylist(tracksNewContext)
    
    if (currentSong && String(currentSong.id) === String(song.id)) {
      setIsPlaying(!isPlaying)
    } else {
      setCurrentSong(song)
      setIsPlaying(true)
    }
  }

  const handleNext = () => {
    if (playlist.length === 0 || !currentSong) return
    let nextSong = null
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * playlist.length)
      nextSong = playlist[randomIndex]
    } else {
      const currentIndex = playlist.findIndex((s) => String(s.id) === String(currentSong.id))
      const nextIndex = (currentIndex + 1) % playlist.length
      nextSong = playlist[nextIndex]
    }
    if (nextSong) {
      setCurrentSong(nextSong)
      setIsPlaying(true)
    }
  }

  const handlePrev = () => {
    if (playlist.length === 0 || !currentSong) return
    if (audio.current && audio.current.currentTime > 3) {
      audio.current.currentTime = 0
      return
    }
    let prevSong = null
    const currentIndex = playlist.findIndex((s) => String(s.id) === String(currentSong.id))
    if (currentIndex !== -1) {
      const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1
      prevSong = playlist[prevIndex]
    }
    if (prevSong) {
      setCurrentSong(prevSong)
      setIsPlaying(true)
    }
  }

  const toggleFavorite = async (songId, currentVal) => {
    const { error } = await supabase.from('songs').update({ is_favorite: !currentVal }).eq('id', songId)
    if (error) console.error(error)
    if (currentSong && String(currentSong.id) === String(songId)) {
      setCurrentSong(prev => ({ ...prev, is_favorite: !currentVal }))
    }
  }

  const toggleBookmark = async (songId, currentVal) => {
    const { error } = await supabase.from('songs').update({ is_bookmarked: !currentVal }).eq('id', songId)
    if (error) console.error(error)
    if (currentSong && String(currentSong.id) === String(songId)) {
      setCurrentSong(prev => ({ ...prev, is_bookmarked: !currentVal }))
    }
  }

  const createNewPlaylist = async () => {
    const name = prompt("Enter new playlist name:")
    if (!name || !name.trim()) return

    const { data, error } = await supabase
      .from('playlists')
      .insert([{ name: name.trim() }])
      .select()

    if (!error && data) {
      setCustomPlaylists(prev => [...prev, data[0]])
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
      selectedPlaylistId, setSelectedPlaylistId, createNewPlaylist, fetchPlaylists
    }}>
      {children}
    </AudioContext.Provider>
  )
}

export const useAudio = () => useContext(AudioContext)