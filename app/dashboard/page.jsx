'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAudio } from '@/context/AudioContext'
import Link from 'next/link'

export default function MainDashboardPage() {
  const [user, setUser] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [playlistMenuOpenId, setPlaylistMenuOpenId] = useState(null)
  
  const { 
    currentSong, isPlaying, playTrack, toggleFavorite, toggleBookmark, setCurrentSong, setIsPlaying,
    activeMenu, customPlaylists, selectedPlaylistId 
  } = useAudio()
  
  const supabase = createClient()

  const fetchSongs = async () => {
    try {
      setLoading(true)
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      // DEFAULT BASE PATHWAY: Query your local database tracks table
      let query = supabase.from('songs').select('*')

      // DYNAMIC PLAYLIST PATHWAY: Check if a user is filtering by a specific custom playlist
      if (activeMenu === 'custom_playlist' && selectedPlaylistId) {
        const { data: junctionData, error: junctionError } = await supabase
          .from('playlist_songs')
          .select('song_id')
          .eq('playlist_id', selectedPlaylistId)

        if (junctionError) throw junctionError
        
        const songIds = junctionData?.map(j => j.song_id) || []
        
        if (songIds.length > 0) {
          query = query.in('id', songIds)
        } else {
          setSongs([])
          setLoading(false)
          return
        }
      }

      const { data: databaseSongs, error: songsError } = await query.order('created_at', { ascending: false })
      if (songsError) throw songsError
      
      setSongs(databaseSongs || [])
    } catch (error) {
      console.error("Local context retrieval error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh the view container when navigation filters shift
  useEffect(() => {
    fetchSongs()
    setPlaylistMenuOpenId(null)
    setActiveMenuId(null)
  }, [activeMenu, selectedPlaylistId])

  const isAdmin = user?.email?.toLowerCase().trim() === 'ankitkumarbharti100@gmail.com'

  const handleAddToPlaylist = async (e, songId, playlistId) => {
    e.stopPropagation()
    try {
      const { error } = await supabase
        .from('playlist_songs')
        .insert([{ playlist_id: playlistId, song_id: songId }])
      
      if (!error) {
        alert("✨ Song added to playlist successfully!")
        setPlaylistMenuOpenId(null)
      } else {
        // Handle duplicate key error catch elegantly if constraint catches it
        alert("💡 This song is already a member of that playlist.")
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleLocalToggleFavorite = async (e, song) => {
    e.stopPropagation()
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, is_favorite: !s.is_favorite } : s))
    await toggleFavorite(song.id, song.is_favorite)
  }

  const handleLocalToggleBookmark = async (e, song) => {
    e.stopPropagation()
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, is_bookmarked: !s.is_bookmarked } : s))
    await toggleBookmark(song.id, song.is_bookmarked)
  }

  // Native database record deletion handler
  const handleDeleteSong = async (e, song) => {
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to completely delete "${song.title}"?`)) return
    try {
      if (currentSong?.id === song.id) {
        setIsPlaying(false)
        setCurrentSong(null)
      }
      const { error } = await supabase.from('songs').delete().eq('id', song.id)
      if (error) throw error
      
      setSongs(prev => prev.filter(s => s.id !== song.id))
      setActiveMenuId(null)
    } catch (err) {
      console.error(err)
    }
  }

  // Process instant dynamic string matching parameters over database cache arrays
  const displayedSongs = songs.filter(song => {
    if (activeMenu === 'liked_songs' && !song.is_favorite) return false
    
    if (searchQuery.trim()) {
      const target = searchQuery.toLowerCase()
      return song.title?.toLowerCase().includes(target) || song.artist?.toLowerCase().includes(target)
    }
    return true
  })

  const getHeaderTitle = () => {
    if (activeMenu === 'liked_songs') return 'Liked Songs Library'
    if (activeMenu === 'history') return 'Recently Played History'
    if (activeMenu === 'custom_playlist') {
      const activeObj = customPlaylists.find(p => p.id === selectedPlaylistId)
      return activeObj ? `Playlist / ${activeObj.name}` : 'Custom Playlist'
    }
    return 'Trending Now'
  }

  const backgroundGradients = ['from-indigo-950', 'from-zinc-900', 'from-neutral-900', 'from-stone-900', 'from-slate-900']

  if (loading) {
    return (
      <div className="p-6 text-zinc-600 font-bold text-xs font-mono h-full flex items-center justify-center animate-pulse">
        ⚡ FETCHING DATA FROM LOCAL SUITE STORAGE...
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 animate-in fade-in duration-300 select-none">
      
      {/* ================= TOP HEADER GREETING BANNER ================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900/60 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans">
            Sweet Dreams, Ankit.
          </h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1.5 font-mono">{getHeaderTitle()}</p>
        </div>
        
        {isAdmin && (
          <Link href="/admin" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs py-2.5 px-5 rounded-full transition-all duration-200 shadow-md transform hover:scale-[1.02] active:scale-98 shrink-0">
            ⚙️ Open Upload Center
          </Link>
        )}
      </div>

      {/* ================= REPOSITORY SEARCH BAR INPUT ================= */}
      <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-2.5 flex items-center gap-3 focus-within:border-zinc-800 transition-all shadow-inner">
        <span className="text-zinc-600 text-sm">🔍</span>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items inside this library view..."
          className="bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none w-full font-sans antialiased"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-zinc-600 hover:text-white text-xs px-0.5">✕</button>
        )}
      </div>

      {/* ================= MAIN MEDIA TRACK CARD GRID ================= */}
      <section className="flex flex-col gap-4">
        {displayedSongs.length === 0 ? (
          <div className="bg-zinc-950/20 border border-zinc-900/40 rounded-xl p-16 text-center text-xs text-zinc-500 font-medium font-sans">
            This collection view context is currently empty.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5">
            {displayedSongs.map((song, index) => {
              const isCurrentTrack = currentSong?.id === song.id
              
              return (
                <div key={song.id} className="flex flex-col gap-2.5 group cursor-pointer relative animate-fade-in">
                  
                  {/* ALBUM ART CONTAINER LAYOUT RECTANGLE */}
                  <div 
                    onClick={() => playTrack(song, displayedSongs)}
                    className="w-full aspect-square rounded-xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900 group-hover:border-zinc-800/80 transition-all duration-300"
                  >
                    {song.image_url ? (
                      <img src={song.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-b ${backgroundGradients[index % backgroundGradients.length]} to-black flex items-center justify-center text-2xl font-serif text-zinc-400 font-bold tracking-tighter`}>
                        {song.title ? song.title.substring(0, 2).toUpperCase() : 'TR'}
                      </div>
                    )}
                    
                    {/* Centered Minimalist Glass Play/Pause HUD Element Overlay */}
                    <div className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center transition-all duration-200 ${isCurrentTrack ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition-all hover:scale-105 active:scale-90 duration-150">
                        <span className="text-sm font-sans pl-0.5">{isCurrentTrack && isPlaying ? '⏸' : '▶'}</span>
                      </div>
                    </div>

                    {/* INTERACTIVE TRACK ACTION UTILITY OVERLAY DOCKS */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity duration-200 bg-black/70 p-1 rounded-lg backdrop-blur-md z-10 border border-zinc-900/60">
                      <button 
                        onClick={(e) => handleLocalToggleFavorite(e, song)} 
                        className={`text-xs p-0.5 transform hover:scale-125 active:scale-95 transition-all ${song.is_favorite ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        title="Like Track"
                      >
                        {song.is_favorite ? '❤️' : '🤍'}
                      </button>
                      <button 
                        onClick={(e) => handleLocalToggleBookmark(e, song)} 
                        className={`text-xs p-0.5 transform hover:scale-125 active:scale-95 transition-all ${song.is_bookmarked ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        title="Bookmark Track"
                      >
                        {song.is_bookmarked ? '🔖' : '🏳️'}
                      </button>
                      
                      {/* Add Track to Playlist Interaction Handle */}
                      {customPlaylists && customPlaylists.length > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPlaylistMenuOpenId(playlistMenuOpenId === song.id ? null : song.id); setActiveMenuId(null); }} 
                          className={`text-xs p-0.5 font-bold transition-colors ${playlistMenuOpenId === song.id ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'}`}
                          title="Add to Custom Playlist"
                        >
                          ➕
                        </button>
                      )}
                    </div>

                    {/* ADMIN MASTER ACTIONS CONTROLLER OVERLAY TRIGGER */}
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === song.id ? null : song.id); setPlaylistMenuOpenId(null); }}
                        className="absolute top-2 right-2 bg-black/80 text-zinc-400 hover:text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 max-md:opacity-100 transition-opacity z-10 border border-zinc-900/60 shadow-md"
                        title="Admin Options"
                      >
                        ⋮
                      </button>
                    )}

                    {/* ADMIN MENU OVERLAY CONTEXT SHEET */}
                    {activeMenuId === song.id && (
                      <div className="absolute top-9 right-2 bg-zinc-950 border border-zinc-900 rounded-lg shadow-2xl py-1 w-20 z-30 text-center text-[11px] font-bold animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                        <button 
                          onClick={(e) => handleDeleteSong(e, song)} 
                          className="w-full text-red-500 hover:bg-zinc-900 py-1.5 transition-colors block"
                        >
                          ✕ Delete
                        </button>
                      </div>
                    )}

                    {/* DYNAMIC PLAYLIST SELECTOR POPOVER DROPDOWN MENU */}
                    {playlistMenuOpenId === song.id && (
                      <div className="absolute top-9 left-2 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl py-1 w-40 z-30 text-left text-[11px] animate-in fade-in zoom-in-95 duration-100 max-h-28 overflow-y-auto custom-scrollbar">
                        <p className="text-zinc-500 font-bold font-mono px-2 py-1 border-b border-zinc-900 uppercase text-[9px] tracking-wider select-none">Select Playlist</p>
                        {customPlaylists.map((p) => (
                          <button 
                            key={p.id}
                            onClick={(e) => handleAddToPlaylist(e, song.id, p.id)}
                            className="w-full text-zinc-300 hover:text-emerald-400 hover:bg-zinc-900/60 px-2 py-1.5 transition-colors block truncate font-medium"
                          >
                            📁 {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* TEXT LABELS UNDERFOOT BLOCKS LAYOUT */}
                  <div className="flex flex-col text-center sm:text-left px-1">
                    <h3 className={`font-bold text-[13px] tracking-tight truncate ${isCurrentTrack ? 'text-emerald-400' : 'text-zinc-100 group-hover:text-emerald-400 transition-colors'}`}>
                      {song.title}
                    </h3>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">
                      {song.artist}
                    </p>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}