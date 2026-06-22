'use client'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useAudio } from '@/context/AudioContext'
import { updateProfileOnInteraction, scoreAndSortTracks, markAsDisliked } from '@/utils/recoEngine'

export default function GlobalPlayer() {
  const { 
    currentSong, isPlaying, setIsPlaying, audioRef,
    isShuffle, setIsShuffle, isRepeat, setIsRepeat, handleNext, handlePrev,
    toggleFavorite,
    queue, setQueue, autoplayEnabled, setAutoplayEnabled,
    playNext, addToQueue, removeFromQueue, clearQueue, playTrack, playlist,
    customPlaylists
  } = useAudio()

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isHovered, setIsHovered] = useState(false)
  const progressRef = useRef(null)

  // ── YouTube IFrame Player (for ytmusic source tracks) ──
  const ytContainerRef  = useRef(null)   // div that YT.Player mounts into
  const ytPlayerRef     = useRef(null)   // YT.Player instance
  const ytReadyRef      = useRef(false)  // is the YT API loaded?
  const ytTimerRef      = useRef(null)   // rAF cancel flag object
  // Ref mirrors for stale-closure safety inside YT event callbacks
  const isRepeatRef     = useRef(isRepeat)
  const handleNextRef   = useRef(handleNext)
  const isYTSong = currentSong?.source === 'ytmusic'

  // Keep refs in sync with latest values
  useEffect(() => { isRepeatRef.current = isRepeat }, [isRepeat])
  useEffect(() => { handleNextRef.current = handleNext }, [handleNext])

  // Reset timer display instantly when song changes
  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
  }, [currentSong?.id])

  // Load the YouTube IFrame API script once
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.YT && window.YT.Player) { ytReadyRef.current = true; return }

    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script')
      tag.id = 'yt-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }

    window.onYouTubeIframeAPIReady = () => {
      ytReadyRef.current = true
    }
  }, [])

  // Create / reload YT.Player when a YouTube Music song is selected
  useEffect(() => {
    if (!isYTSong || !currentSong?.rawId) return

    const videoId = currentSong.rawId
    // alive flag — set to false in cleanup to stop the rAF loop and cancel pending init
    const alive = { value: true }

    // Cancel any previous rAF polling loop
    if (ytTimerRef.current) {
      ytTimerRef.current.value = false
      ytTimerRef.current = null
    }

    const startPolling = (player) => {
      alive.value = true
      ytTimerRef.current = alive
      const tick = () => {
        if (!alive.value) return  // cleanly cancelled
        try {
          const t = player.getCurrentTime() || 0
          const d = player.getDuration() || 0
          setCurrentTime(t)
          if (d > 0) setDuration(d)
        } catch (_) {}
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    const initPlayer = () => {
      if (!alive.value) return // Abort if cancelled before ready

      if (!ytReadyRef.current || !ytContainerRef.current) {
        setTimeout(initPlayer, 200)
        return
      }

      // Destroy previous player cleanly
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy() } catch (_) {}
        ytPlayerRef.current = null
      }

      const mountId = `yt-player-mount-${Date.now()}`
      ytContainerRef.current.innerHTML = `<div id="${mountId}"></div>`

      ytPlayerRef.current = new window.YT.Player(mountId, {
        height: '0',
        width: '0',
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            if (!alive.value) {
              try { e.target.destroy() } catch (_) {}
              return
            }
            e.target.setVolume(volume * 100)
            // Always autoplay — isPlaying is set true before we get here
            e.target.playVideo()
            const d = e.target.getDuration()
            if (d && d > 0) setDuration(d)
            startPolling(e.target)
          },
          onStateChange: (e) => {
            if (!alive.value) return
            // Use refs so callbacks always see the latest values
            if (e.data === window.YT.PlayerState.ENDED) {
              if (isRepeatRef.current) {
                e.target.seekTo(0, true)
                e.target.playVideo()
              } else {
                handleNextRef.current()
              }
            }
          },
          onError: (e) => {
            if (!alive.value) return
            console.warn('[YT Player] Error code:', e.data)
            // Small delay to avoid rapid-fire errors
            setTimeout(() => {
              if (alive.value) handleNextRef.current()
            }, 500)
          }
        }
      })
    }

    initPlayer()

    return () => {
      // Stop the rAF loop for this song and cancel initialization
      alive.value = false
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy() } catch (_) {}
        ytPlayerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.rawId, isYTSong])

  // Sync play/pause state with YT player
  useEffect(() => {
    const p = ytPlayerRef.current
    if (!p || !isYTSong) return
    try {
      if (isPlaying) { p.playVideo() } else { p.pauseVideo() }
    } catch (_) {}
  }, [isPlaying, isYTSong])

  // Sync volume with YT player
  useEffect(() => {
    const p = ytPlayerRef.current
    if (!p || !isYTSong) return
    try { p.setVolume(volume * 100) } catch (_) {}
  }, [volume, isYTSong])


  // Expandable player states
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeOverlayTab, setActiveOverlayTab] = useState('') // '' | 'lyrics' | 'xray' | 'queue'
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [lyricsData, setLyricsData] = useState({ lyrics: '', syncedLyrics: '', copyright: '', lyricsProvider: '' })
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [parsedLyrics, setParsedLyrics] = useState([])
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const lyricsContainerRef = useRef(null)
  const activeLineRef = useRef(null)

  // Swipe-Up Queue bottom sheet gesture state
  const [queueExpanded, setQueueExpanded] = useState(false)
  const [isDraggingQueue, setIsDraggingQueue] = useState(false)
  const [dragQueueStartY, setDragQueueStartY] = useState(0)
  const [dragQueueDeltaY, setDragQueueDeltaY] = useState(0)
  const queueSheetRef = useRef(null)

  // Action panel states
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showCastMenu, setShowCastMenu] = useState(false)
  const [castActive, setCastActive] = useState(false)
  const [sleepTimerMins, setSleepTimerMins] = useState(null)
  const [sleepTimerLeft, setSleepTimerLeft] = useState(null)
  const sleepTimerRef = useRef(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedPicker, setShowSpeedPicker] = useState(false)
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false)
  const [shareToast, setShareToast] = useState('')

  // Preference Profile Listening/Interaction Accumulators
  const durationListenedRef = useRef(0)
  const lastActiveSongRef = useRef(null)

  // Accumulate wall-clock duration while isPlaying is active
  useEffect(() => {
    if (!isPlaying || !currentSong) return

    let lastTime = Date.now()
    const timer = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - lastTime) / 1000
      if (elapsed > 0 && elapsed < 3) {
        durationListenedRef.current += elapsed
      }
      lastTime = now
    }, 1000)

    return () => clearInterval(timer)
  }, [isPlaying, currentSong?.id])

  // Record interaction on song change
  useEffect(() => {
    if (lastActiveSongRef.current) {
      const prevSong = lastActiveSongRef.current
      const prevDuration = duration
      const listened = durationListenedRef.current
      
      console.log(`📡 RecoEngine: Recording interaction for "${prevSong.title}" - Listened: ${listened.toFixed(1)}s, Total: ${prevDuration}s`)
      updateProfileOnInteraction(prevSong, listened, prevDuration)
    }

    lastActiveSongRef.current = currentSong
    durationListenedRef.current = 0
  }, [currentSong?.id])

  // Record interaction on tab close/unload
  useEffect(() => {
    const handleUnload = () => {
      if (lastActiveSongRef.current) {
        updateProfileOnInteraction(lastActiveSongRef.current, durationListenedRef.current, duration)
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [duration])

  // HTML5 Drag and Drop Handlers for Queue Reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    
    const newQueue = [...queue]
    const draggedItem = newQueue[draggedIndex]
    newQueue.splice(draggedIndex, 1)
    newQueue.splice(index, 0, draggedItem)
    
    setDraggedIndex(index)
    setQueue(newQueue)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Album cover carousel — 3-panel strip, native iOS swipe feel
  const dragStartXRef   = useRef(null)
  const dragDeltaXRef   = useRef(0)
  const isDraggingRef   = useRef(false)
  const rafIdRef        = useRef(null)
  const stripRef        = useRef(null)   // the 300%-wide sliding strip
  const lastXRef        = useRef(0)      // for velocity calculation
  const lastTimeRef     = useRef(0)      // for velocity calculation
  const velocityRef     = useRef(0)      // px/ms at moment of release
  const [animating, setAnimating]   = useState(false)
  const [displaySong, setDisplaySong] = useState(currentSong)

  // Keep displaySong in sync when song changes externally (e.g. auto-next)
  useEffect(() => {
    if (!animating) setDisplaySong(currentSong)
  }, [currentSong, animating])

  const getPrevSong = () => {
    if (!playlist || playlist.length === 0 || !currentSong) return null
    const idx = playlist.findIndex(s => String(s.id) === String(currentSong.id))
    if (idx === -1) return null
    return playlist[idx <= 0 ? playlist.length - 1 : idx - 1]
  }

  const getNextSong = () => {
    if (queue && queue.length > 0) return queue[0]
    if (!playlist || playlist.length === 0 || !currentSong) return null
    const idx = playlist.findIndex(s => String(s.id) === String(currentSong.id))
    if (idx === -1) return null
    return idx === playlist.length - 1 ? playlist[0] : playlist[idx + 1]
  }

  // Move the strip to a given offset (in px) from the center-panel rest position
  // Center panel rest = -33.333% of strip width
  const setStripOffset = (deltaPx) => {
    if (!stripRef.current) return
    stripRef.current.style.transform = `translateX(calc(-33.3333% + ${deltaPx}px))`
  }

  const setStripTransition = (val) => {
    if (stripRef.current) stripRef.current.style.transition = val || 'none'
  }

  /** Snap back to center — springy bounce */
  const snapToCenter = () => {
    setStripTransition('transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)')
    setStripOffset(0)
    setTimeout(() => setStripTransition('none'), 340)
  }

  /** Fly strip to next song panel, then instantly reset with new songs */
  const triggerNextWithAnimation = () => {
    if (animating) return
    const nextSong = getNextSong()
    if (!nextSong) { snapToCenter(); return }
    setAnimating(true)
    // How far do we still need to travel? (strip width = 3x container, one panel = 33.333%)
    // Get current translateX so we continue from wherever the finger left off
    const containerW = stripRef.current?.parentElement?.clientWidth || 300
    setStripTransition('transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94)')
    // Fly to next panel: -33.333% more = -66.666% total = translate by -containerW
    setStripOffset(-containerW)
    setTimeout(() => {
      handleNext()
      setDisplaySong(nextSong)
      // Instant reset — no flash because transition is off
      setStripTransition('none')
      setStripOffset(0)
      setAnimating(false)
    }, 330)
  }

  const triggerPrevWithAnimation = () => {
    if (animating) return
    const prevSong = getPrevSong()
    if (!prevSong) { snapToCenter(); return }
    setAnimating(true)
    const containerW = stripRef.current?.parentElement?.clientWidth || 300
    setStripTransition('transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94)')
    setStripOffset(containerW)
    setTimeout(() => {
      // Pass YT current time so 3s-restart logic works for YT songs
      const ytT = isYTSong && ytPlayerRef.current ? (ytPlayerRef.current.getCurrentTime() || 0) : undefined
      handlePrev(ytT)
      setDisplaySong(prevSong)
      setStripTransition('none')
      setStripOffset(0)
      setAnimating(false)
    }, 330)
  }

  const startDrag = (clientX) => {
    if (animating) return
    dragStartXRef.current = clientX
    dragDeltaXRef.current = 0
    isDraggingRef.current = true
    lastXRef.current      = clientX
    lastTimeRef.current   = performance.now()
    velocityRef.current   = 0
    setStripTransition('none')
  }

  const moveDrag = (clientX) => {
    if (!isDraggingRef.current || animating) return
    const now     = performance.now()
    const dt      = now - lastTimeRef.current
    if (dt > 0) velocityRef.current = (clientX - lastXRef.current) / dt  // px/ms
    lastXRef.current    = clientX
    lastTimeRef.current = now
    const delta = clientX - dragStartXRef.current
    dragDeltaXRef.current = delta
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = requestAnimationFrame(() => setStripOffset(delta))
  }

  const endDrag = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null }
    const delta    = dragDeltaXRef.current
    const velocity = velocityRef.current   // px/ms, positive = dragged right
    const DIST_THRESHOLD = 50             // px
    const VEL_THRESHOLD  = 0.3            // px/ms (flick speed)
    const goNext = delta < -DIST_THRESHOLD || velocity < -VEL_THRESHOLD
    const goPrev = delta >  DIST_THRESHOLD || velocity >  VEL_THRESHOLD
    if (goNext)       triggerNextWithAnimation()
    else if (goPrev)  triggerPrevWithAnimation()
    else              snapToCenter()
    dragStartXRef.current = null
    dragDeltaXRef.current = 0
  }

  const handleTouchStart = (e) => startDrag(e.touches[0].clientX)
  const handleTouchMove  = (e) => { e.preventDefault(); moveDrag(e.touches[0].clientX) }
  const handleTouchEnd   = ()  => endDrag()
  const handleMouseDown  = (e) => { e.preventDefault(); startDrag(e.clientX) }
  const handleMouseMove  = (e) => moveDrag(e.clientX)
  const handleMouseUp    = ()  => endDrag()

  const prevSong = getPrevSong()
  const nextSong = getNextSong()


  // ── Lyrics Fetching: parallel race between LRCLIB (fast CDN) and JioSaavn server ──
  useEffect(() => {
    if (activeOverlayTab !== 'lyrics' || !currentSong) return

    let cancelled = false
    setLyricsLoading(true)
    setLyricsData({ lyrics: '', syncedLyrics: '', copyright: '', lyricsProvider: '' })

    const cleanTitle = (currentSong.title || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim()
    const cleanArtist = (currentSong.artist || '').split(/,|\b&\b|\bvs\b|\bfeat\b/i)[0].trim()

    // ── Source A: LRCLIB direct (fastest — no backend hop) ──
    const lrcFetch = async () => {
      const lrcParams = new URLSearchParams({ artist_name: cleanArtist, track_name: cleanTitle })
      if (currentSong.album) lrcParams.set('album_name', currentSong.album)
      const r = await fetch(`https://lrclib.net/api/get?${lrcParams}`, {
        headers: { 'User-Agent': 'VibeMusicPlayer/1.0' }
      })
      if (!r.ok) throw new Error('LRCLIB miss')
      const d = await r.json()
      if (!d?.syncedLyrics && !d?.plainLyrics) throw new Error('LRCLIB no lyrics')
      return {
        lyrics: d.plainLyrics?.replace(/\r?\n/g, '<br>') || '',
        syncedLyrics: d.syncedLyrics || '',
        copyright: d.albumName ? `${d.albumName} · LRCLIB` : 'LRCLIB',
        lyricsProvider: 'LRCLIB',
        hasSynced: !!d.syncedLyrics
      }
    }

    // ── Source B: JioSaavn server route (may have exclusive Hindi/regional synced lyrics) ──
    const saavnFetch = async () => {
      const params = new URLSearchParams()
      if (currentSong.rawId) params.set('id', currentSong.rawId)
      if (currentSong.title) params.set('title', currentSong.title)
      if (currentSong.artist) params.set('artist', currentSong.artist)
      const r = await fetch(`/api/saavn/lyrics?${params}`)
      if (!r.ok) throw new Error('Saavn miss')
      const d = await r.json()
      if (!d?.lyrics && !d?.syncedLyrics) throw new Error('Saavn no lyrics')
      return {
        ...d,
        lyricsProvider: d.copyright?.includes('LRCLIB') ? 'LRCLIB' : 'JioSaavn',
        hasSynced: !!d.syncedLyrics
      }
    }

    // Race: use whoever returns synced lyrics first; fall back to plain
    const resolve = (results) => {
      if (cancelled) return
      // Prefer result with synced lyrics
      const synced = results.find(r => r.status === 'fulfilled' && r.value?.hasSynced)
      if (synced) {
        setLyricsData(synced.value)
        setLyricsLoading(false)
        return
      }
      // Fall back to any result with any lyrics
      const anyLyrics = results.find(r => r.status === 'fulfilled' && (r.value?.lyrics || r.value?.syncedLyrics))
      if (anyLyrics) {
        setLyricsData(anyLyrics.value)
      }
      setLyricsLoading(false)
    }

    // Fire both in parallel and resolve as soon as we have a synced result
    let settled = 0
    const results = [null, null]
    const check = () => {
      if (cancelled) return
      settled++
      if (settled === 2) { resolve(results); return }
      // If the one that just finished has synced lyrics, apply immediately without waiting for the other
      const done = results.find(r => r !== null)
      if (done?.status === 'fulfilled' && done.value?.hasSynced) {
        resolve([done])
      }
    }

    lrcFetch()
      .then(v => { results[0] = { status: 'fulfilled', value: v }; check() })
      .catch(() => { results[0] = { status: 'rejected' }; check() })

    saavnFetch()
      .then(v => { results[1] = { status: 'fulfilled', value: v }; check() })
      .catch(() => { results[1] = { status: 'rejected' }; check() })

    return () => { cancelled = true }
  }, [activeOverlayTab, currentSong?.rawId, currentSong?.title, currentSong?.artist, currentSong?.album])

  // Sync overlay tab with queue bottom sheet
  useEffect(() => {
    if (queueExpanded) {
      setActiveOverlayTab('')
    }
  }, [queueExpanded])

  useEffect(() => {
    if (activeOverlayTab !== '') {
      setQueueExpanded(false)
    }
  }, [activeOverlayTab])

  // Drag handlers for queue bottom sheet
  const handleQueueHeaderTouchStart = (e) => {
    setDragQueueStartY(e.touches[0].clientY)
    setIsDraggingQueue(true)
    setDragQueueDeltaY(0)
  }

  const handleQueueHeaderTouchMove = (e) => {
    if (!isDraggingQueue) return
    const clientY = e.touches[0].clientY
    const deltaY = clientY - dragQueueStartY
    
    if (queueExpanded) {
      const clampedDeltaY = Math.max(0, deltaY)
      setDragQueueDeltaY(clampedDeltaY)
    } else {
      const clampedDeltaY = Math.min(0, deltaY)
      setDragQueueDeltaY(clampedDeltaY)
    }
  }

  const handleQueueHeaderTouchEnd = () => {
    if (!isDraggingQueue) return
    setIsDraggingQueue(false)
    
    const finalDeltaY = dragQueueDeltaY
    const threshold = 100
    
    if (Math.abs(finalDeltaY) < 5) {
      setQueueExpanded(prev => !prev)
    } else {
      if (queueExpanded) {
        if (finalDeltaY > threshold) {
          setQueueExpanded(false)
        }
      } else {
        if (finalDeltaY < -threshold) {
          setQueueExpanded(true)
        }
      }
    }
    setDragQueueDeltaY(0)
  }

  const handleQueueHeaderMouseDown = (e) => {
    if (e.button !== 0) return
    setDragQueueStartY(e.clientY)
    setIsDraggingQueue(true)
    setDragQueueDeltaY(0)
    
    const handleMouseMoveWindow = (ev) => {
      const deltaY = ev.clientY - e.clientY
      if (queueExpanded) {
        const clampedDeltaY = Math.max(0, deltaY)
        setDragQueueDeltaY(clampedDeltaY)
      } else {
        const clampedDeltaY = Math.min(0, deltaY)
        setDragQueueDeltaY(clampedDeltaY)
      }
    }
    
    const handleMouseUpWindow = (ev) => {
      setIsDraggingQueue(false)
      window.removeEventListener('mousemove', handleMouseMoveWindow)
      window.removeEventListener('mouseup', handleMouseUpWindow)
      
      const finalDeltaY = ev.clientY - e.clientY
      const threshold = 100
      
      if (Math.abs(finalDeltaY) < 5) {
        setQueueExpanded(prev => !prev)
      } else {
        if (queueExpanded) {
          if (finalDeltaY > threshold) {
            setQueueExpanded(false)
          }
        } else {
          if (finalDeltaY < -threshold) {
            setQueueExpanded(true)
          }
        }
      }
      setDragQueueDeltaY(0)
    }
    
    window.addEventListener('mousemove', handleMouseMoveWindow)
    window.addEventListener('mouseup', handleMouseUpWindow)
  }

  const handleQueueHeaderClick = (e) => {
    if (Math.abs(dragQueueDeltaY) < 5) {
      setQueueExpanded(!queueExpanded)
    }
  }

  // Per-line refs map for accurate scroll targeting
  const lineRefsMap = useRef({})

  // Parse synced lyrics — robust LRC timestamp parser
  useEffect(() => {
    if (lyricsData?.syncedLyrics) {
      const lines = lyricsData.syncedLyrics.split(/\r?\n/)
      const parsed = []
      // Handles [mm:ss.xx], [mm:ss.xxx], [mm:ss]
      const timeRegex = /\[(\d+):(\d+)(?:[.:]([\d]+))?\]/

      lines.forEach(line => {
        const match = timeRegex.exec(line)
        if (match) {
          const minutes = parseInt(match[1], 10)
          const seconds = parseInt(match[2], 10)
          const fracStr = match[3] || '0'
          // Normalize fractional seconds to milliseconds regardless of digit count
          const ms = parseFloat('0.' + fracStr) * 1000
          const totalSeconds = minutes * 60 + seconds + ms / 1000
          const text = line.replace(timeRegex, '').trim()
          if (text) parsed.push({ time: totalSeconds, text })
        }
      })

      parsed.sort((a, b) => a.time - b.time)
      lineRefsMap.current = {}
      setParsedLyrics(parsed)
    } else {
      lineRefsMap.current = {}
      setParsedLyrics([])
    }
    // Don't reset currentLineIndex here — let the rAF loop handle it immediately
  }, [lyricsData])

  // ── rAF-based real-time sync (reads audio.currentTime directly, no state lag) ──
  useEffect(() => {
    if (parsedLyrics.length === 0) return

    let rafId
    let lastIdx = -1

    const tick = () => {
      const audio = audioRef?.current
      // For YT Music tracks the HTML5 audio is silent — read time from the IFrame player instead
      const t = isYTSong && ytPlayerRef.current
        ? (ytPlayerRef.current.getCurrentTime() || 0)
        : (audio ? audio.currentTime : 0)

      // Binary search for current line
      let lo = 0, hi = parsedLyrics.length - 1, idx = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (parsedLyrics[mid].time <= t) { idx = mid; lo = mid + 1 }
        else hi = mid - 1
      }

      if (idx !== lastIdx) {
        lastIdx = idx
        setCurrentLineIndex(idx)

        // Scroll active line into center using per-line ref
        const el = lineRefsMap.current[idx]
        const container = lyricsContainerRef.current
        if (el && container) {
          const containerH = container.clientHeight
          const elOffsetTop = el.offsetTop
          const elH = el.clientHeight
          container.scrollTo({
            top: elOffsetTop - containerH / 2 + elH / 2,
            behavior: 'smooth'
          })
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [parsedLyrics, audioRef])

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
    lineRefsMap.current = {}
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

  const formatTime = (time) => {
    if (!time || isNaN(time) || !isFinite(time) || time <= 0) return '0:00'
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const seekTo = pct * duration
    if (isYTSong) {
      const p = ytPlayerRef.current
      if (p) { try { p.seekTo(seekTo, true) } catch (_) {} }
      setCurrentTime(seekTo)
    } else {
      const audio = audioRef?.current
      if (!audio || !duration) return
      audio.currentTime = seekTo
      setCurrentTime(seekTo)
    }
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const isTidal = currentSong?.id?.startsWith('tidal_')
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

  // Playback speed sync
  useEffect(() => {
    if (audioRef?.current) audioRef.current.playbackRate = playbackSpeed
    // Also sync YT player speed
    const p = ytPlayerRef.current
    if (p && isYTSong) {
      try { p.setPlaybackRate(playbackSpeed) } catch (_) {}
    }
  }, [playbackSpeed, audioRef, isYTSong])

  // Sleep timer countdown
  useEffect(() => {
    if (sleepTimerMins === null) { setSleepTimerLeft(null); return }
    let secs = sleepTimerMins * 60
    setSleepTimerLeft(secs)
    sleepTimerRef.current = setInterval(() => {
      secs--
      setSleepTimerLeft(secs)
      if (secs <= 0) {
        clearInterval(sleepTimerRef.current)
        setIsPlaying(false)
        setSleepTimerMins(null)
        setSleepTimerLeft(null)
      }
    }, 1000)
    return () => clearInterval(sleepTimerRef.current)
  }, [sleepTimerMins, setIsPlaying])

  // Share handler
  const handleShare = useCallback(async () => {
    if (!currentSong) return
    const text = `🎵 ${currentSong?.title} by ${currentSong?.artist} — Vibe`
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: currentSong?.title, text, url }) } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setShareToast('🔗 Link copied to clipboard!')
        setTimeout(() => setShareToast(''), 2500)
      } catch (_) {
        setShareToast('Could not share')
        setTimeout(() => setShareToast(''), 2500)
      }
    }
  }, [currentSong])

  // Cast / PiP handler
  const handleCast = useCallback(async () => {
    if (!currentSong) return
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {})
      setCastActive(false)
      return
    }
    if ('documentPictureInPicture' in window) {
      try {
        const pip = await window.documentPictureInPicture.requestWindow({ width: 300, height: 180 })
        setCastActive(true)
        const pipDoc = pip.document
        pipDoc.body.style.cssText = 'margin:0;background:#0a0a0a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;'
        pipDoc.body.innerHTML = `
          <div style="text-align:center;color:#fff;padding:16px;">
            <img src="${currentSong?.image_url}" style="width:100px;height:100px;border-radius:12px;object-fit:cover;margin-bottom:10px;box-shadow:0 8px 24px rgba(0,0,0,0.8);">
            <p style="font-size:13px;font-weight:700;margin:0 0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">${currentSong?.title}</p>
            <p style="font-size:10px;color:#aaa;margin:0;">${currentSong?.artist}</p>
          </div>
        `
        pip.addEventListener('pagehide', () => setCastActive(false))
        setShowCastMenu(false)
        return
      } catch (_) {}
    }
    setShowCastMenu(v => !v)
  }, [currentSong])

  // Add to playlist
  const handleAddToPlaylist = useCallback(async (playlistId) => {
    if (!currentSong) return
    try {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      await supabase.from('playlist_songs').upsert([{
        playlist_id: playlistId,
        song_id: currentSong.id,
        title: currentSong.title,
        artist: currentSong.artist,
        image_url: currentSong.image_url,
        audio_url: currentSong.audio_url
      }], { onConflict: 'playlist_id,song_id' })
      setShareToast('✅ Added to playlist!')
    } catch (err) {
      console.error('Playlist add error:', err)
      setShareToast('Failed to add to playlist')
    }
    setTimeout(() => setShareToast(''), 2500)
    setShowPlaylistPicker(false)
    setShowMoreMenu(false)
  }, [currentSong])

  // ── Monochrome-style Karaoke Lyrics Renderer ──
  const renderLyrics = () => {
    // Loading skeleton with pulsing bars
    if (lyricsLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4 px-8 py-10 select-none">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-white animate-spin mb-2" />
          {[70, 55, 80, 45, 65, 50].map((w, i) => (
            <div
              key={i}
              className="h-3 rounded-full bg-zinc-800 animate-pulse"
              style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
            />
          ))}
          <p className="text-[10px] font-mono tracking-[0.25em] text-zinc-600 uppercase mt-2 animate-pulse">Loading Lyrics...</p>
        </div>
      )
    }

    // Empty state
    if (!lyricsData.lyrics && parsedLyrics.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-5 select-none">
          <div className="w-16 h-16 rounded-full bg-zinc-900/60 border border-zinc-800 flex items-center justify-center text-2xl opacity-60">
            🎵
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-bold text-zinc-400">No lyrics found</p>
            <p className="text-[11px] text-zinc-600 font-mono">for {currentSong?.title}</p>
          </div>
        </div>
      )
    }

    // Provider badge helper
    const ProviderBadge = () => lyricsData.lyricsProvider ? (
      <div className="flex items-center justify-center gap-1.5 pb-3 shrink-0">
        <span className="text-[8px] font-mono font-bold tracking-[0.2em] uppercase text-zinc-600">
          {parsedLyrics.length > 0 ? '⏱ Synced via' : '📄 Plain via'}
        </span>
        <span className="text-[8px] font-mono font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
          {lyricsData.lyricsProvider}
        </span>
      </div>
    ) : null

    // ── SYNCED KARAOKE MODE (monochrome-style) ──
    if (parsedLyrics.length > 0) {
      return (
        <div className="flex flex-col h-full overflow-hidden">
          <div
            ref={lyricsContainerRef}
            className="flex-1 overflow-y-auto scrollbar-none select-none"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 10%, black 22%, black 78%, rgba(0,0,0,0.6) 90%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 10%, black 22%, black 78%, rgba(0,0,0,0.6) 90%, transparent 100%)',
              paddingTop: '40%',
              paddingBottom: '40%',
            }}
          >
            <div className="flex flex-col items-center gap-1 px-6">
              {parsedLyrics.map((line, idx) => {
                const isActive = idx === currentLineIndex
                const absDist = currentLineIndex === -1 ? 99 : Math.abs(idx - currentLineIndex)

                // Monochrome-style distance-based styling
                let scale, opacity, fontWeight, color, textShadow, fontSize
                if (currentLineIndex === -1) {
                  scale = 1; opacity = 0.5; fontWeight = '500'; fontSize = '0.95rem'
                  color = 'rgba(255,255,255,0.5)'; textShadow = 'none'
                } else if (isActive) {
                  scale = 1.06; opacity = 1; fontWeight = '800'; fontSize = '1.12rem'
                  color = '#ffffff'
                  textShadow = '0 0 25px rgba(255,255,255,0.4), 0 1px 8px rgba(0,0,0,0.6)'
                } else if (absDist === 1) {
                  scale = 1; opacity = 0.6; fontWeight = '600'; fontSize = '1rem'
                  color = 'rgba(255,255,255,0.6)'; textShadow = 'none'
                } else if (absDist === 2) {
                  scale = 0.96; opacity = 0.35; fontWeight = '500'; fontSize = '0.95rem'
                  color = 'rgba(255,255,255,0.35)'; textShadow = 'none'
                } else if (absDist === 3) {
                  scale = 0.92; opacity = 0.18; fontWeight = '500'; fontSize = '0.9rem'
                  color = 'rgba(255,255,255,0.18)'; textShadow = 'none'
                } else {
                  scale = 0.88; opacity = 0.07; fontWeight = '400'; fontSize = '0.85rem'
                  color = 'rgba(255,255,255,0.07)'; textShadow = 'none'
                }

                return (
                  <p
                    key={idx}
                    ref={el => { if (el) lineRefsMap.current[idx] = el }}
                    onClick={() => {
                      if (isYTSong && ytPlayerRef.current) {
                        try { ytPlayerRef.current.seekTo(line.time, true) } catch (_) {}
                        setCurrentTime(line.time)
                      } else {
                        const audio = audioRef?.current
                        if (audio) { audio.currentTime = line.time; setCurrentTime(line.time) }
                      }
                    }}
                    style={{
                      transform: `scale(${scale})`,
                      opacity,
                      fontSize,
                      fontWeight,
                      color,
                      textShadow,
                      transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s cubic-bezier(0.4,0,0.2,1), color 0.4s ease, text-shadow 0.4s ease',
                      lineHeight: '1.6',
                      padding: '0.3rem 0',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transformOrigin: 'center center',
                      willChange: 'transform, opacity',
                      userSelect: 'none',
                    }}
                  >
                    {line.text}
                  </p>
                )
              })}
            </div>
          </div>
          <ProviderBadge />
        </div>
      )
    }

    // ── PLAIN LYRICS MODE (auto-scrolling) ──
    const plainLines = lyricsData.lyrics.split(/<br\s*\/?>/i).filter(l => l.trim())
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div
          ref={lyricsContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar select-none"
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, white 18%, white 82%, transparent)',
            maskImage: 'linear-gradient(to bottom, transparent, white 18%, white 82%, transparent)',
          }}
        >
          <div className="flex flex-col items-center gap-3.5 px-6 py-10 text-center">
            {plainLines.map((line, idx) => {
              const totalLines = plainLines.length
              const progress = duration > 0 ? currentTime / duration : 0
              const lineProgress = idx / totalLines
              const distFromActive = Math.abs(lineProgress - progress)
              const isNearActive = distFromActive < 0.08
              return (
                <p
                  key={idx}
                  className="leading-relaxed transition-all duration-500"
                  style={{
                    color: isNearActive ? '#ffffff' : 'rgba(255,255,255,0.35)',
                    fontWeight: isNearActive ? '700' : '500',
                    fontSize: isNearActive ? '1rem' : '0.9rem',
                    transition: 'all 0.4s ease'
                  }}
                >
                  {line}
                </p>
              )
            })}
          </div>
        </div>
        <ProviderBadge />
      </div>
    )
  }

  const renderXRay = () => {
    return (
      <div className="h-full overflow-y-auto px-6 py-4 flex flex-col gap-4 text-left text-zinc-300 text-sm">
        <h3 className="text-xs font-bold font-mono text-[#fa2d48] uppercase tracking-widest mb-1">Track Information</h3>
        <div className="flex flex-col gap-3.5">
          <p><span className="text-zinc-500 font-medium">Song Title:</span> <strong className="text-white ml-1.5">{currentSong.title}</strong></p>
          <p><span className="text-zinc-500 font-medium">Primary Artist:</span> <strong className="text-white ml-1.5">{currentSong.artist}</strong></p>
          {currentSong.album && <p><span className="text-zinc-500 font-medium">Album name:</span> <strong className="text-white ml-1.5">{currentSong.album}</strong></p>}
          <p><span className="text-zinc-500 font-medium">Stream Bitrate:</span> <strong className="text-emerald-400 ml-1.5">Lossless 320kbps</strong></p>
          <p><span className="text-zinc-500 font-medium">Signal Format:</span> <strong className="text-emerald-400 ml-1.5">HD Audio / AAC</strong></p>
        </div>
      </div>
    )
  }

  const renderQueue = () => {
    const getSubText = (s) => {
      const parts = [s.artist || 'Unknown Artist']
      if (s.views) {
        parts.push(s.views.includes('views') ? s.views : `${s.views} views`)
      } else if (s.duration) {
        parts.push(formatTime(s.duration))
      }
      return parts.join(' · ')
    }

    const formatTime = (secs) => {
      if (isNaN(secs) || secs === null || secs === undefined) return '0:00'
      const m = Math.floor(secs / 60)
      const s = Math.floor(secs % 60)
      return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    const upNextTracks = queue.filter(s => !s.isAuto)
    const autoplayTracks = queue.filter(s => s.isAuto)

    return (
      <div className="flex flex-col gap-4 text-left text-zinc-350 text-sm select-none pt-4">
        
        {/* NOW PLAYING SONG ROW (Highlight style matching YTM) */}
        <div className="px-1">
          <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.02] p-2.5 rounded-xl">
            {/* Thumbnail */}
            <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 shadow-md">
              {currentSong.image_url ? (
                <img src={currentSong.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs">🎵</div>
              )}
            </div>
            {/* Metadata */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentSong.title}</p>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5">{getSubText(currentSong)}</p>
            </div>
            {/* Playing Status Badge */}
            <span className="text-[8px] bg-[#fa2d48]/10 text-[#fa2d48] border border-[#fa2d48]/20 px-2 py-0.5 rounded font-mono font-bold tracking-wider">
              NOW PLAYING
            </span>
          </div>
        </div>

        {/* UP NEXT SECTION */}
        <div className="flex flex-col gap-1.5">
          <div className="px-1 flex justify-between items-center text-zinc-400 text-xs font-bold font-mono uppercase tracking-wider mb-1">
            <span>Up Next</span>
            {upNextTracks.length > 0 && <span className="text-[10px] text-zinc-600 font-normal normal-case">{upNextTracks.length} songs</span>}
          </div>
          {upNextTracks.length === 0 ? (
            <p 
              onDragOver={(e) => {
                e.preventDefault()
                if (draggedIndex !== null) {
                  const newQueue = [...queue]
                  const draggedItem = { ...newQueue[draggedIndex], isAuto: false }
                  newQueue.splice(draggedIndex, 1)
                  newQueue.splice(0, 0, draggedItem)
                  setDraggedIndex(0)
                  setQueue(newQueue)
                }
              }}
              className="text-[11px] text-zinc-550 italic px-2 py-2 border border-dashed border-zinc-800/40 rounded-xl text-center"
            >
              No upcoming user tracks
            </p>
          ) : (
            upNextTracks.map((song) => {
              const globalIdx = queue.findIndex(s => s.id === song.id)
              return (
                <div 
                  key={song.id + '-' + globalIdx} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, globalIdx)}
                  onDragOver={(e) => handleDragOver(e, globalIdx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-2 rounded-xl group/qitem transition-colors hover:bg-white/[0.03] cursor-grab active:cursor-grabbing ${
                    draggedIndex === globalIdx ? 'bg-white/[0.08] opacity-55 border border-[#fa2d48]/35' : 'border border-transparent'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 shadow-sm">
                    {song.image_url ? (
                      <img src={song.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs">🎵</div>
                    )}
                  </div>
                  {/* Metadata */}
                  <div className="flex-1 min-w-0" onClick={() => playTrack(song, playlist)}>
                    <p className="text-xs font-medium text-zinc-200 truncate group-hover/qitem:text-white transition-colors">{song.title}</p>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{getSubText(song)}</p>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => removeFromQueue(song.id)}
                      className="opacity-0 group-hover/qitem:opacity-100 text-zinc-500 hover:text-red-400 p-1 transition-opacity text-xs"
                      title="Remove from queue"
                    >
                      ✕
                    </button>
                    {/* Reorder handle = */}
                    <div className="text-zinc-500 hover:text-zinc-300 p-1 cursor-row-resize">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <line x1="4" y1="9" x2="20" y2="9" />
                        <line x1="4" y1="15" x2="20" y2="15" />
                      </svg>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* AUTOPLAY TOGGLE ROW (Acts as the header between lists) */}
        <div className="flex justify-between items-center border-t border-white/5 pt-4 px-1 mt-2">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-200 font-sans">Autoplay Similar Songs</span>
            <span className="text-[9px] text-zinc-550 font-mono mt-0.5">Appends recommended hits when list ends</span>
          </div>
          <button 
            onClick={() => setAutoplayEnabled(!autoplayEnabled)}
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-250 shrink-0 ${autoplayEnabled ? 'bg-[#fa2d48]' : 'bg-zinc-800'}`}
          >
            <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform duration-250 shadow-md ${autoplayEnabled ? 'translate-x-4.5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* AUTOPLAY SECTION */}
        {autoplayEnabled && (
          <div className="flex flex-col gap-1.5 mt-1 border-t border-white/5 pt-3">
            <div className="px-1 flex items-center gap-2 mb-2">
              {isYTSong ? (
                <>
                  <span className="text-base leading-none animate-pulse" style={{ color: '#ff4444' }}>▶</span>
                  <h3 className="text-xs font-bold font-mono uppercase tracking-widest" style={{ color: '#ff4444' }}>
                    YouTube Music Autoplay
                  </h3>
                  <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono font-bold ml-auto">
                    RADIO ACTIVE
                  </span>
                </>
              ) : (
                <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest">Autoplay Queue</h3>
              )}
            </div>

            {autoplayTracks.length === 0 ? (
              <div 
                onDragOver={(e) => {
                  e.preventDefault()
                  if (draggedIndex !== null) {
                    const targetIdx = queue.length - 1
                    const newQueue = [...queue]
                    const draggedItem = { ...newQueue[draggedIndex], isAuto: true }
                    newQueue.splice(draggedIndex, 1)
                    newQueue.push(draggedItem)
                    setDraggedIndex(targetIdx)
                    setQueue(newQueue)
                  }
                }}
                className="flex flex-col items-center justify-center gap-2 py-8 border border-dashed border-zinc-800/40 rounded-xl"
              >
                <span className="text-xl animate-bounce">{isYTSong ? '📺' : '🎵'}</span>
                <p className="text-xs text-zinc-550 italic text-center">
                  Loading autoplay recommendations...
                </p>
              </div>
            ) : (
              autoplayTracks.map((song) => {
                const globalIdx = queue.findIndex(s => s.id === song.id)
                return (
                  <div 
                    key={song.id + '-' + globalIdx} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, globalIdx)}
                    onDragOver={(e) => handleDragOver(e, globalIdx)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-2 rounded-xl group/qitem transition-colors hover:bg-white/[0.03] cursor-grab active:cursor-grabbing ${
                      draggedIndex === globalIdx ? 'bg-white/[0.08] opacity-55 border border-[#fa2d48]/35' : 'border border-transparent'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 shadow-sm">
                      {song.image_url ? (
                        <img src={song.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">🎵</div>
                      )}
                    </div>
                    {/* Metadata */}
                    <div className="flex-1 min-w-0" onClick={() => playTrack(song, playlist)}>
                      <p className="text-xs font-medium text-zinc-200 truncate group-hover/qitem:text-white transition-colors">{song.title}</p>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{getSubText(song)}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => removeFromQueue(song.id)}
                        className="opacity-0 group-hover/qitem:opacity-100 text-zinc-500 hover:text-red-400 p-1 transition-opacity text-xs"
                        title="Remove from queue"
                      >
                        ✕
                      </button>
                      {/* Reorder handle = */}
                      <div className="text-zinc-500 hover:text-zinc-300 p-1 cursor-row-resize">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <line x1="4" y1="9" x2="20" y2="9" />
                          <line x1="4" y1="15" x2="20" y2="15" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    )
  }

  if (!currentSong) return null

  return (
    <>
      {/* Hidden YouTube IFrame Player container — mounts an invisible YT.Player for ytmusic tracks */}
      <div ref={ytContainerRef} aria-hidden="true" style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden', zIndex: -1, pointerEvents: 'none' }} />

      {/* 1. MINI BOTTOM BAR PLAYER — Apple Music Style */}
      <div 
        className="fixed bottom-3 left-3 right-3 md:left-4 md:right-4 h-[72px] md:h-[80px] rounded-2xl px-4 md:px-5 flex items-center justify-between z-50 text-white select-none gpu-accel animate-spring-bounce"
        style={{
          background: 'rgba(18, 18, 20, 0.85)',
          backdropFilter: 'blur(50px) saturate(180%)',
          WebkitBackdropFilter: 'blur(50px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 0.5px rgba(255, 255, 255, 0.04) inset',
        }}
      >
        
        {/* LEFT: Song info (clickable to expand) */}
        <div onClick={() => setIsExpanded(true)} className="flex items-center gap-3 w-1/3 min-w-[150px] md:min-w-[240px] cursor-pointer group">
          <div className="relative shrink-0">
            {currentSong.image_url ? (
              <img src={currentSong.image_url} alt="" className="w-11 h-11 md:w-13 md:h-13 object-cover rounded-xl shadow-lg" style={{ transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ) : (
              <div className="w-11 h-11 md:w-13 md:h-13 rounded-xl bg-white/[0.05] flex items-center justify-center font-bold text-xs md:text-sm text-zinc-500">🎵</div>
            )}
            {isTidal && (
              <span className="absolute -top-1 -right-1 bg-[#fa2d48] text-white text-[7px] font-bold px-1 rounded-md select-none shadow-sm">
                HIFI
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0 max-w-[100px] sm:max-w-[150px]">
            <span className="text-[12px] md:text-[13px] font-semibold text-white group-hover:text-[#fa2d48] truncate" style={{ transition: 'color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>{currentSong.title}</span>
            <span className="text-[10px] md:text-[11px] text-zinc-500 truncate mt-0.5">{currentSong.artist}</span>
          </div>
          <div className="flex items-center gap-0.5 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => toggleFavorite(currentSong, currentSong.is_favorite)} className="apple-press text-xs p-1" title="Like Track">
              {currentSong.is_favorite ? '❤️' : '🤍'}
            </button>
          </div>
        </div>

        {/* CENTER: Controls + Progress */}
        <div className="flex flex-col items-center gap-2.5 flex-1 max-w-[640px] px-2">
          
          {/* Playback controls */}
          <div className="flex items-center gap-5 md:gap-6">
            <button onClick={() => setIsShuffle(!isShuffle)} className={`apple-press p-1 ${isShuffle ? 'text-[#fa2d48]' : 'text-zinc-500 hover:text-white'}`} style={{ transition: 'color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} title="Shuffle">
              <svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M10.596 1.161a1 1 0 0 0-1.414 0L7.83 2.513l1.414 1.415 1.352-1.353 1.353 1.353 1.414-1.415-2.167-2.152zM1.05 1.05a1 1 0 0 0 0 1.414L3.636 5.05l1.415-1.414L2.464 1.05a1 1 0 0 0-1.414 0zm11.364 11.364L9.828 9.828l-1.414 1.414 2.586 2.586a1 1 0 0 0 1.414 0l2.167-2.152-1.414-1.415-1.353 1.353zm-8.778.136l8.727-8.727-1.414-1.414-8.727 8.727 1.414 1.414z"></path></svg>
            </button>
            
            <button
              onClick={() => {
                const ytT = isYTSong && ytPlayerRef.current ? (ytPlayerRef.current.getCurrentTime() || 0) : undefined
                handlePrev(ytT)
              }}
              className="text-zinc-400 hover:text-white apple-press p-1" title="Previous"
            >
              <svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v11.475a.7.7 0 0 1-1.05.606L4 9.15v5.15a.7.7 0 0 1-1.4 0V1.7a.7.7 0 0 1 .7-.7z"></path></svg>
            </button>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)} 
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white text-black flex items-center justify-center shrink-0 apple-press"
              style={{ boxShadow: '0 4px 20px rgba(255, 255, 255, 0.15)' }}
            >
              {isPlaying ? (
                <svg role="img" height="14" width="14" fill="currentColor" viewBox="0 0 16 16"><path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm7.4 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"></path></svg>
              ) : (
                <svg role="img" height="14" width="14" fill="currentColor" viewBox="0 0 16 16" className="ml-0.5"><path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"></path></svg>
              )}
            </button>
            
            <button onClick={handleNext} className="text-zinc-400 hover:text-white apple-press p-1" title="Next">
              <svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.106A.7.7 0 0 0 1 1.712v11.475a.7.7 0 0 0 1.05.606L12 9.15v5.15a.7.7 0 0 0 1.4 0V1.7a.7.7 0 0 0-.7-.7z"></path></svg>
            </button>
            
            <button onClick={() => setIsRepeat(!isRepeat)} className={`apple-press p-1 ${isRepeat ? 'text-[#fa2d48]' : 'text-zinc-500 hover:text-white'}`} style={{ transition: 'color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }} title="Repeat">
              <svg role="img" height="15" width="15" fill="currentColor" viewBox="0 0 16 16"><path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.03a.75.75 0 0 1 0-1.06l2.829-2.829a.75.75 0 1 1 1.06 1.06L9.81 12h2.44a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"></path></svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full flex items-center gap-3 text-[10px] md:text-[11px] text-zinc-500 font-mono select-none">
            <span className="min-w-[30px] text-right">{formatTime(currentTime)}</span>
            <div 
              ref={progressRef} onClick={handleScrub} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
              className="flex-1 h-1 bg-white/[0.08] rounded-full cursor-pointer relative py-2 flex items-center group"
            >
              <div className="w-full h-1 bg-white/[0.08] rounded-full relative overflow-hidden">
                <div className={`h-full rounded-full progress-smooth ${isHovered ? 'bg-[#fa2d48]' : 'bg-white/60'}`} style={{ width: `${progressPct}%` }} />
              </div>
              <div className={`absolute w-3 h-3 bg-white rounded-full shadow-lg gpu-accel`} style={{ left: `calc(${progressPct}% - 6px)`, opacity: isHovered ? 1 : 0, transform: isHovered ? 'scale(1)' : 'scale(0.5)', transition: 'opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
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
              className="w-full accent-white group-hover:accent-[#fa2d48] h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none transition-all" 
            />
          </div>
        </div>
      </div>

      {/* 2. EXPANDED APPLE MUSIC FULL-SCREEN PLAYER */}
      {isExpanded && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-between p-5 select-none text-white overflow-hidden animate-expand-player" style={{ background: '#000' }}>
          {/* Dynamic Blurred Adaptive Backdrop — Apple Music style */}
          <div 
            className="absolute inset-0 bg-cover bg-center -z-10 scale-125 gpu-accel"
            style={{ 
              backgroundImage: `url(${currentSong.image_url})`,
              filter: 'blur(80px) brightness(0.18) saturate(1.4)',
              transition: 'background-image 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/90 -z-10" />

          {/* HEADER ROW */}
          <div className="flex justify-between items-center w-full max-w-md mx-auto pb-3">
            <button 
              onClick={() => { setIsExpanded(false); setActiveOverlayTab(''); setQueueExpanded(false); }}
              className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center apple-press"
              title="Close Player"
            >
              <svg role="img" height="16" width="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 11.5a.75.75 0 0 1-.53-.22L3.22 7.03a.75.75 0 1 1 1.06-1.06L8 9.44l3.72-3.47a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-.53.22z"></path></svg>
            </button>
            <span className="text-[9px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">Now Playing</span>
            <button 
              className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center apple-press"
              title="Track Details"
              onClick={() => setActiveOverlayTab(activeOverlayTab === 'xray' ? '' : 'xray')}
            >
              <svg role="img" height="14" width="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8.75 4a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 1.5 0v5zM8 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"></path></svg>
            </button>
          </div>

          {/* MAIN PLAYER AREA (Album Cover / Lyrics / X-Ray) */}
          <div className="flex-1 flex flex-col items-center justify-center my-4 w-full max-w-md mx-auto relative min-h-[300px]">
            {activeOverlayTab === 'lyrics' ? (
              <div className="w-full h-full min-h-[300px] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 relative" style={{ background: 'rgba(8,8,10,0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {/* Blurred album art background for lyrics panel */}
                {currentSong?.image_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center -z-10"
                    style={{
                      backgroundImage: `url(${currentSong.image_url})`,
                      filter: 'blur(60px) brightness(0.12) saturate(1.4)',
                      transform: 'scale(1.15)'
                    }}
                  />
                )}
                <div className="relative z-10 flex flex-col h-full">
                  <div className="px-5 pt-4 pb-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#fa2d48] animate-pulse" />
                      <span className="text-[10px] font-bold font-mono tracking-[0.2em] text-[#fa2d48] uppercase">Lyrics</span>
                    </div>
                    <button onClick={() => setActiveOverlayTab('')} className="text-zinc-600 hover:text-white text-[11px] font-mono transition-colors">✕</button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {renderLyrics()}
                  </div>
                </div>
              </div>
            ) : activeOverlayTab === 'xray' ? (
              <div className="w-full h-full min-h-[300px] bg-zinc-950/60 border border-zinc-800/40 rounded-3xl backdrop-blur-md p-4 shadow-2xl transition-all duration-300">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5 mb-2 shrink-0">
                  <span className="text-[10px] font-bold font-mono tracking-wider text-[#ff4466] uppercase">🔍 X-Ray Details</span>
                  <button onClick={() => setActiveOverlayTab('')} className="text-zinc-500 hover:text-white text-xs px-1">✕ Close</button>
                </div>
                {renderXRay()}
              </div>
            ) : (
              <div
                className="w-full overflow-hidden relative h-72 sm:h-80 select-none cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'pan-y' }}
              >
                {/* Strip: 300% wide, starts at translateX(-33.333%) so center panel shows */}
                <div
                  ref={stripRef}
                  className="flex h-full"
                  style={{
                    width: '300%',
                    transform: 'translateX(-33.3333%)',
                    willChange: 'transform',
                  }}
                >
                  {/* Panel 0: Previous song */}
                  <div className="w-1/3 h-full flex items-center justify-center flex-shrink-0"
                    onClick={() => triggerPrevWithAnimation()}
                  >
                    <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.6)] border border-zinc-800/30 opacity-60 scale-90" style={{ transition: 'none' }}>
                      {prevSong?.image_url
                        ? <img src={prevSong.image_url} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                        : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-3xl text-zinc-700">🎵</div>
                      }
                    </div>
                  </div>

                  {/* Panel 1: Current song */}
                  <div className="w-1/3 h-full flex items-center justify-center flex-shrink-0">
                    <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-zinc-800/40">
                      {displaySong?.image_url
                        ? <img src={displaySong.image_url} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                        : <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center font-bold text-4xl text-zinc-600">🎵</div>
                      }
                    </div>
                  </div>

                  {/* Panel 2: Next song */}
                  <div className="w-1/3 h-full flex items-center justify-center flex-shrink-0"
                    onClick={() => triggerNextWithAnimation()}
                  >
                    <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.6)] border border-zinc-800/30 opacity-60 scale-90" style={{ transition: 'none' }}>
                      {nextSong?.image_url
                        ? <img src={nextSong.image_url} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                        : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-3xl text-zinc-700">🎵</div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PLAYER CONTROLS PANEL */}
          <div className="w-full max-w-md mx-auto flex flex-col pb-6">
            
            {/* TABS: Lyrics / X-Ray pills */}
            <div className="flex gap-2.5 justify-center mb-5">
              <button
                onClick={() => setActiveOverlayTab(activeOverlayTab === 'lyrics' ? '' : 'lyrics')}
                className={`py-1.5 px-5 rounded-full text-[11px] font-semibold apple-press border ${
                  activeOverlayTab === 'lyrics'
                    ? 'bg-white text-black border-transparent shadow-lg'
                    : 'bg-white/[0.06] border-white/[0.06] text-zinc-400 hover:bg-white/[0.1] hover:text-white'
                }`}
                style={{ transition: 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
              >
                {parsedLyrics.length > 0 ? '⏱ Synced Lyrics' : 'Lyrics'}
              </button>
              <button
                onClick={() => setActiveOverlayTab(activeOverlayTab === 'xray' ? '' : 'xray')}
                className={`py-1.5 px-5 rounded-full text-[11px] font-semibold apple-press border ${
                  activeOverlayTab === 'xray'
                    ? 'bg-white text-black border-transparent shadow-lg'
                    : 'bg-white/[0.06] border-white/[0.06] text-zinc-400 hover:bg-white/[0.1] hover:text-white'
                }`}
                style={{ transition: 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
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
                    <div className="h-full rounded-full bg-white transition-colors group-hover:bg-[#fa2d48]" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="absolute w-3 h-3 bg-white rounded-full shadow-md" style={{ left: `calc(${progressPct}% - 6px)` }} />
                </div>
                <span className="min-w-[35px] text-left">{formatTime(duration)}</span>
              </div>
              
              {/* Quality Label Badge */}
              <div className="flex justify-center">
                <span className="text-[8px] bg-white/[0.05] border border-white/[0.06] text-zinc-500 font-semibold tracking-[0.15em] px-2.5 py-0.5 rounded-full">
                  {currentSong.audio_url ? 'LOSSLESS' : 'AAC'}
                </span>
              </div>
            </div>

            {/* AUDIO PRIMARY CONTROLS — Apple Music Style */}
            <div className="flex items-center justify-center gap-10 mb-6">
              <button onClick={triggerPrevWithAnimation} className="text-white/80 hover:text-white p-2 apple-press" title="Previous">
                <svg role="img" height="22" width="22" fill="currentColor" viewBox="0 0 16 16"><path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v11.475a.7.7 0 0 1-1.05.606L4 9.15v5.15a.7.7 0 0 1-1.4 0V1.7a.7.7 0 0 1 .7-.7z"></path></svg>
              </button>
              
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="w-[68px] h-[68px] rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] text-white flex items-center justify-center apple-press"
                style={{ boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4)', transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
              >
                {isPlaying ? (
                  <svg role="img" height="26" width="26" fill="currentColor" viewBox="0 0 16 16"><path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm7.4 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"></path></svg>
                ) : (
                  <svg role="img" height="26" width="26" fill="currentColor" viewBox="0 0 16 16" className="ml-1"><path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"></path></svg>
                )}
              </button>

              <button onClick={triggerNextWithAnimation} className="text-white/80 hover:text-white p-2 apple-press" title="Next">
                <svg role="img" height="22" width="22" fill="currentColor" viewBox="0 0 16 16"><path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.106A.7.7 0 0 0 1 1.712v11.475a.7.7 0 0 0 1.05.606L12 9.15v5.15a.7.7 0 0 0 1.4 0V1.7a.7.7 0 0 0-.7-.7z"></path></svg>
              </button>
            </div>

            {/* BOTTOM UTILITY ACTION ROW */}
            <div className="flex justify-between items-center px-4 text-zinc-400 relative">

              {/* SHARE */}
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-zinc-900/40 hover:bg-zinc-800 hover:text-white flex items-center justify-center transition active:scale-90"
                title="Share"
              >
                <svg role="img" height="18" width="18" fill="currentColor" viewBox="0 0 16 16"><path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.707 3.354a2.5 2.5 0 0 1 0 1.036l6.707 3.354A2.5 2.5 0 1 1 11 13.5a2.5 2.5 0 0 1-.603-1.628l-6.707-3.354a2.5 2.5 0 0 1 0-1.036l6.707-3.354A2.5 2.5 0 0 1 11 2.5zM3.5 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>
              </button>

              {/* CAST */}
              <button
                onClick={handleCast}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90 ${
                  castActive ? 'bg-[#fa2d48] text-black shadow-lg' : 'bg-zinc-900/40 hover:bg-zinc-800 hover:text-white text-zinc-400'
                }`}
                title={castActive ? 'Stop Casting' : 'Cast / Screen Share'}
              >
                <svg role="img" height="18" width="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1 18v3h3a3 3 0 0 0-3-3zm0-4v2a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7zm0-4v2a9 9 0 0 1 9 9h2A11 11 0 0 0 1 10zm20-6H3C1.9 4 1 4.9 1 6v3h2V6h18v12h-7v2h7c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
                </svg>
              </button>

              {/* QUEUE */}
              <button
                onClick={() => setQueueExpanded(!queueExpanded)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  queueExpanded ? 'bg-[#fa2d48] text-black shadow-lg hover:bg-[#ff5577]' : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
                title="Up Next Queue"
              >
                <svg role="img" height="18" width="18" fill="currentColor" viewBox="0 0 16 16"><path d="M12 13c0 1.105-1.12 2-2.5 2S7 14.105 7 13s1.12-2 2.5-2 2.5.895 2.5 2z"/><path d="M12 3v10h-1V3h1z"/><path d="M11 2.82a1 1 0 0 1 .804-.98l3-.6A1 1 0 0 1 16 2.22V5l-5 1V2.82zM1 2.5A.5.5 0 0 1 1.5 2h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/></svg>
              </button>

              {/* THREE DOTS */}
              <button
                onClick={() => { setShowMoreMenu(v => !v); setShowCastMenu(false); setShowSpeedPicker(false); setShowPlaylistPicker(false) }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90 ${
                  showMoreMenu ? 'bg-white text-black' : 'bg-zinc-900/40 hover:bg-zinc-800 hover:text-white text-zinc-400'
                }`}
                title="More Options"
              >
                <svg role="img" height="18" width="18" fill="currentColor" viewBox="0 0 16 16"><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
              </button>

              {/* Sleep timer badge */}
              {sleepTimerLeft !== null && (
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-amber-400 px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                  ⏲ Sleep in {Math.floor(sleepTimerLeft / 60)}:{String(sleepTimerLeft % 60).padStart(2, '0')}
                </div>
              )}
            </div>

            {/* ── CAST MENU ── */}
            {showCastMenu && (
              <div className="absolute bottom-20 left-3 right-3 bg-zinc-900/97 border border-zinc-700/50 rounded-2xl shadow-2xl backdrop-blur-xl p-4 z-50">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold font-mono tracking-widest text-zinc-400 uppercase">Cast / Output</span>
                  <button onClick={() => setShowCastMenu(false)} className="text-zinc-500 hover:text-white text-xs">✕</button>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
                        const video = document.createElement('video')
                        video.srcObject = stream
                        video.muted = true
                        document.body.appendChild(video)
                        video.style.cssText = 'position:fixed;top:-9999px;width:1px;height:1px;'
                        await video.play()
                        if (video.requestPictureInPicture) {
                          await video.requestPictureInPicture()
                          setCastActive(true)
                          video.addEventListener('leavepictureinpicture', () => {
                            stream.getTracks().forEach(t => t.stop())
                            video.remove()
                            setCastActive(false)
                          })
                        }
                        setShowCastMenu(false)
                      } catch (err) { console.warn('Screen cast err:', err) }
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 transition text-left w-full"
                  >
                    <span className="text-xl">🖥️</span>
                    <div>
                      <p className="text-[12px] font-bold text-white">Cast This Screen</p>
                      <p className="text-[10px] text-zinc-500">Share tab to display or TV</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShareToast('🔊 Use OS volume mixer or Bluetooth to route audio')
                      setTimeout(() => setShareToast(''), 3500)
                      setShowCastMenu(false)
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 transition text-left w-full"
                  >
                    <span className="text-xl">🔊</span>
                    <div>
                      <p className="text-[12px] font-bold text-white">System Audio Output</p>
                      <p className="text-[10px] text-zinc-500">Bluetooth speakers / headphones</p>
                    </div>
                  </button>
                  {castActive && (
                    <button
                      onClick={() => { document.exitPictureInPicture?.().catch(()=>{}); setCastActive(false); setShowCastMenu(false) }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-red-900/30 border border-red-800/40 hover:bg-red-900/50 transition text-left w-full"
                    >
                      <span className="text-xl">⏹️</span>
                      <div>
                        <p className="text-[12px] font-bold text-red-400">Stop Casting</p>
                        <p className="text-[10px] text-zinc-500">End current cast session</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── MORE OPTIONS SHEET (main) ── */}
            {showMoreMenu && !showPlaylistPicker && !showSpeedPicker && (
              <div className="absolute bottom-16 left-0 right-0 bg-[#0f0f12]/97 border-t border-zinc-800/50 rounded-t-3xl shadow-2xl backdrop-blur-2xl z-50 max-h-[70vh] overflow-y-auto">
                <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-zinc-700" /></div>
                {/* Song header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/40">
                  {currentSong?.image_url && <img src={currentSong.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-white truncate">{currentSong?.title}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{currentSong?.artist}</p>
                  </div>
                  <button onClick={() => setShowMoreMenu(false)} className="text-zinc-500 hover:text-white text-sm ml-auto px-2">✕</button>
                </div>

                {/* Quick actions */}
                <div className="flex justify-around px-4 py-4 border-b border-zinc-800/30">
                  {[
                    { icon: currentSong?.is_favorite ? '❤️' : '🤍', label: currentSong?.is_favorite ? 'Liked' : 'Like', action: () => { toggleFavorite?.(currentSong, currentSong?.is_favorite); setShowMoreMenu(false) } },
                    { icon: '⏭️', label: 'Play Next', action: () => { playNext?.(currentSong); setShowMoreMenu(false); setShareToast('Playing next!'); setTimeout(() => setShareToast(''), 2000) } },
                    { icon: '➕', label: 'Add Queue', action: () => { addToQueue?.(currentSong); setShowMoreMenu(false); setShareToast('Added to queue!'); setTimeout(() => setShareToast(''), 2000) } },
                    { icon: '📤', label: 'Share', action: () => { handleShare(); setShowMoreMenu(false) } },
                  ].map(({ icon, label, action }) => (
                    <button key={label} onClick={action} className="flex flex-col items-center gap-1.5 group">
                      <span className="w-12 h-12 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-xl group-hover:bg-zinc-700 transition">{icon}</span>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide">{label}</span>
                    </button>
                  ))}
                </div>

                {/* PLAYLIST section */}
                <div className="flex flex-col">
                  <p className="text-[9px] font-mono font-bold text-zinc-600 uppercase tracking-widest px-5 pt-4 pb-1">Playlist</p>
                  <button onClick={() => setShowPlaylistPicker(true)} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition text-left w-full">
                    <span className="text-base w-6 text-center">📝</span>
                    <span className="text-[13px] text-zinc-200 font-medium">Add to Playlist</span>
                    <span className="ml-auto text-zinc-600 text-sm">›</span>
                  </button>

                  {/* PLAYBACK section */}
                  <p className="text-[9px] font-mono font-bold text-zinc-600 uppercase tracking-widest px-5 pt-4 pb-1">Playback</p>
                  <button onClick={() => setShowSpeedPicker(true)} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition text-left w-full">
                    <span className="text-base w-6 text-center">⚡</span>
                    <span className="text-[13px] text-zinc-200 font-medium">Playback Speed</span>
                    <span className="ml-auto text-[11px] font-mono text-[#fa2d48]">{playbackSpeed}x</span>
                  </button>
                  <button
                    onClick={() => {
                      if (sleepTimerMins !== null) {
                        clearInterval(sleepTimerRef.current)
                        setSleepTimerMins(null); setSleepTimerLeft(null)
                        setShareToast('⏹ Sleep timer cancelled')
                      } else {
                        setSleepTimerMins(30)
                        setShareToast('⏲ Sleep timer set: 30 min')
                      }
                      setTimeout(() => setShareToast(''), 2500)
                      setShowMoreMenu(false)
                    }}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition text-left w-full"
                  >
                    <span className="text-base w-6 text-center">⏲</span>
                    <span className="text-[13px] text-zinc-200 font-medium">{sleepTimerMins !== null ? 'Cancel Sleep Timer' : 'Sleep Timer (30 min)'}</span>
                    {sleepTimerLeft !== null && <span className="ml-auto text-[11px] font-mono text-amber-400">{Math.floor(sleepTimerLeft/60)}:{String(sleepTimerLeft%60).padStart(2,'0')}</span>}
                  </button>
                  <button onClick={() => { setIsShuffle(!isShuffle); setShowMoreMenu(false) }} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition text-left w-full">
                    <span className="text-base w-6 text-center">🔀</span>
                    <span className="text-[13px] text-zinc-200 font-medium">Shuffle</span>
                    <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded font-bold ${isShuffle ? 'bg-[#fa2d48]/20 text-[#fa2d48]' : 'bg-zinc-800 text-zinc-500'}`}>{isShuffle ? 'ON' : 'OFF'}</span>
                  </button>
                  <button onClick={() => { setIsRepeat(!isRepeat); setShowMoreMenu(false) }} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition text-left w-full">
                    <span className="text-base w-6 text-center">🔁</span>
                    <span className="text-[13px] text-zinc-200 font-medium">Repeat</span>
                    <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded font-bold ${isRepeat ? 'bg-[#fa2d48]/20 text-[#fa2d48]' : 'bg-zinc-800 text-zinc-500'}`}>{isRepeat ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* TRACK section */}
                  <p className="text-[9px] font-mono font-bold text-zinc-600 uppercase tracking-widest px-5 pt-4 pb-1">Track</p>
                  <button onClick={() => { setActiveOverlayTab('xray'); setShowMoreMenu(false) }} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition text-left w-full">
                    <span className="text-base w-6 text-center">🔍</span>
                    <span className="text-[13px] text-zinc-200 font-medium">Track Details (X-Ray)</span>
                  </button>
                  {currentSong?.audio_url && (
                    <a href={currentSong.audio_url} download={`${currentSong.title} - ${currentSong.artist}.m4a`} onClick={() => setShowMoreMenu(false)} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition text-left w-full">
                      <span className="text-base w-6 text-center">⬇️</span>
                      <span className="text-[13px] text-zinc-200 font-medium">Download Track</span>
                    </a>
                  )}

                  {/* ARTIST section */}
                  <p className="text-[9px] font-mono font-bold text-zinc-600 uppercase tracking-widest px-5 pt-4 pb-1">Artist</p>
                  <button onClick={() => { window.open(`https://open.spotify.com/search/${encodeURIComponent(currentSong?.artist?.split(',')[0]?.trim())}`, '_blank'); setShowMoreMenu(false) }} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition text-left w-full">
                    <span className="text-base w-6 text-center">👤</span>
                    <span className="text-[13px] text-zinc-200 font-medium">Go to Artist on Spotify</span>
                    <span className="ml-auto text-zinc-600 text-sm">›</span>
                  </button>
                  <button onClick={() => { window.open(`https://www.google.com/search?q=${encodeURIComponent(currentSong?.title + ' ' + currentSong?.artist + ' lyrics')}`, '_blank'); setShowMoreMenu(false) }} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition text-left w-full">
                    <span className="text-base w-6 text-center">🌐</span>
                    <span className="text-[13px] text-zinc-200 font-medium">Search Lyrics on Web</span>
                    <span className="ml-auto text-zinc-600 text-sm">›</span>
                  </button>
                  <div className="h-8" />
                </div>
              </div>
            )}

            {/* ── PLAYLIST PICKER ── */}
            {showMoreMenu && showPlaylistPicker && (
              <div className="absolute bottom-16 left-0 right-0 bg-[#0f0f12]/97 border-t border-zinc-800/50 rounded-t-3xl shadow-2xl backdrop-blur-2xl z-50 max-h-[70vh] overflow-y-auto">
                <div className="flex justify-between items-center px-5 py-4 border-b border-zinc-800/40">
                  <button onClick={() => setShowPlaylistPicker(false)} className="text-zinc-400 hover:text-white text-sm">‹ Back</button>
                  <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Add to Playlist</span>
                  <button onClick={() => { setShowPlaylistPicker(false); setShowMoreMenu(false) }} className="text-zinc-500 hover:text-white text-xs">✕</button>
                </div>
                <div className="flex flex-col py-2">
                  {!(customPlaylists?.length) ? (
                    <div className="px-5 py-10 text-center text-zinc-500 text-sm">No playlists yet.<br/>Create one from the sidebar first.</div>
                  ) : (customPlaylists || []).map(pl => (
                    <button key={pl.id} onClick={() => handleAddToPlaylist(pl.id)} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition text-left w-full">
                      <span className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-base shrink-0">📝</span>
                      <span className="text-[13px] text-zinc-200 font-medium truncate">{pl.name}</span>
                    </button>
                  ))}
                  <div className="h-8" />
                </div>
              </div>
            )}

            {/* ── SPEED PICKER ── */}
            {showMoreMenu && showSpeedPicker && (
              <div className="absolute bottom-16 left-0 right-0 bg-[#0f0f12]/97 border-t border-zinc-800/50 rounded-t-3xl shadow-2xl backdrop-blur-2xl z-50">
                <div className="flex justify-between items-center px-5 py-4 border-b border-zinc-800/40">
                  <button onClick={() => setShowSpeedPicker(false)} className="text-zinc-400 hover:text-white text-sm">‹ Back</button>
                  <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Playback Speed</span>
                  <button onClick={() => { setShowSpeedPicker(false); setShowMoreMenu(false) }} className="text-zinc-500 hover:text-white text-xs">✕</button>
                </div>
                <div className="flex flex-col py-2">
                  {SPEEDS.map(s => (
                    <button key={s} onClick={() => { setPlaybackSpeed(s); setShowSpeedPicker(false); setShowMoreMenu(false); setShareToast(`Speed: ${s}x`); setTimeout(() => setShareToast(''), 1800) }}
                      className={`flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition ${playbackSpeed === s ? 'text-[#fa2d48]' : 'text-zinc-200'}`}>
                      <span className="text-[14px] font-medium">{s === 1 ? 'Normal (1x)' : `${s}x`}</span>
                      {playbackSpeed === s && <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>
                  ))}
                  <div className="h-8" />
                </div>
              </div>
            )}

          </div>

          {/* YOUTUBE MUSIC STYLE SLIDE-UP QUEUE BOTTOM SHEET */}
          <div
            ref={queueSheetRef}
            className="absolute bottom-0 left-0 right-0 z-50 bg-[#121214]/95 border-t border-white/5 rounded-t-3xl flex flex-col overflow-hidden shadow-[0_-8px_32px_rgba(0,0,0,0.6)]"
            style={{
              height: '85%',
              transform: isDraggingQueue 
                ? (queueExpanded 
                    ? `translateY(${Math.max(0, dragQueueDeltaY)}px)`
                    : `translateY(calc(100% - 72px + ${Math.min(0, dragQueueDeltaY)}px))`)
                : (queueExpanded ? 'translateY(0)' : 'translateY(calc(100% - 72px))'),
              transition: isDraggingQueue ? 'none' : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            {/* Header: draggable peek bar */}
            <div 
              onMouseDown={handleQueueHeaderMouseDown}
              onTouchStart={handleQueueHeaderTouchStart}
              onTouchMove={handleQueueHeaderTouchMove}
              onTouchEnd={handleQueueHeaderTouchEnd}
              onClick={handleQueueHeaderClick}
              className="h-[72px] p-3.5 pb-3 flex flex-col justify-between shrink-0 cursor-grab active:cursor-grabbing select-none border-b border-white/5 bg-zinc-900/40"
            >
              {/* Drag indicator line */}
              <div className="w-12 h-1 bg-zinc-700/80 rounded-full mx-auto mb-2" />
              
              <div className="flex justify-between items-end px-2">
                <div>
                  <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-widest leading-none">Playing from</p>
                  <h2 className="text-base md:text-lg font-bold text-white mt-1 leading-none font-sans">Your Queue</h2>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); alert("Save queue feature coming soon!") }}
                  className="bg-white/[0.08] hover:bg-white/[0.15] text-white font-semibold text-xs px-3.5 py-1.5 rounded-full border border-white/[0.08] transition flex items-center gap-1.5"
                >
                  <svg role="img" height="12" width="12" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12 13c0 1.105-1.12 2-2.5 2S7 14.105 7 13s1.12-2 2.5-2 2.5.895 2.5 2z"/>
                    <path d="M12 3v10h-1V3h1z"/>
                    <path d="M11 2.82a1 1 0 0 1 .804-.98l3-.6A1 1 0 0 1 16 2.22V5l-5 1V2.82z"/>
                  </svg>
                  Save
                </button>
              </div>
            </div>

            {/* List container */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar bg-zinc-950/40">
              {renderQueue()}
            </div>
          </div>

        </div>
      )}

      {/* TOAST — Apple Music style */}
      {shareToast && (
        <div 
          className="fixed bottom-28 left-1/2 z-[200] text-white text-[12px] font-medium px-5 py-2.5 rounded-2xl whitespace-nowrap animate-toast-in"
          style={{
            background: 'rgba(30, 30, 32, 0.92)',
            backdropFilter: 'blur(30px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 15px 50px rgba(0, 0, 0, 0.6)',
          }}
        >
          {shareToast}
        </div>
      )}
    </>
  )
}
