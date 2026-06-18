'use client'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useAudio } from '@/context/AudioContext'

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

  // Expandable player states
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeOverlayTab, setActiveOverlayTab] = useState('') // '' | 'lyrics' | 'xray' | 'queue'
  const [lyricsData, setLyricsData] = useState({ lyrics: '', syncedLyrics: '', copyright: '', lyricsProvider: '' })
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [parsedLyrics, setParsedLyrics] = useState([])
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const lyricsContainerRef = useRef(null)
  const activeLineRef = useRef(null)
  const [recommendedTracks, setRecommendedTracks] = useState([])
  const [recsLoading, setRecsLoading] = useState(false)

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
      const t = audio ? audio.currentTime : 0

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
    const audio = audioRef?.current
    if (!audio || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = pct * duration
    setCurrentTime(audio.currentTime)
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const isTidal = currentSong?.id?.startsWith('tidal_')
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

  // Playback speed sync
  useEffect(() => {
    if (audioRef?.current) audioRef.current.playbackRate = playbackSpeed
  }, [playbackSpeed, audioRef])

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
                      const audio = audioRef?.current
                      if (audio) { audio.currentTime = line.time; setCurrentTime(line.time) }
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

  if (!currentSong) return null

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
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1db954] animate-pulse" />
                      <span className="text-[10px] font-bold font-mono tracking-[0.2em] text-[#1db954] uppercase">Lyrics</span>
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
            
            {/* TABS: Lyrics / X-Ray pills */}
            <div className="flex gap-3 justify-center mb-6">
              <button
                onClick={() => setActiveOverlayTab(activeOverlayTab === 'lyrics' ? '' : 'lyrics')}
                className={`py-1.5 px-5 rounded-full text-xs font-bold transition-all duration-200 border ${
                  activeOverlayTab === 'lyrics'
                    ? 'bg-white text-black border-transparent shadow-lg scale-[1.03]'
                    : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {parsedLyrics.length > 0 ? '⏱ Synced Lyrics' : 'Lyrics'}
              </button>
              <button
                onClick={() => setActiveOverlayTab(activeOverlayTab === 'xray' ? '' : 'xray')}
                className={`py-1.5 px-5 rounded-full text-xs font-bold transition-all duration-200 border ${
                  activeOverlayTab === 'xray'
                    ? 'bg-white text-black border-transparent shadow-lg scale-[1.03]'
                    : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
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
                  castActive ? 'bg-[#1db954] text-black shadow-lg' : 'bg-zinc-900/40 hover:bg-zinc-800 hover:text-white text-zinc-400'
                }`}
                title={castActive ? 'Stop Casting' : 'Cast / Screen Share'}
              >
                <svg role="img" height="18" width="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1 18v3h3a3 3 0 0 0-3-3zm0-4v2a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7zm0-4v2a9 9 0 0 1 9 9h2A11 11 0 0 0 1 10zm20-6H3C1.9 4 1 4.9 1 6v3h2V6h18v12h-7v2h7c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
                </svg>
              </button>

              {/* QUEUE */}
              <button
                onClick={() => setActiveOverlayTab(activeOverlayTab === 'queue' ? '' : 'queue')}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  activeOverlayTab === 'queue' ? 'bg-[#1db954] text-black shadow-lg hover:bg-[#1ed760]' : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800 hover:text-white'
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
                    <span className="ml-auto text-[11px] font-mono text-[#1db954]">{playbackSpeed}x</span>
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
                    <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded font-bold ${isShuffle ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-zinc-800 text-zinc-500'}`}>{isShuffle ? 'ON' : 'OFF'}</span>
                  </button>
                  <button onClick={() => { setIsRepeat(!isRepeat); setShowMoreMenu(false) }} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition text-left w-full">
                    <span className="text-base w-6 text-center">🔁</span>
                    <span className="text-[13px] text-zinc-200 font-medium">Repeat</span>
                    <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded font-bold ${isRepeat ? 'bg-[#1db954]/20 text-[#1db954]' : 'bg-zinc-800 text-zinc-500'}`}>{isRepeat ? 'ON' : 'OFF'}</span>
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
                      className={`flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition ${playbackSpeed === s ? 'text-[#1db954]' : 'text-zinc-200'}`}>
                      <span className="text-[14px] font-medium">{s === 1 ? 'Normal (1x)' : `${s}x`}</span>
                      {playbackSpeed === s && <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>
                  ))}
                  <div className="h-8" />
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* TOAST */}
      {shareToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] bg-zinc-900 border border-zinc-700/60 text-white text-[12px] font-semibold px-5 py-2.5 rounded-full shadow-2xl whitespace-nowrap">
          {shareToast}
        </div>
      )}
    </>
  )
}