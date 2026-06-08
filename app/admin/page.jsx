'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAudio } from '@/context/AudioContext'
import Link from 'next/link'

export default function MainDashboardPage() {
  const [user, setUser] = useState(null)
  const [localSongs, setLocalSongs] = useState([])
  const [onlineSongs, setOnlineSongs] = useState([]) 
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState('all') 
  const [searchStatus, setSearchStatus] = useState('')
  
  const { currentSong, isPlaying, playTrack, toggleFavorite, toggleBookmark } = useAudio()
  const supabase = createClient()

  useEffect(() => {
    const fetchLocalSongs = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)

        const { data: databaseSongs, error: songsError } = await supabase
          .from('songs')
          .select('*')
          .order('created_at', { ascending: false })

        if (!songsError) setLocalSongs(databaseSongs || [])
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchLocalSongs()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setOnlineSongs([])
      setSearchStatus('')
      return
    }

    setSearchStatus('⚡ Streaming network catalogs active...')

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: searchQuery })
        })

        const result = await response.json()
        
        if (result && result.tracks) {
          setOnlineSongs(result.tracks)
          setSearchStatus(result.tracks.length === 0 ? '❌ No streaming results found for this song.' : '')
        } else {
          setOnlineSongs([])
          setSearchStatus('❌ Stream network returned empty matrix results.')
        }
      } catch (err) {
        console.error(err)
        setSearchStatus('❌ Failed to establish network data stream.')
      }
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const isAdmin = user?.email?.toLowerCase().trim() === 'ankitkumarbharti100@gmail.com'
  const filteredLocalSongs = localSongs.filter(song => {
    if (filterMode === 'favorites') return song.is_favorite
    if (filterMode === 'bookmarks') return song.is_bookmarked
    return true
  })

  const displayedSongs = searchQuery.trim() ? onlineSongs : filteredLocalSongs
  const backgroundGradients = ['from-indigo-900', 'from-rose-950', 'from-amber-900', 'from-teal-900', 'from-emerald-950']

  if (loading) {
    return (
      <div className="p-6 text-zinc-500 font-bold text-xs tracking-widest font-mono h-full flex items-center justify-center animate-pulse">
        ⚡ SYNCHRONIZING OPEN REPOSITORY CHANNELS...
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 md:gap-8 animate-in fade-in duration-300">
      
      {/* SEARCH FIELD BAR MODULE */}
      <div className="relative w-full max-w-md bg-zinc-900/30 border border-zinc-800/60 rounded-full px-4 py-2 flex items-center gap-3 backdrop-blur-md focus-within:border-zinc-700 transition-all">
        <span className="text-zinc-500 text-sm">🔍</span>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search and stream millions of live tracks..."
          className="bg-transparent text-sm text-white font-sans placeholder-zinc-500 focus:outline-none w-full"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white text-xs px-1">✕</button>
        )}
      </div>

      {/* FILTER BUTTON PILLS */}
      {!searchQuery && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-900/60">
          {['all', 'favorites', 'bookmarks'].map((mode) => (
            <button 
              key={mode}
              onClick={() => setFilterMode(mode)} 
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-tight shrink-0 transition-all duration-300 ${
                filterMode === mode 
                  ? mode === 'all' ? 'bg-white text-black' : mode === 'favorites' ? 'bg-[#1db954] text-white' : 'bg-indigo-600 text-white'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {mode === 'all' ? 'All Feeds' : mode === 'favorites' ? '💚 Liked Songs' : '🔖 Bookmarked'}
            </button>
          ))}
        </div>
      )}

      {/* GRAPHIC OVERLAY VIEW FEED GRID */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">
          {searchQuery ? `Online Results for "${searchQuery}"` : `${filterMode} Library Tracks`}
        </h2>

        {searchStatus && (
          <p className="text-xs text-zinc-400 font-mono tracking-tight">{searchStatus}</p>
        )}
        
        {displayedSongs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
            {displayedSongs.map((song, index) => {
              const isCurrentTrack = currentSong?.id === song.id
              
              return (
                <div 
                  key={song.id} 
                  onClick={() => playTrack(song, displayedSongs)}
                  className="bg-zinc-900/20 p-3 md:p-4 rounded-xl flex flex-col gap-3 hover:bg-zinc-800/40 border border-transparent hover:border-zinc-800/40 cursor-pointer relative group transition-all duration-300 transform hover:-translate-y-1 shadow-md hover:shadow-xl"
                >
                  <div className="w-full aspect-square rounded-lg relative overflow-hidden shadow-md bg-zinc-950">
                    {song.image_url ? (
                      <img src={song.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-b ${backgroundGradients[index % backgroundGradients.length]} to-zinc-950 flex items-center justify-center text-3xl font-serif text-zinc-300`}>
                        {song.title ? song.title.substring(0, 2).toUpperCase() : 'TR'}
                      </div>
                    )}
                    
                    <div className={`absolute bottom-3 right-3 w-10 h-10 bg-[#1db954] rounded-full flex items-center justify-center text-black shadow-2xl transition-all transform duration-300 ${
                      isCurrentTrack ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
                    } max-md:opacity-100`}>
                      <span className="text-xs">{isCurrentTrack && isPlaying ? '⏸' : '▶'}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col min-h-[40px] px-0.5">
                    <h3 className={`font-bold text-xs md:text-sm truncate transition-colors duration-200 ${isCurrentTrack ? 'text-[#1db954]' : 'text-white group-hover:text-[#1db954]'}`}>{song.title}</h3>
                    <p className="text-[11px] md:text-xs text-zinc-400 mt-0.5 truncate">{song.artist}</p>
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