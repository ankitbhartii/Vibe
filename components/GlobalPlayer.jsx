'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useAudio } from '@/context/AudioContext'

export default function GlobalPlayer() {
  const { 
    currentSong, isPlaying, setIsPlaying, audioRef,
    isShuffle, setIsShuffle, isRepeat, setIsRepeat, handleNext, handlePrev,
    toggleFavorite 
  } = useAudio()

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isHovered, setIsHovered] = useState(false)
  const progressRef = useRef(null)

  // ================= CRITICAL FIX: TRACK TIME LIFECYCLE LISTENERS =================
  useEffect(() => {
    const audio = audioRef?.current
    if (!audio) return

    // Core state updater updates values on every audio frame emission
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0)
    }

    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    // Attach native HTML5 media pipeline stream lifecycle triggers
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)

    // Immediate manual checking sweep to handle pre-cached memory instances
    setCurrentTime(audio.currentTime || 0)
    if (audio.duration && !isNaN(audio.duration)) {
      setDuration(audio.duration)
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [currentSong, audioRef]) // Re-binds listeners cleanly if active track changes links

  // Sync native volume values with state parameters
  useEffect(() => {
    if (audioRef?.current) {
      audioRef.current.volume = volume
    }
  }, [volume, audioRef])

  if (!currentSong) return null

  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  const handleScrub = (e) => {
    const audio = audioRef?.current
    if (!audio || !duration) return

    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const newPercentage = Math.max(0, Math.min(1, clickX / width))
    
    audio.currentTime = newPercentage * duration
    setCurrentTime(audio.currentTime)
  }

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[85px] md:h-[90px] bg-[#121212] border-t border-zinc-900 px-4 md:px-6 flex items-center justify-between z-50 text-white select-none backdrop-blur-md shadow-2xl">
      
      {/* LEFT AREA: SONG METADATA */}
      <div className="flex items-center gap-3 w-1/3 min-w-[150px] md:min-w-[240px]">
        {currentSong.image_url ? (
          <img src={currentSong.image_url} alt="" className="w-11 h-11 md:w-14 md:h-14 object-cover rounded shadow-md border border-zinc-800/40 shrink-0" />
        ) : (
          <div className="w-11 h-11 md:w-14 md:h-14 rounded bg-zinc-800 flex items-center justify-center font-bold text-xs md:text-sm text-zinc-500 shrink-0">🎵</div>
        )}
        <div className="flex flex-col min-w-0 max-w-[100px] sm:max-w-[150px]">
          <span className="text-[12px] md:text-[13px] font-semibold text-zinc-100 hover:underline cursor-pointer truncate">{currentSong.title}</span>
          <span className="text-[10px] md:text-[11px] text-zinc-500 hover:underline cursor-pointer truncate mt-0.5 font-medium">{currentSong.artist}</span>
        </div>
        
        <div className="flex items-center gap-0.5 ml-2 shrink-0">
          <button 
            onClick={() => toggleFavorite(currentSong.id, currentSong.is_favorite)}
            className="transition-transform duration-150 hover:scale-125 active:scale-90 text-xs p-1"
            title="Like Track"
          >
            {currentSong.is_favorite ? '❤️' : '🤍'}
          </button>
        </div>
      </div>

      {/* CENTER AREA: JIOSAAVN COMPACT MEDIA PLAYBACK PANEL */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-[640px] px-2">
        
        {/* PLAYER ACTION TOGGLES */}
        <div className="flex items-center gap-5 md:gap-6">
          <button onClick={() => setIsShuffle(!isShuffle)} className={`transition-colors duration-150 p-1 ${isShuffle ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'}`} title="Shuffle">
            <svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M10.596 1.161a1 1 0 0 0-1.414 0L7.83 2.513l1.414 1.415 1.352-1.353 1.353 1.353 1.414-1.415-2.167-2.152zM1.05 1.05a1 1 0 0 0 0 1.414L3.636 5.05l1.415-1.414L2.464 1.05a1 1 0 0 0-1.414 0zm11.364 11.364L9.828 9.828l-1.414 1.414 2.586 2.586a1 1 0 0 0 1.414 0l2.167-2.152-1.414-1.415-1.353 1.353zm-8.778.136l8.727-8.727-1.414-1.414-8.727 8.727 1.414 1.414z"></path></svg>
          </button>
          
          <button onClick={handlePrev} className="text-zinc-400 hover:text-white transition-colors duration-150 p-1" title="Previous">
            <svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v11.475a.7.7 0 0 1-1.05.606L4 9.15v5.15a.7.7 0 0 1-1.4 0V1.7a.7.7 0 0 1 .7-.7z"></path></svg>
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white text-black flex items-center justify-center transform hover:scale-105 active:scale-95 transition-all shadow-md shrink-0"
          >
            {isPlaying ? (
              <svg role="img" height="14" width="14" fill="currentColor" viewBox="0 0 16 16"><path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm7.4 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"></path></svg>
            ) : (
              <svg role="img" height="14" width="14" fill="currentColor" viewBox="0 0 16 16" className="ml-0.5"><path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"></path></svg>
            )}
          </button>
          
          <button onClick={handleNext} className="text-zinc-400 hover:text-white transition-colors duration-150 p-1" title="Next">
            <svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.106A.7.7 0 0 0 1 1.712v11.475a.7.7 0 0 0 1.05.606L12 9.15v5.15a.7.7 0 0 0 1.4 0V1.7a.7.7 0 0 0-.7-.7z"></path></svg>
          </button>
          
          <button onClick={() => setIsRepeat(!isRepeat)} className={`transition-colors duration-150 p-1 ${isRepeat ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'}`} title="Repeat">
            <svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.03a.75.75 0 0 1 0-1.06l2.829-2.829a.75.75 0 1 1 1.06 1.06L9.81 12h2.44a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"></path></svg>
          </button>
        </div>

        {/* TIMELINE TIMING RUNNER */}
        <div className="w-full flex items-center gap-2 text-[10px] md:text-[11px] text-zinc-400 font-mono select-none">
          <span className="min-w-[30px] text-right">{formatTime(currentTime)}</span>
          <div 
            ref={progressRef} onClick={handleScrub} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
            className="flex-1 h-1 bg-zinc-800 rounded-full cursor-pointer relative py-2 flex items-center group"
          >
            <div className="w-full h-1 bg-zinc-800 rounded-full relative overflow-hidden">
              <div className={`h-full rounded-full transition-colors ${isHovered ? 'bg-emerald-400' : 'bg-zinc-300'}`} style={{ width: `${progressPercentage}%` }} />
            </div>
            <div className={`absolute w-2.5 h-2.5 bg-white rounded-full shadow-md transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`} style={{ left: `calc(${progressPercentage}% - 5px)` }} />
          </div>
          <span className="min-w-[30px] text-left">{formatTime(duration)}</span>
        </div>

      </div>

      {/* RIGHT AREA: VOLUMES UTILITIES TRINKETS */}
      <div className="w-1/3 min-w-[60px] sm:min-w-[180px] flex items-center justify-end gap-3 text-zinc-400 max-sm:hidden shrink-0">
        <button className="hover:text-white transition-colors p-1"><svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M15 15H1v-1.5h14V15zm0-4.75H1V8.75h14v1.5zM15 5.5H1V4h14v1.5z"></path></svg></button>
        
        <div className="flex items-center gap-2 group max-w-[110px] w-full ml-1">
          <button onClick={() => setVolume(volume === 0 ? 0.5 : 0)} className="hover:text-white transition-colors text-xs shrink-0">
            {volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : '🔊'}
          </button>
          <input 
            type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-white group-hover:accent-emerald-400 h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none transition-all" 
          />
        </div>
      </div>

    </div>
  )
}