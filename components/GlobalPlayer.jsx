'use client'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useAudio } from '@/context/AudioContext'
import dynamic from 'next/dynamic'

const AmLyrics = dynamic(
  () => {
    import('@uimaxbai/am-lyrics/am-lyrics.js')
    return import('@uimaxbai/am-lyrics/react').then((mod) => mod.AmLyrics)
  },
  { ssr: false }
)

export default function GlobalPlayer() {
  const { 
    currentSong, isPlaying, setIsPlaying, audioRef,
    isShuffle, setIsShuffle, isRepeat, setIsRepeat, handleNext, handlePrev,
    toggleFavorite,
    queue, setQueue, autoplayEnabled, setAutoplayEnabled,
    playNext, addToQueue, removeFromQueue, clearQueue, playTrack, playlist
  } = useAudio()

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isHovered, setIsHovered] = useState(false)
  const progressRef = useRef(null)

  // Expandable player states
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeOverlayTab, setActiveOverlayTab] = useState('') // '' | 'lyrics' | 'xray' | 'queue'
  const [useAppleMusicComponent, setUseAppleMusicComponent] = useState(false)
  const [lyricsData, setLyricsData] = useState({ lyrics: '', syncedLyrics: '', copyright: '' })
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [parsedLyrics, setParsedLyrics] = useState([])
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const lyricsContainerRef = useRef(null)
  const [recommendedTracks, setRecommendedTracks] = useState([])
  const [recsLoading, setRecsLoading] = useState(false)

  // Album cover slider/swipe carousel states
  const [touchStartX, setTouchStartX] = useState(null)
  const [mouseStartX, setMouseStartX] = useState(null)
  const [touchDeltaX, setTouchDeltaX] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [displaySong, setDisplaySong] = useState(currentSong)

  // Keep displaySong updated with currentSong
  useEffect(() => {
    if (!animating) {
      setDisplaySong(currentSong)
    }
  }, [currentSong, animating])

  const getPrevSong = () => {
    if (!playlist || playlist.length === 0 || !currentSong) return null
    const idx = playlist.findIndex(s => String(s.id) === String(currentSong.id))
    if (idx === -1) return null
    return playlist[idx <= 0 ? playlist.length - 1 : idx - 1]
  }

  const getNextSong = () => {
    if (queue && queue.length > 0) {
      return queue[0]
    }
    if (!playlist || playlist.length === 0 || !currentSong) return null
    const idx = playlist.findIndex(s => String(s.id) === String(currentSong.id))
    if (idx === -1) return null
    const isEnd = idx === playlist.length - 1
    return isEnd ? playlist[0] : playlist[idx + 1]
  }

  const triggerNextWithAnimation = () => {
    if (animating) return
    const nextSong = getNextSong()
    if (!nextSong) {
      setTouchDeltaX(0)
      return
    }
    setAnimating(true)
    setTouchDeltaX(-220)
    setTimeout(() => {
      handleNext()
      setDisplaySong(nextSong)
      setTouchDeltaX(0)
      setAnimating(false)
    }, 300)
  }

  const triggerPrevWithAnimation = () => {
    if (animating) return
    const prevSong = getPrevSong()
    if (!prevSong) {
      setTouchDeltaX(0)
      return
    }
    setAnimating(true)
    setTouchDeltaX(220)
    setTimeout(() => {
      handlePrev()
      setDisplaySong(prevSong)
      setTouchDeltaX(0)
      setAnimating(false)
    }, 300)
  }

  const handleTouchStart = (e) => {
    if (animating) return
    setTouchStartX(e.touches[0].clientX)
    setTouchDeltaX(0)
  }

  const handleTouchMove = (e) => {
    if (touchStartX === null || animating) return
    const currentX = e.touches[0].clientX
    const deltaX = currentX - touchStartX
    setTouchDeltaX(Math.max(-240, Math.min(240, deltaX)))
  }

  const handleTouchEnd = () => {
    if (touchStartX === null || animating) return
    const threshold = 60
    if (touchDeltaX > threshold) {
      triggerPrevWithAnimation()
    } else if (touchDeltaX < -threshold) {
      triggerNextWithAnimation()
    } else {
      setAnimating(true)
      setTouchDeltaX(0)
      setTimeout(() => setAnimating(false), 300)
    }
    setTouchStartX(null)
  }

  const handleMouseDown = (e) => {
    if (animating) return
    setMouseStartX(e.clientX)
    setTouchDeltaX(0)
  }

  const handleMouseMove = (e) => {
    if (mouseStartX === null || animating) return
    const deltaX = e.clientX - mouseStartX
    setTouchDeltaX(Math.max(-240, Math.min(240, deltaX)))
  }

  const handleMouseUp = () => {
    if (mouseStartX === null || animating) return
    const threshold = 60
    if (touchDeltaX > threshold) {
      triggerPrevWithAnimation()
    } else if (touchDeltaX < -threshold) {
      triggerNextWithAnimation()
    } else {
      setAnimating(true)
      setTouchDeltaX(0)
      setTimeout(() => setAnimating(false), 300)
    }
    setMouseStartX(null)
  }

  const prevSong = getPrevSong()
  const nextSong = getNextSong()

  const centerStyle = {
    position: 'absolute',
    left: '50%',
    transform: `translateX(calc(-50% + ${touchDeltaX}px)) scale(${1 - Math.abs(touchDeltaX) / 1000})`,
    opacity: 1 - Math.abs(touchDeltaX) / 1000,
    transition: animating || (touchStartX === null && mouseStartX === null) ? 'all 300ms ease-out' : 'none'
  }

  const leftStyle = {
    position: 'absolute',
    left: '50%',
    transform: `translateX(calc(-50% - 190px + ${touchDeltaX}px)) scale(${0.75 + (touchDeltaX > 0 ? touchDeltaX / 1000 : 0)})`,
    opacity: 0.3 + (touchDeltaX > 0 ? touchDeltaX / 400 : 0),
    transition: animating || (touchStartX === null && mouseStartX === null) ? 'all 300ms ease-out' : 'none'
  }

  const rightStyle = {
    position: 'absolute',
    left: '50%',
    transform: `translateX(calc(-50% + 190px + ${touchDeltaX}px)) scale(${0.75 + (touchDeltaX < 0 ? -touchDeltaX / 1000 : 0)})`,
    opacity: 0.3 + (touchDeltaX < 0 ? -touchDeltaX / 400 : 0),
    transition: animating || (touchStartX === null && mouseStartX === null) ? 'all 300ms ease-out' : 'none'
  }

  // Fetch lyrics dynamically when requested
  useEffect(() => {
    if (activeOverlayTab === 'lyrics' && currentSong?.rawId) {
      const fetchLyrics = async () => {
        setLyricsLoading(true)
        try {
          const res = await fetch(
            `/api/saavn/lyrics?id=${currentSong.rawId}&title=${encodeURIComponent(currentSong.title)}&artist=${encodeURIComponent(currentSong.artist)}`
          )
          if (res.ok) {
            const data = await res.json()
            setLyricsData(data)
          } else {
            setLyricsData({ lyrics: 'Lyrics not available for this song.', copyright: '' })
          }
        } catch (err) {
          console.error("Lyrics fetch error:", err)
          setLyricsData({ lyrics: 'Failed to load lyrics.', copyright: '' })
        } finally {
          setLyricsLoading(false)
        }
      }
      fetchLyrics()
    }
  }, [activeOverlayTab, currentSong?.rawId, currentSong?.title, currentSong?.artist])

  // Fetch recommendations when the queue tab is opened or currentSong changes
  useEffect(() => {
    if (activeOverlayTab === 'queue' && currentSong?.rawId) {
      const fetchRecommendations = async () => {
        setRecsLoading(true)
        try {
          const res = await fetch(
            `/api/saavn/recommendations?id=${currentSong.rawId}&artist=${encodeURIComponent(currentSong.artist)}`
          )
          if (res.ok) {
            const data = await res.json()
            setRecommendedTracks(data)
          } else {
            setRecommendedTracks([])
          }
        } catch (err) {
          console.error("Recommendations fetch error:", err)
          setRecommendedTracks([])
        } finally {
          setRecsLoading(false)
        }
      }
      fetchRecommendations()
    }
  }, [activeOverlayTab, currentSong?.rawId, currentSong?.title, currentSong?.artist])

  // Parse synced lyrics when lyricsData changes
  useEffect(() => {
    if (lyricsData?.syncedLyrics) {
      const lines = lyricsData.syncedLyrics.split(/\r?\n/)
      const parsed = []
      // Match formats like [00:07.60] or [00:07:60] or [00:07]
      const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/
      
      lines.forEach(line => {
        const match = timeRegex.exec(line)
        if (match) {
          const minutes = parseInt(match[1], 10)
          const seconds = parseInt(match[2], 10)
          const milliseconds = match[3] ? parseInt(match[3], 10) : 0
          
          // milliseconds could be 2 digits (e.g. 60 -> 600ms) or 3 digits
          const msFactor = match[3] && match[3].length === 2 ? 10 : 1
          const totalSeconds = minutes * 60 + seconds + (milliseconds * msFactor) / 1000
          
          const text = line.replace(timeRegex, '').trim()
          if (text) {
            parsed.push({ time: totalSeconds, text })
          }
        }
      })
      
      // Sort chronologically
      parsed.sort((a, b) => a.time - b.time)
      setParsedLyrics(parsed)
    } else {
      setParsedLyrics([])
    }
    setCurrentLineIndex(-1)
  }, [lyricsData])

  // Sync lyrics highlight line with playback time
  useEffect(() => {
    if (parsedLyrics.length === 0) return

    let activeIdx = -1
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        activeIdx = i
      } else {
        break
      }
    }
    
    setCurrentLineIndex(activeIdx)
  }, [currentTime, parsedLyrics])

  // Scroll active line into center of container
  useEffect(() => {
    if (currentLineIndex !== -1 && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current
      const activeEl = container.children[currentLineIndex]
      if (activeEl) {
        const containerHeight = container.clientHeight
        const activeOffsetTop = activeEl.offsetTop
        const activeHeight = activeEl.clientHeight
        
        container.scrollTo({
          top: activeOffsetTop - containerHeight / 2 + activeHeight / 2,
          behavior: 'smooth'
        })
      }
    }
  }, [currentLineIndex])

  // Auto-scroll plain lyrics when no synced lyrics are available
  useEffect(() => {
    if (parsedLyrics.length === 0 && lyricsContainerRef.current && duration > 0) {
      const container = lyricsContainerRef.current
      const maxScroll = container.scrollHeight - container.clientHeight
      if (maxScroll > 0) {
        container.scrollTo({
          top: maxScroll * (currentTime / duration),
          behavior: 'smooth'
        })
      }
    }
  }, [currentTime, duration, parsedLyrics])

  // Reset time display when song changes
  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
    setParsedLyrics([])
    setCurrentLineIndex(-1)
  }, [currentSong?.id])

  // Attach all audio event listeners once (not on song change — the audio element persists)
  useEffect(() => {
    const audio = audioRef?.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0)
    
    const onDurationChange = () => {
      const d = audio.duration
      if (d && isFinite(d) && !isNaN(d) && d > 0) setDuration(d)
    }
    
    const onLoadedMetadata = () => {
      const d = audio.duration
      if (d && isFinite(d) && !isNaN(d) && d > 0) setDuration(d)
    }

    const onLoadedData = () => {
      const d = audio.duration
      if (d && isFinite(d) && !isNaN(d) && d > 0) setDuration(d)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('loadeddata', onLoadedData)

    // Sync current state immediately
    setCurrentTime(audio.currentTime || 0)
    const d = audio.duration
    if (d && isFinite(d) && !isNaN(d) && d > 0) setDuration(d)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('loadeddata', onLoadedData)
    }
  }, [audioRef]) // Only bind once — audio element doesn't change

  // Volume sync
  useEffect(() => {
    if (audioRef?.current) audioRef.current.volume = volume
  }, [volume, audioRef])

  if (!currentSong) return null

  const formatTime = (time) => {
    if (!time || isNaN(time) || !isFinite(time) || time <= 0) return '0:00'
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleScrub = (e) => {
    const audio = audioRef?.current
    if (!audio || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = pct * duration
    setCurrentTime(audio.currentTime)
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const isTidal = currentSong.id?.startsWith('tidal_')

  const renderLyrics = () => {
    if (lyricsLoading) {
      return (
        <div className="flex-1 flex items-center justify-center text-zinc-400 font-medium">
          LOADING LYRICS...
        </div>
      )
    }

    if (!lyricsData.lyrics) {
      return (
        <div className="flex-1 flex items-center justify-center text-zinc-500 font-medium">
          <span>No lyrics found for this song.</span>
        </div>
      )
    }

    if (useAppleMusicComponent) {
      const songTitle = currentSong?.title || ''
      const songArtist = currentSong?.artist || ''
      return (
        <div className="flex-1 w-full h-[280px] md:h-[340px] px-6 overflow-hidden rounded-xl bg-zinc-950/20">
          <AmLyrics
            songTitle={songTitle}
            songArtist={songArtist}
            query={`${songTitle} ${songArtist}`}
            currentTime={currentTime * 1000}
            onLineClick={(e) => {
              const customEvent = e
              const timestampMs = customEvent.detail.timestamp
              const audio = audioRef?.current
              if (audio) {
                audio.currentTime = timestampMs / 1000
                setCurrentTime(timestampMs / 1000)
              }
            }}
            autoScroll={true}
            highlightColor="#ffffff"
            interpolate={true}
            style={{ height: '100%', width: '100%' }}
          />
          <style dangerouslySetInnerHTML={{ __html: `
            am-lyrics {
              --am-lyrics-highlight-color: #ffffff !important;
              --highlight-color: #ffffff !important;
              font-family: inherit !important;
            }
          `}} />
        </div>
      )
    }

    if (parsedLyrics.length > 0) {
      return (
        <div className="flex flex-col h-full justify-between">
          <div 
            ref={lyricsContainerRef}
            className="flex-1 overflow-y-auto px-6 py-28 flex flex-col gap-6 text-center max-h-[280px] md:max-h-[340px] scrollbar-none select-none"
            style={{ 
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, white 25%, white 75%, transparent)',
              maskImage: 'linear-gradient(to bottom, transparent, white 25%, white 75%, transparent)'
            }}
          >
            {parsedLyrics.map((line, idx) => {
              const isActive = idx === currentLineIndex
              const isPast = idx < currentLineIndex
              const isNextImmediate = idx === currentLineIndex + 1
              
              let animationClass = ''
              if (currentLineIndex === -1) {
                animationClass = 'text-zinc-300/90 scale-100 blur-none'
              } else if (isActive) {
                animationClass = 'text-white font-black scale-105 blur-none drop-shadow-[0_0_15px_rgba(255,255,255,0.45)] text-lg md:text-xl'
              } else if (isNextImmediate) {
                animationClass = 'text-zinc-300/75 scale-[0.98] blur-[0.6px] text-md md:text-lg'
              } else if (isPast) {
                animationClass = 'text-zinc-550/25 scale-[0.93] blur-[2px] text-sm md:text-md'
              } else {
                animationClass = 'text-zinc-400/40 scale-[0.95] blur-[1.2px] text-sm md:text-md'
              }

              return (
                <p 
                  key={idx} 
                  className={`transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] transform cursor-pointer origin-center leading-relaxed ${animationClass}`}
                  onClick={() => {
                    const audio = audioRef?.current
                    if (audio) {
                      audio.currentTime = line.time
                      setCurrentTime(line.time)
                    }
                  }}
                >
                  {line.text}
                </p>
              )
            })}
          </div>
          {lyricsData.copyright && (
            <p className="text-[9px] text-zinc-550 font-mono text-center pb-2 uppercase tracking-wider shrink-0">{lyricsData.copyright}</p>
          )}
        </div>
      )
    }

    const plainLines = lyricsData.lyrics.split(/<br\s*\/?>/i)
    return (
      <div className="flex flex-col h-full justify-between">
        <div 
          ref={lyricsContainerRef}
          className="flex-1 overflow-y-auto px-6 py-10 flex flex-col gap-4 text-center max-h-[280px] md:max-h-[340px] custom-scrollbar text-md font-semibold text-zinc-300 leading-relaxed select-none"
          style={{ 
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)',
            maskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)'
          }}
        >
          {plainLines.map((line, idx) => (
            <p key={idx} className="hover:text-white transition-colors duration-200">{line.trim()}</p>
          ))}
        </div>
        {lyricsData.copyright && (
          <p className="text-[9px] text-zinc-550 font-mono text-center pb-2 uppercase tracking-wider shrink-0">{lyricsData.copyright}</p>
        )}
      </div>
    )
  }

  const renderXRay = () => {
    return (
      <div className="h-full overflow-y-auto px-6 py-4 flex flex-col gap-4 text-left text-zinc-300 text-sm">
        <h3 className="text-xs font-bold font-mono text-[#1db954] uppercase tracking-widest mb-1">Track Information</h3>
        <div className="flex flex-col gap-3.5">
          <p><span className="text-zinc-500 font-medium">Song Title:</span> <strong className="text-white ml-1.5">{currentSong.title}</strong></p>
          <p><span className="text-zinc-500 font-medium">Primary Artist:</span> <strong className="text-white ml-1.5">{currentSong.artist}</strong></p>
          {currentSong.album && <p><span className="text-zinc-500 font-medium">Album name:</span> <strong className="text-white ml-1.5">{currentSong.album}</strong></p>}
          {currentSong.year && <p><span className="text-zinc-500 font-medium">Release Year:</span> <strong className="text-white ml-1.5">{currentSong.year}</strong></p>}
          <p><span className="text-zinc-500 font-medium">Stream Bitrate:</span> <strong className="text-emerald-400 ml-1.5">Lossless 320kbps</strong></p>
          <p><span className="text-zinc-500 font-medium">Signal Format:</span> <strong className="text-emerald-400 ml-1.5">HD Audio / AAC</strong></p>
        </div>
      </div>
    )
  }

  const renderQueue = () => {
    return (
      <div className="h-full overflow-y-auto px-6 py-4 flex flex-col gap-5 text-left text-zinc-300 text-sm max-h-[280px] md:max-h-[340px] custom-scrollbar select-none">
        
        {/* NOW PLAYING SECTION */}
        <div>
          <h3 className="text-xs font-bold font-mono text-[#1db954] uppercase tracking-widest mb-2.5">Now Playing</h3>
          <div className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800/20 p-2.5 rounded-xl">
            {currentSong.image_url ? (
              <img src={currentSong.image_url} alt="" className="w-10 h-10 object-cover rounded-lg" />
            ) : (
              <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-xs">🎵</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentSong.title}</p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">{currentSong.artist}</p>
            </div>
            <span className="text-[9px] bg-[#1db954]/10 text-[#1db954] px-2 py-0.5 rounded font-mono font-bold">PLAYING</span>
          </div>
        </div>

        {/* UP NEXT QUEUE */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest">Up Next</h3>
            {queue.length > 0 && (
              <button 
                onClick={clearQueue} 
                className="text-[10px] text-zinc-500 hover:text-red-400 font-mono transition-colors"
              >
                CLEAR QUEUE
              </button>
            )}
          </div>
          {queue.length === 0 ? (
            <p className="text-xs text-zinc-650 italic pl-1">No songs in queue. Add songs below or enable autoplay.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar">
              {queue.map((song, idx) => (
                <div key={song.id + '-' + idx} className="flex items-center gap-2.5 bg-zinc-900/25 border border-zinc-800/10 p-2 rounded-xl group/qitem">
                  <span className="text-[10px] font-mono text-zinc-600 pl-1 w-4">{idx + 1}</span>
                  {song.image_url && <img src={song.image_url} alt="" className="w-8 h-8 object-cover rounded-md" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate group-hover/qitem:text-white transition-colors">{song.title}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{song.artist}</p>
                  </div>
                  <button 
                    onClick={() => removeFromQueue(song.id)}
                    className="text-zinc-600 hover:text-red-400 p-1 font-bold text-xs"
                    title="Remove from queue"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AUTOPLAY TOGGLE ROW */}
        <div className="flex justify-between items-center border-t border-zinc-900/60 pt-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-200">Autoplay Similar Songs</span>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5">Appends recommended hits when list ends</span>
          </div>
          <button 
            onClick={() => setAutoplayEnabled(!autoplayEnabled)}
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-250 shrink-0 ${autoplayEnabled ? 'bg-[#1db954]' : 'bg-zinc-800'}`}
          >
            <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform duration-250 shadow-md ${autoplayEnabled ? 'translate-x-4.5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* RECOMMENDED SONGS LIST */}
        <div className="border-t border-zinc-900/60 pt-3">
          <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-3">Recommended Tracks</h3>
          {recsLoading ? (
            <div className="flex items-center justify-center py-4 text-[10px] font-mono tracking-widest text-zinc-650 animate-pulse">
              ⚡ FETCHING RECOMMENDATIONS...
            </div>
          ) : recommendedTracks.length === 0 ? (
            <p className="text-xs text-zinc-650 italic pl-1">No recommendations found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recommendedTracks.map((song) => (
                <div key={song.id} className="flex items-center gap-2.5 bg-zinc-900/15 hover:bg-zinc-900/35 border border-zinc-800/10 p-2 rounded-xl group/recitem transition">
                  {song.image_url && <img src={song.image_url} alt="" className="w-8 h-8 object-cover rounded-md" />}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playTrack(song, recommendedTracks)}>
                    <p className="text-xs font-semibold text-zinc-350 group-hover/recitem:text-white truncate transition-colors">{song.title}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{song.artist}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => addToQueue(song)}
                      className="text-[10px] bg-zinc-850/80 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2 py-1 rounded font-mono font-bold transition"
                      title="Add to queue"
                    >
                      + QUEUE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    )
  }

  return (
    <>
      {/* 1. MINI BOTTOM BAR PLAYER */}
      <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-6 h-[85px] md:h-[95px] bg-[#0c0c0e]/80 border border-zinc-800/80 rounded-2xl px-4 md:px-6 flex items-center justify-between z-50 text-white select-none backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] glow-border animate-in slide-in-from-bottom duration-300">
        
        {/* LEFT: Song info (clickable to expand) */}
        <div onClick={() => setIsExpanded(true)} className="flex items-center gap-3 w-1/3 min-w-[150px] md:min-w-[240px] cursor-pointer group">
          <div className="relative shrink-0">
            {currentSong.image_url ? (
              <img src={currentSong.image_url} alt="" className="w-11 h-11 md:w-14 md:h-14 object-cover rounded-xl shadow-md border border-zinc-800/40 group-hover:scale-105 transition-transform" />
            ) : (
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs md:text-sm text-zinc-500">🎵</div>
            )}
            {isTidal && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#1db954] text-black text-[8px] font-extrabold px-1 rounded-md font-mono select-none shadow">
                HIFI
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0 max-w-[100px] sm:max-w-[150px]">
            <span className="text-[12px] md:text-[13px] font-bold text-zinc-100 group-hover:text-[#22c55e] truncate transition-colors duration-200">{currentSong.title}</span>
            <span className="text-[10px] md:text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{currentSong.artist}</span>
          </div>
          <div className="flex items-center gap-0.5 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => toggleFavorite(currentSong, currentSong.is_favorite)} className="transition-transform duration-150 hover:scale-125 active:scale-90 text-xs p-1" title="Like Track">
              {currentSong.is_favorite ? '❤️' : '🤍'}
            </button>
          </div>
        </div>

        {/* CENTER: Controls + Progress */}
        <div className="flex flex-col items-center gap-2.5 flex-1 max-w-[640px] px-2">
          
          {/* Playback controls */}
          <div className="flex items-center gap-5 md:gap-6">
            <button onClick={() => setIsShuffle(!isShuffle)} className={`transition-colors duration-150 p-1 ${isShuffle ? 'text-[#1db954]' : 'text-zinc-500 hover:text-white'}`} title="Shuffle">
              <svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M10.596 1.161a1 1 0 0 0-1.414 0L7.83 2.513l1.414 1.415 1.352-1.353 1.353 1.353 1.414-1.415-2.167-2.152zM1.05 1.05a1 1 0 0 0 0 1.414L3.636 5.05l1.415-1.414L2.464 1.05a1 1 0 0 0-1.414 0zm11.364 11.364L9.828 9.828l-1.414 1.414 2.586 2.586a1 1 0 0 0 1.414 0l2.167-2.152-1.414-1.415-1.353 1.353zm-8.778.136l8.727-8.727-1.414-1.414-8.727 8.727 1.414 1.414z"></path></svg>
            </button>
            
            <button onClick={handlePrev} className="text-zinc-400 hover:text-white transition-colors duration-150 p-1" title="Previous">
              <svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v11.475a.7.7 0 0 1-1.05.606L4 9.15v5.15a.7.7 0 0 1-1.4 0V1.7a.7.7 0 0 1 .7-.7z"></path></svg>
            </button>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)} 
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white text-black flex items-center justify-center transform hover:scale-105 active:scale-95 transition-all shadow-md shrink-0"
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
            
            <button onClick={() => setIsRepeat(!isRepeat)} className={`transition-colors duration-150 p-1 ${isRepeat ? 'text-[#1db954]' : 'text-zinc-500 hover:text-white'}`} title="Repeat">
              <svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.03a.75.75 0 0 1 0-1.06l2.829-2.829a.75.75 0 1 1 1.06 1.06L9.81 12h2.44a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"></path></svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full flex items-center gap-3 text-[10px] md:text-[11px] text-zinc-500 font-mono select-none">
            <span className="min-w-[30px] text-right">{formatTime(currentTime)}</span>
            <div 
              ref={progressRef} onClick={handleScrub} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
              className="flex-1 h-1 bg-zinc-800 rounded-full cursor-pointer relative py-2 flex items-center group"
            >
              <div className="w-full h-1 bg-zinc-800 rounded-full relative overflow-hidden">
                <div className={`h-full rounded-full transition-colors ${isHovered ? 'bg-[#1db954]' : 'bg-zinc-400'}`} style={{ width: `${progressPct}%` }} />
              </div>
              <div className={`absolute w-3 h-3 bg-white rounded-full shadow-md transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`} style={{ left: `calc(${progressPct}% - 6px)` }} />
            </div>
            <span className="min-w-[30px] text-left">{formatTime(duration)}</span>
          </div>
        </div>

        {/* RIGHT: Volume */}
        <div className="w-1/3 min-w-[60px] sm:min-w-[180px] flex items-center justify-end gap-3 text-zinc-400 max-sm:hidden shrink-0">
          <div className="flex items-center gap-2.5 group max-w-[110px] w-full ml-1">
            <button onClick={() => setVolume(volume === 0 ? 0.5 : 0)} className="hover:text-white transition-colors text-xs shrink-0">
              {volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : '🔊'}
            </button>
            <input 
              type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))}
              className="w-full accent-white group-hover:accent-[#1db954] h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none transition-all" 
            />
          </div>
        </div>
      </div>

      {/* 2. EXPANDED AMAZON-STYLE BLURRED PLAYER OVERLAY */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col justify-between p-6 select-none animate-in fade-in slide-in-from-bottom duration-500 text-white overflow-hidden">
          {/* Dynamic Blurred Adaptive Backdrop */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 -z-10 scale-110"
            style={{ 
              backgroundImage: `url(${currentSong.image_url})`,
              filter: 'blur(40px) brightness(0.20)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/95 -z-10" />

          {/* HEADER ROW */}
          <div className="flex justify-between items-center w-full max-w-md mx-auto pb-4">
            <button 
              onClick={() => { setIsExpanded(false); setActiveOverlayTab(''); }}
              className="w-10 h-10 rounded-full bg-zinc-800/40 hover:bg-zinc-800 flex items-center justify-center transition hover:scale-105 active:scale-95"
              title="Close Player"
            >
              <svg role="img" height="18" width="18" fill="currentColor" viewBox="0 0 16 16"><path d="M8 11.5a.75.75 0 0 1-.53-.22L3.22 7.03a.75.75 0 1 1 1.06-1.06L8 9.44l3.72-3.47a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-.53.22z"></path></svg>
            </button>
            <span className="text-[9px] font-extrabold tracking-widest font-mono text-zinc-400 uppercase">VIBE MUSIC PLAYER</span>
            <button 
              className="w-10 h-10 rounded-full bg-zinc-800/40 hover:bg-zinc-800 flex items-center justify-center transition"
              title="Track Details"
              onClick={() => setActiveOverlayTab(activeOverlayTab === 'xray' ? '' : 'xray')}
            >
              <svg role="img" height="16" width="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8.75 4a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 1.5 0v5zM8 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"></path></svg>
            </button>
          </div>

          {/* MAIN PLAYER AREA (Album Cover / Lyrics / X-Ray) */}
          <div className="flex-1 flex flex-col items-center justify-center my-4 w-full max-w-md mx-auto relative min-h-[300px]">
            {activeOverlayTab === 'lyrics' ? (
              <div className="w-full h-full min-h-[300px] bg-zinc-950/60 border border-zinc-800/40 rounded-3xl backdrop-blur-md flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300">
                <div className="p-4 border-b border-zinc-900 flex justify-between items-center shrink-0 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono tracking-wider text-[#22c55e] uppercase">🔮 Synced Lyrics</span>
                    <button 
                      onClick={() => setUseAppleMusicComponent(!useAppleMusicComponent)}
                      className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:border-zinc-500 text-zinc-300 transition-all cursor-pointer"
                    >
                      {useAppleMusicComponent ? '🎛️ Standard View' : '✨ Apple Music View'}
                    </button>
                  </div>
                  <button onClick={() => setActiveOverlayTab('')} className="text-zinc-500 hover:text-white text-xs px-1">✕ Close</button>
                </div>
                <div className="flex-1 overflow-hidden">
                  {renderLyrics()}
                </div>
              </div>
            ) : activeOverlayTab === 'xray' ? (
              <div className="w-full h-full min-h-[300px] bg-zinc-950/60 border border-zinc-800/40 rounded-3xl backdrop-blur-md p-4 shadow-2xl transition-all duration-300">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5 mb-2 shrink-0">
                  <span className="text-[10px] font-bold font-mono tracking-wider text-[#22c55e] uppercase">🔍 X-Ray Details</span>
                  <button onClick={() => setActiveOverlayTab('')} className="text-zinc-500 hover:text-white text-xs px-1">✕ Close</button>
                </div>
                {renderXRay()}
              </div>
            ) : activeOverlayTab === 'queue' ? (
              <div className="w-full h-full min-h-[300px] bg-zinc-950/60 border border-zinc-800/40 rounded-3xl backdrop-blur-md flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300">
                <div className="p-4 border-b border-zinc-900 flex justify-between items-center shrink-0">
                  <span className="text-[10px] font-bold font-mono tracking-wider text-[#22c55e] uppercase">🎵 Playback Queue</span>
                  <button onClick={() => setActiveOverlayTab('')} className="text-zinc-500 hover:text-white text-xs px-1">✕ Close</button>
                </div>
                <div className="flex-1 overflow-hidden">
                  {renderQueue()}
                </div>
              </div>
            ) : (
              /* Swiper/Slider Carousel for Album Covers */
              <div 
                className="w-full overflow-hidden relative flex items-center justify-center h-72 sm:h-80 select-none cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Previous cover (Left) */}
                {prevSong && (
                  <div 
                    onClick={(e) => { e.stopPropagation(); triggerPrevWithAnimation(); }}
                    className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden z-0 cursor-pointer select-none"
                    style={leftStyle}
                  >
                    <img src={prevSong.image_url} alt="" className="w-full h-full object-cover pointer-events-none animate-fade-in" />
                  </div>
                )}

                {/* Current cover (Center) */}
                <div 
                  className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-zinc-800/40 z-10 select-none"
                  style={centerStyle}
                >
                  {displaySong.image_url ? (
                    <img src={displaySong.image_url} alt="" className="w-full h-full object-cover pointer-events-none animate-fade-in" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center font-bold text-4xl text-zinc-600 pointer-events-none">🎵</div>
                  )}
                </div>

                {/* Next cover (Right) */}
                {nextSong && (
                  <div 
                    onClick={(e) => { e.stopPropagation(); triggerNextWithAnimation(); }}
                    className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden z-0 cursor-pointer select-none"
                    style={rightStyle}
                  >
                    <img src={nextSong.image_url} alt="" className="w-full h-full object-cover pointer-events-none animate-fade-in" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PLAYER CONTROLS PANEL */}
          <div className="w-full max-w-md mx-auto flex flex-col pb-6">
            
            {/* AMZ TABS: Lyrics / X-Ray pills */}
            <div className="flex gap-4 justify-center mb-6">
              <button 
                onClick={() => setActiveOverlayTab(activeOverlayTab === 'lyrics' ? '' : 'lyrics')}
                className={`py-1.5 px-6 rounded-full text-xs font-bold transition-all border ${activeOverlayTab === 'lyrics' ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800'}`}
              >
                Lyrics
              </button>
              <button 
                onClick={() => setActiveOverlayTab(activeOverlayTab === 'xray' ? '' : 'xray')}
                className={`py-1.5 px-6 rounded-full text-xs font-bold transition-all border ${activeOverlayTab === 'xray' ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800'}`}
              >
                X-Ray
              </button>
            </div>

            {/* TRACK METADATA (Left side: titles, Right side: heart) */}
            <div className="flex justify-between items-center px-1 mb-4">
              <div className="flex flex-col min-w-0 text-left gap-1">
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight truncate max-w-[280px] sm:max-w-[340px]">{currentSong.title}</h2>
                <p className="text-sm sm:text-md text-zinc-400 font-semibold truncate max-w-[280px] sm:max-w-[340px]">{currentSong.artist}</p>
              </div>
              <button 
                onClick={() => toggleFavorite(currentSong, currentSong.is_favorite)} 
                className="text-2xl p-2 transition hover:scale-115 active:scale-90"
              >
                {currentSong.is_favorite ? '❤️' : '🤍'}
              </button>
            </div>

            {/* SCRUB TIMELINE */}
            <div className="flex flex-col gap-2.5 px-1 mb-6">
              <div className="w-full flex items-center gap-3 text-xs text-zinc-400 font-mono select-none">
                <span className="min-w-[35px] text-right">{formatTime(currentTime)}</span>
                <div 
                  ref={progressRef} onClick={handleScrub}
                  className="flex-1 h-1 bg-zinc-800 rounded-full cursor-pointer relative py-2 flex items-center group"
                >
                  <div className="w-full h-1 bg-zinc-800 rounded-full relative overflow-hidden">
                    <div className="h-full rounded-full bg-white transition-colors group-hover:bg-[#1db954]" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="absolute w-3 h-3 bg-white rounded-full shadow-md" style={{ left: `calc(${progressPct}% - 6px)` }} />
                </div>
                <span className="min-w-[35px] text-left">{formatTime(duration)}</span>
              </div>
              
              {/* Quality Label Badge */}
              <div className="flex justify-center">
                <span className="text-[9px] bg-zinc-900/60 border border-zinc-800/80 text-zinc-500 font-black tracking-widest px-2.5 py-0.5 rounded font-mono">
                  {currentSong.audio_url ? 'ULTRA HD' : 'SD'}
                </span>
              </div>
            </div>

            {/* AUDIO PRIMARY CONTROLS */}
            <div className="flex items-center justify-center gap-8 mb-6">
              <button onClick={triggerPrevWithAnimation} className="text-white hover:text-zinc-300 p-2 transition hover:scale-105 active:scale-95" title="Previous">
                <svg role="img" height="20" width="20" fill="currentColor" viewBox="0 0 16 16"><path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v11.475a.7.7 0 0 1-1.05.606L4 9.15v5.15a.7.7 0 0 1-1.4 0V1.7a.7.7 0 0 1 .7-.7z"></path></svg>
              </button>
              
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="w-16 h-16 rounded-full bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 text-white flex items-center justify-center shadow-lg transition transform hover:scale-105 active:scale-95"
              >
                {isPlaying ? (
                  <svg role="img" height="24" width="24" fill="currentColor" viewBox="0 0 16 16"><path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm7.4 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"></path></svg>
                ) : (
                  <svg role="img" height="24" width="24" fill="currentColor" viewBox="0 0 16 16" className="ml-1"><path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"></path></svg>
                )}
              </button>

              <button onClick={triggerNextWithAnimation} className="text-white hover:text-zinc-300 p-2 transition hover:scale-105 active:scale-95" title="Next">
                <svg role="img" height="20" width="20" fill="currentColor" viewBox="0 0 16 16"><path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.106A.7.7 0 0 0 1 1.712v11.475a.7.7 0 0 0 1.05.606L12 9.15v5.15a.7.7 0 0 0 1.4 0V1.7a.7.7 0 0 0-.7-.7z"></path></svg>
              </button>
            </div>

            {/* BOTTOM UTILITY ACTION ROW */}
            <div className="flex justify-between items-center px-4 text-zinc-400">
              <button className="w-10 h-10 rounded-full bg-zinc-900/40 hover:bg-zinc-800 hover:text-white flex items-center justify-center transition" title="Share">
                <svg role="img" height="18" width="18" fill="currentColor" viewBox="0 0 16 16"><path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.707 3.354a2.5 2.5 0 0 1 0 1.036l6.707 3.354A2.5 2.5 0 1 1 11 13.5a2.5 2.5 0 0 1-.603-1.628l-6.707-3.354a2.5 2.5 0 0 1 0-1.036l6.707-3.354A2.5 2.5 0 0 1 11 2.5zM3.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"></path></svg>
              </button>
              
              <button className="w-10 h-10 rounded-full bg-zinc-900/40 hover:bg-zinc-800 hover:text-white flex items-center justify-center transition" title="Cast to Device">
                <svg role="img" height="18" width="18" fill="currentColor" viewBox="0 0 16 16"><path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.5a.5.5 0 0 0 0-1H2a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.5a.5.5 0 0 0 0 1H14a1 1 0 0 1 1 1v6zM0 13a1 1 0 0 1 1-1 .5.5 0 0 0 0-1 2 2 0 0 0-2 2zm0-3a3 3 0 0 1 3-3 .5.5 0 0 0 0-1 4 4 0 0 0-4 4zm0-3a5 5 0 0 1 5-5 .5.5 0 0 0 0-1 6 6 0 0 0-6 6z"></path></svg>
              </button>

              <button 
                onClick={() => setActiveOverlayTab(activeOverlayTab === 'queue' ? '' : 'queue')}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${activeOverlayTab === 'queue' ? 'bg-[#1db954] text-black shadow-lg hover:bg-[#1ed760]' : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                title="Up Next Queue"
              >
                <svg role="img" height="18" width="18" fill="currentColor" viewBox="0 0 16 16"><path d="M12 13c0 1.105-1.12 2-2.5 2S7 14.105 7 13s1.12-2 2.5-2 2.5.895 2.5 2z"></path><path d="M12 3v10h-1V3h1z"></path><path d="M11 2.82a1 1 0 0 1 .804-.98l3-.6A1 1 0 0 1 16 2.22V5l-5 1V2.82zM1 2.5A.5.5 0 0 1 1.5 2h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"></path></svg>
              </button>

              <button className="w-10 h-10 rounded-full bg-zinc-900/40 hover:bg-zinc-800 hover:text-white flex items-center justify-center transition" title="More Options">
                <svg role="img" height="18" width="18" fill="currentColor" viewBox="0 0 16 16"><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"></path></svg>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}