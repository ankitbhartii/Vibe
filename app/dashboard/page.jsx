'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAudio } from '@/context/AudioContext'
import Link from 'next/link'
const TRENDING_PODCASTS = [
  {
    id: '62',
    type: 'show',
    title: 'Talking Music',
    subtitle: 'Kirthi Shetty',
    image_url: 'https://c.sop.saavncdn.com/Talking-Music-20230310083848-500x500.jpg'
  },
  {
    id: '175427',
    type: 'show',
    title: 'Such a Drag',
    subtitle: 'Drag Queen Podcast',
    image_url: 'https://c.sop.saavncdn.com/Such-a-Drag-20220203145837-500x500.jpg'
  },
  {
    id: '211168',
    type: 'show',
    title: 'Suzhal - The Vortex',
    subtitle: 'Official Series Podcast',
    image_url: 'https://c.sop.saavncdn.com/Suzhal-The-Vortex-20220617174341-500x500.jpg'
  },
  {
    id: '155493',
    type: 'show',
    title: 'Moneywise',
    subtitle: 'Wealth & Personal Finance',
    image_url: 'https://c.sop.saavncdn.com/Moneywise-20251122143955-500x500.jpg'
  },
  {
    id: '34',
    type: 'show',
    title: 'Kahaani Express with Neelesh Misra',
    subtitle: 'Neelesh Misra katha stories',
    image_url: 'https://c.sop.saavncdn.com/Kahaani-Express-with-Neelesh-Misra-20201026205850-500x500.jpg'
  },
  {
    id: '64649',
    type: 'show',
    title: 'Ek Geet Sau Afsane',
    subtitle: 'Hindi Classics & Stories',
    image_url: 'https://c.sop.saavncdn.com/Ek-Geet-Sau-Afsane-20210324034923-500x500.jpg'
  },
  {
    id: '205847',
    type: 'show',
    title: 'The American Serial Killer',
    subtitle: 'True Crime Documentary',
    image_url: 'https://c.sop.saavncdn.com/The-American-Serial-Killer-Guidebook-20231129153836-500x500.jpg'
  },
  {
    id: '28',
    type: 'show',
    title: 'Bhai Ke Raapchik Reviews',
    subtitle: 'Filmy Raapchik Reviews',
    image_url: 'https://c.sop.saavncdn.com/Bhai-Ke-Raapchik-Reviews-20231221103823-500x500.jpg'
  },
  {
    id: '199481',
    type: 'show',
    title: 'Kannagi Kaviyam Tamil',
    subtitle: 'Tamil Story Podcast',
    image_url: 'https://c.sop.saavncdn.com/Kannagi-Kaviyam-Tamil-Podcast-20221117211708-500x500.jpg'
  },
  {
    id: '736',
    type: 'show',
    title: 'NL Charcha',
    subtitle: 'Newslaundry Hindi Discussion',
    image_url: 'https://c.sop.saavncdn.com/NL-Charcha-20201223095925-500x500.jpg'
  },
  {
    id: '52397',
    type: 'show',
    title: 'Holistic Lifestyle With Neha Ranglani',
    subtitle: 'Health & Nutrition Guide',
    image_url: 'https://c.sop.saavncdn.com/Holistic-Lifestyle-With-Neha-Ranglani-20201223043842-500x500.jpg'
  },
  {
    id: '33128',
    type: 'show',
    title: 'Indian Murder Mystery',
    subtitle: 'True Crime Horror Stories',
    image_url: 'https://c.sop.saavncdn.com/Indian-Murder-Mystery-20220704123807-500x500.jpg'
  },
  {
    id: '104789',
    type: 'show',
    title: 'In Focus by The Hindu',
    subtitle: 'Current Affairs & Editorial Analysis',
    image_url: 'https://c.sop.saavncdn.com/In-Focus-by-The-Hindu-20251004072534-500x500.jpg'
  },
  {
    id: '71920',
    type: 'show',
    title: 'LGBT Kyun?',
    subtitle: 'Pride & Relationships Talk',
    image_url: 'https://c.sop.saavncdn.com/LGBT-Kyun-20210602112725-500x500.jpg'
  },
  {
    id: '9046',
    type: 'show',
    title: 'Raising Parents',
    subtitle: 'Parenting Guide Podcast',
    image_url: 'https://c.sop.saavncdn.com/Raising-Parents-20210722042637-500x500.jpg'
  },
  {
    id: '32224',
    type: 'show',
    title: 'Din Bhar',
    subtitle: 'Aaj Tak Khabar Din Bhar',
    image_url: 'https://c.sop.saavncdn.com/Din-Bhar-20250303144355-500x500.jpg'
  },
  {
    id: '174786',
    type: 'show',
    title: 'Kya Woh Sach Tha?',
    subtitle: 'Horror Stories & Kahaniyan',
    image_url: 'https://c.sop.saavncdn.com/Kya-Woh-Sach-Tha-20250219071910-500x500.jpg'
  },
  {
    id: '206431',
    type: 'show',
    title: 'When My Body Was Trying to Kill Me',
    subtitle: 'Survival Stories Podcast',
    image_url: 'https://c.sop.saavncdn.com/The-Things-I-Thought-About-When-My-Body-Was-Trying-to-Kill-Me-20231004173621-500x500.jpg'
  },
  {
    id: '201586',
    type: 'show',
    title: 'Talking Womb',
    subtitle: 'Pregnancy & Health Tips',
    image_url: 'https://c.sop.saavncdn.com/Talking-Womb-20231120195416-500x500.jpg'
  },
  {
    id: '25',
    type: 'show',
    title: '#NoFilterNeha',
    subtitle: 'Neha Dhupia Talk Show',
    image_url: 'https://c.sop.saavncdn.com/NoFilterNeha-20240411113723-500x500.jpg'
  },
  {
    id: '197695',
    type: 'show',
    title: 'Essential Career Tips',
    subtitle: 'Career Guidance & Advice',
    image_url: 'https://c.sop.saavncdn.com/Essential-Career-Tips-20220429055454-500x500.jpg'
  }
]

export default function MainDashboardPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [playlistMenuOpenId, setPlaylistMenuOpenId] = useState(null)
  
  // JioSaavn Home recommendation states
  const [saavnHome, setSaavnHome] = useState({ new_trending: [], new_albums: [], top_playlists: [], charts: [] })
  const [saavnHomeLoading, setSaavnHomeLoading] = useState(true)
  
  // Search results states
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeSearchTab, setActiveSearchTab] = useState('songs') // 'songs' | 'albums' | 'playlists'
  
  // Album / Playlist Detail View states
  const [selectedSaavnItem, setSelectedSaavnItem] = useState(null) // { id, type, title, image_url, artist, subtitle }
  const [saavnItemTracks, setSaavnItemTracks] = useState([])
  const [saavnItemLoading, setSaavnItemLoading] = useState(false)
  const [artistAlbums, setArtistAlbums] = useState([])

  // Podcast states
  const [podcastsList, setPodcastsList] = useState([])
  const [podcastsLoading, setPodcastsLoading] = useState(false)
  const [podcastSearchQuery, setPodcastSearchQuery] = useState('')
  const [podcastSearchResults, setPodcastSearchResults] = useState(null)
  const [podcastSearchLoading, setPodcastSearchLoading] = useState(false)

  // Top Artists states
  const [topArtistsList, setTopArtistsList] = useState([])
  const [topArtistsLoading, setTopArtistsLoading] = useState(false)

  // Library / custom playlist songs states
  const [librarySongs, setLibrarySongs] = useState([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  
  const { 
    currentSong, isPlaying, playTrack, toggleFavorite,
    activeMenu, customPlaylists, selectedPlaylistId,
    preloadTrack,
    history, savedAlbums, savedArtists, savedPodcasts,
    toggleSaveAlbum, toggleFollowArtist, toggleSubscribePodcast,
    addToQueue
  } = useAudio()
  
  const supabase = createClient()

  // 1. Authenticate user
  useEffect(() => {
    async function checkUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        window.location.href = '/login'
        return
      }
      setUser(authUser)
      setLoading(false)
    }
    checkUser()
  }, [])

  // 2. Fetch JioSaavn Home content
  const fetchSaavnHome = async () => {
    setSaavnHomeLoading(true)
    try {
      const response = await fetch('/api/saavn/home')
      if (response.ok) {
        const result = await response.json()
        setSaavnHome(result)
      }
    } catch (error) {
      console.error("JioSaavn home fetch error:", error)
    } finally {
      setSaavnHomeLoading(false)
    }
  }

  useEffect(() => {
    fetchSaavnHome()
  }, [])

  // 3. Fetch Library Content (Liked Songs or Custom Playlists)
  const fetchLibraryContent = async () => {
    if (activeMenu === 'new_releases') return

    setLibraryLoading(true)
    try {
      if (activeMenu === 'liked_songs') {
        const { data, error } = await supabase
          .from('songs')
          .select('*')
          .eq('is_favorite', true)
        if (!error && data) {
          setLibrarySongs(data)
        } else {
          setLibrarySongs([])
        }
      } else if (activeMenu === 'custom_playlist' && selectedPlaylistId) {
        const { data, error } = await supabase
          .from('playlist_songs')
          .select('songs (*)')
          .eq('playlist_id', selectedPlaylistId)
        if (!error && data) {
          setLibrarySongs(data.map(item => item.songs).filter(Boolean))
        } else {
          setLibrarySongs([])
        }
      }
    } catch (err) {
      console.error("Error loading library details:", err)
    } finally {
      setLibraryLoading(false)
    }
  }

  useEffect(() => {
    fetchLibraryContent()
    // Reset details view when user navigates side menus
    setSelectedSaavnItem(null)
  }, [activeMenu, selectedPlaylistId])

  // 3b. Fetch Podcasts Content
  useEffect(() => {
    if (activeMenu === 'podcasts') {
      const fetchPodcasts = async () => {
        setPodcastsLoading(true)
        try {
          const keywords = ['podcast', 'audiobook', 'kahani', 'story', 'katha']
          const fetchPromises = keywords.map(kw => 
            fetch('/api/saavn/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: kw })
            }).then(r => r.ok ? r.json() : { playlists: [], albums: [] })
          )
          
          const results = await Promise.all(fetchPromises)
          
          // Merge all playlists and albums
          let merged = []
          results.forEach(res => {
            if (res.playlists) {
              res.playlists.forEach(pl => {
                merged.push({ ...pl, type: 'playlist' })
              })
            }
            if (res.albums) {
              res.albums.forEach(al => {
                merged.push({ ...al, type: 'album' })
              })
            }
          })

          // Deduplicate by ID
          const seen = new Set()
          const unique = []
          merged.forEach(item => {
            if (item && item.id && !seen.has(item.id)) {
              seen.add(item.id)
              unique.push(item)
            }
          })

          setPodcastsList(unique)
        } catch (error) {
          console.error("Podcast fetch error:", error)
        } finally {
          setPodcastsLoading(false)
        }
      }
      fetchPodcasts()
    }
  }, [activeMenu])

  // 3c. Fetch Top Artists Content
  useEffect(() => {
    if (activeMenu === 'top_artists') {
      const fetchTopArtists = async () => {
        setTopArtistsLoading(true)
        try {
          const response = await fetch('/api/saavn/top-artists')
          if (response.ok) {
            const data = await response.json()
            setTopArtistsList(data || [])
          }
        } catch (error) {
          console.error("Top artists fetch error:", error)
        } finally {
          setTopArtistsLoading(false)
        }
      }
      fetchTopArtists()
    }
  }, [activeMenu])

  // 4. Fetch Album / Playlist / Artist / Radio Detail View Songs
  const fetchItemDetails = async (item) => {
    if (!item) return
    setSelectedSaavnItem(item)
    setSaavnItemLoading(true)
    setSaavnItemTracks([])
    setArtistAlbums([])
    try {
      if (item.type === 'artist') {
        const response = await fetch(`/api/saavn/artist?id=${item.id}`)
        if (response.ok) {
          const data = await response.json()
          setSaavnItemTracks(data.topSongs || [])
          setArtistAlbums(data.topAlbums || [])
        }
      } else if (item.type === 'radio') {
        const response = await fetch('/api/saavn/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: item.title })
        })
        if (response.ok) {
          const data = await response.json()
          setSaavnItemTracks(data.songs || [])
        }
      } else if (item.type === 'show') {
        const response = await fetch(`/api/saavn/show?id=${item.id}`)
        if (response.ok) {
          const data = await response.json()
          setSaavnItemTracks(data.songs || [])
        }
      } else {
        const endpoint = item.type === 'album' ? '/api/saavn/album' : '/api/saavn/playlist'
        const response = await fetch(`${endpoint}?id=${item.id}`)
        if (response.ok) {
          const data = await response.json()
          setSaavnItemTracks(data.songs || [])
        }
      }
    } catch (error) {
      console.error(`Error fetching JioSaavn ${item.type} details:`, error)
    } finally {
      setSaavnItemLoading(false)
    }
  }

  // 5. Debounced Search Controller
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      setSearchStatus('')
      setSearchLoading(false)
      return
    }

    setSearchStatus('⚡ Searching JioSaavn online catalogs...')
    setSearchLoading(true)

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch('/api/saavn/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery })
        })
        
        if (response.ok) {
          const result = await response.json()
          setSearchResults(result)
          
          const totalMatches = (result.songs?.length || 0) + (result.albums?.length || 0) + (result.playlists?.length || 0)
          if (totalMatches === 0) {
            setSearchStatus('❌ No records matched this query.')
          } else {
            setSearchStatus('')
            // Default to song results if they exist, otherwise albums
            if ((result.songs?.length || 0) === 0 && (result.albums?.length || 0) > 0) {
              setActiveSearchTab('albums')
            } else {
              setActiveSearchTab('songs')
            }
          }
        } else {
          setSearchStatus('❌ Search failed.')
        }
      } catch (err) {
        console.error("Search API error:", err)
        setSearchStatus('❌ Failed to establish cross-origin stream channel.')
      } finally {
        setSearchLoading(false)
      }
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  // 5b. Debounced Podcast Search Controller
  useEffect(() => {
    if (!podcastSearchQuery.trim()) {
      setPodcastSearchResults(null)
      setPodcastSearchLoading(false)
      return
    }

    setPodcastSearchLoading(true)

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch('/api/saavn/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: podcastSearchQuery })
        })
        
        if (response.ok) {
          const result = await response.json()
          // Combine albums and playlists as podcast/audiobook items
          const combined = [
            ...(result.playlists || []).map(p => ({ ...p, type: 'playlist' })),
            ...(result.albums || []).map(a => ({ ...a, type: 'album' }))
          ]
          setPodcastSearchResults(combined)
        } else {
          setPodcastSearchResults([])
        }
      } catch (err) {
        console.error("Podcast search API error:", err)
        setPodcastSearchResults([])
      } finally {
        setPodcastSearchLoading(false)
      }
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [podcastSearchQuery])

  // 6. Handle Adding Song to Playlists
  const handleAddToPlaylist = async (e, song, playlistId) => {
    e.stopPropagation()
    try {
      const { data: existingSong } = await supabase.from('songs').select('id').eq('id', song.id).maybeSingle()
      let targetSongId = existingSong?.id

      if (!targetSongId) {
        const { data: newSong, error: insError } = await supabase
          .from('songs')
          .insert([{ 
            id: song.id,
            title: song.title, 
            artist: song.artist, 
            image_url: song.image_url, 
            audio_url: song.audio_url 
          }])
          .select()
        
        if (insError) throw insError
        targetSongId = newSong[0].id
      }

      const { error: juncError } = await supabase
        .from('playlist_songs')
        .insert([{ playlist_id: playlistId, song_id: targetSongId }])
      
      if (!juncError) {
        alert("✨ Saved seamlessly to your custom library playlist!")
        setPlaylistMenuOpenId(null)
      } else {
        alert("💡 This song is already a member of that playlist.")
      }
    } catch (err) {
      console.error(err)
    }
  }

  const isAdmin = user?.email?.toLowerCase().trim() === 'ankitkumarbharti100@gmail.com'

  const formatDuration = (secs) => {
    if (!secs) return '0:00'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const getHeaderTitle = () => {
    if (searchQuery.trim()) return `Search results for "${searchQuery}"`
    if (activeMenu === 'liked_songs') return 'Liked Songs Library'
    if (activeMenu === 'custom_playlist') {
      const activeObj = customPlaylists.find(p => p.id === selectedPlaylistId)
      return activeObj ? `Playlist / ${activeObj.name}` : 'Custom Playlist'
    }
    if (activeMenu === 'top_charts') return 'Top Charts'
    if (activeMenu === 'top_playlists') return 'Featured Playlists'
    if (activeMenu === 'top_artists') return 'Popular Artists'
    if (activeMenu === 'podcasts') return 'Podcasts Directory'
    if (activeMenu === 'radio') return 'Featured Radio Mixes'
    if (activeMenu === 'library_history') return 'Recently Played Tracks'
    if (activeMenu === 'library_albums') return 'My Saved Albums'
    if (activeMenu === 'library_podcasts') return 'My Saved Podcasts'
    if (activeMenu === 'library_artists') return 'Followed Artists'
    return 'Browse Music'
  }

  if (loading) {
    return (
      <div className="p-6 text-zinc-600 font-bold text-xs font-mono h-full flex items-center justify-center animate-pulse bg-black min-h-screen">
        ⚡ CONNECTING VIBE MUSIC NETWORKS...
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 animate-in fade-in duration-300 bg-black min-h-screen text-[#f4f4f5]">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white glow-text">Vibe Music Player</h1>
          <p className="text-xs text-[#1db954] font-bold uppercase tracking-widest mt-1.5 font-mono">{getHeaderTitle()}</p>
        </div>
        {isAdmin && (
          <Link href="/admin" className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs py-2.5 px-5 rounded-full transition-all shadow-md shrink-0 glow-border">
            ⚙️ Open Upload Center
          </Link>
        )}
      </div>

      {/* COMPACT SEARCH INPUT */}
      <div className="relative w-full max-w-sm bg-zinc-950/80 border border-zinc-900 rounded-2xl px-4 py-2.5 flex items-center gap-3 focus-within:border-[#1db954]/50 focus-within:shadow-[0_0_15px_rgba(29,185,84,0.1)] transition-all">
        <span className="text-zinc-600 text-sm">🔍</span>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search songs, albums, playlists..."
          className="bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none w-full font-sans antialiased"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-zinc-600 hover:text-white text-xs px-0.5">✕</button>
        )}
      </div>

      {/* SEARCH/LOADING STATUS FEEDBACK */}
      {searchStatus && (
        <p className="text-xs text-zinc-500 font-mono tracking-tight -mb-2">{searchStatus}</p>
      )}

      {/* MAIN LAYOUT GATEWAY */}
      <section className="flex flex-col gap-8">
        
        {/* ================== DETAILED ALBUM/PLAYLIST VIEW ================== */}
        {selectedSaavnItem ? (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <button 
              onClick={() => setSelectedSaavnItem(null)} 
              className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-bold transition-colors mb-2 w-max"
            >
              ← Back to Browse
            </button>

            <div className="flex flex-col md:flex-row gap-6 items-center md:items-end bg-gradient-to-b from-zinc-900/60 to-transparent p-6 rounded-3xl border border-zinc-900/40">
              <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 shrink-0 relative group">
                <img src={selectedSaavnItem.image_url} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col text-center md:text-left gap-2 min-w-0">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono font-bold">{selectedSaavnItem.type}</span>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight truncate">{selectedSaavnItem.title}</h2>
                <p className="text-sm text-zinc-400 font-medium">
                  {selectedSaavnItem.artist || selectedSaavnItem.subtitle || 'JioSaavn Collection'}
                  {selectedSaavnItem.year && ` • ${selectedSaavnItem.year}`}
                  {saavnItemTracks.length > 0 && ` • ${saavnItemTracks.length} tracks`}
                </p>
                <div className="flex flex-wrap gap-3 mt-3 justify-center md:justify-start">
                  {saavnItemTracks.length > 0 && (
                    <button 
                      onClick={() => playTrack(saavnItemTracks[0], saavnItemTracks)}
                      className="bg-[#1db954] hover:bg-[#22c55e] text-black font-extrabold text-xs py-3 px-8 rounded-full uppercase tracking-wider transition-all shadow-md transform hover:scale-105 active:scale-95 w-max mx-auto md:mx-0"
                    >
                      ▶ Play {selectedSaavnItem.type === 'artist' ? 'Top Songs' : selectedSaavnItem.type === 'radio' ? 'Radio Mix' : 'Content'}
                    </button>
                  )}
                  {selectedSaavnItem.type === 'album' && (
                    <button
                      onClick={() => toggleSaveAlbum(selectedSaavnItem)}
                      className="border border-zinc-700 bg-transparent text-white font-bold text-xs py-3 px-6 rounded-full transition-all hover:bg-zinc-900 w-max"
                    >
                      {savedAlbums.some(a => String(a.id) === String(selectedSaavnItem.id)) ? '💚 Saved to Library' : '➕ Save to Library'}
                    </button>
                  )}
                  {selectedSaavnItem.type === 'artist' && (
                    <button
                      onClick={() => toggleFollowArtist({ id: selectedSaavnItem.id, title: selectedSaavnItem.title || selectedSaavnItem.name, image_url: selectedSaavnItem.image_url })}
                      className="border border-zinc-700 bg-transparent text-white font-bold text-xs py-3 px-6 rounded-full transition-all hover:bg-zinc-900 w-max"
                    >
                      {savedArtists.some(a => String(a.id) === String(selectedSaavnItem.id)) ? '👤 Following' : '➕ Follow Artist'}
                    </button>
                  )}
                  {(selectedSaavnItem.type === 'show' || (selectedSaavnItem.type === 'playlist' && (selectedSaavnItem.title?.toLowerCase().includes('podcast') || activeMenu === 'podcasts' || activeMenu === 'library_podcasts'))) && (
                    <button
                      onClick={() => toggleSubscribePodcast({ id: selectedSaavnItem.id, title: selectedSaavnItem.title, image_url: selectedSaavnItem.image_url, subtitle: selectedSaavnItem.subtitle || 'Podcast' })}
                      className="border border-zinc-700 bg-transparent text-white font-bold text-xs py-3 px-6 rounded-full transition-all hover:bg-zinc-900 w-max"
                    >
                      {savedPodcasts.some(p => String(p.id) === String(selectedSaavnItem.id)) ? '🔔 Subscribed' : '➕ Subscribe'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tracklist table */}
            <div className="flex flex-col gap-1.5 mt-2 bg-zinc-950/20 rounded-2xl border border-zinc-900/50 p-4">
              <h3 className="text-xs font-extrabold font-mono text-zinc-500 uppercase tracking-wider px-2 border-b border-zinc-900 pb-2 mb-2">Tracklist</h3>
              {saavnItemLoading ? (
                <div className="p-12 text-center text-xs font-bold text-zinc-600 font-mono animate-pulse">⚡ LOADING ALBUM TRACKS...</div>
              ) : saavnItemTracks.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-600">No tracks found.</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {saavnItemTracks.map((song, index) => {
                    const isCurrentTrack = currentSong?.id === song.id
                    return (
                      <div 
                        key={song.id} 
                        onClick={() => playTrack(song, saavnItemTracks)}
                        className={`flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/40 cursor-pointer group border transition-all ${isCurrentTrack ? 'bg-zinc-900/40 border-zinc-800' : 'border-transparent'}`}
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <span className={`text-xs font-mono font-bold w-4 text-center shrink-0 ${isCurrentTrack ? 'text-[#1db954]' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                            {isCurrentTrack && isPlaying ? '🔊' : index + 1}
                          </span>
                          <img src={song.image_url} alt="" className="w-9 h-9 object-cover rounded-lg shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className={`text-sm font-bold truncate ${isCurrentTrack ? 'text-[#1db954]' : 'text-zinc-100'}`}>{song.title}</span>
                            <span className="text-[11px] text-zinc-500 truncate mt-0.5">{song.artist}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 pl-3">
                          <span className="text-[11px] text-zinc-500 font-mono">{formatDuration(song.duration)}</span>
                          
                          {/* Hover Action buttons */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); addToQueue(song) }} 
                              className="text-[10px] bg-zinc-805/80 hover:bg-[#1db954] text-zinc-300 hover:text-black px-2 py-0.5 rounded font-mono font-bold transition shrink-0"
                              title="Add to Queue"
                            >
                              + QUEUE
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(song, song.is_favorite) }} 
                              className={`text-xs p-1 hover:scale-115 transition shrink-0 ${song.is_favorite ? 'text-emerald-400' : 'text-zinc-500'}`}
                              title="Favorite"
                            >
                              💚
                            </button>
                            {customPlaylists?.length > 0 && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setPlaylistMenuOpenId(playlistMenuOpenId === song.id ? null : song.id); }} 
                                className={`text-xs p-1 font-bold hover:scale-115 transition shrink-0 ${playlistMenuOpenId === song.id ? 'text-emerald-400' : 'text-zinc-500'}`}
                                title="Add to Playlist"
                              >
                                ➕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* PLAYLIST SAVER POPOVER */}
                        {playlistMenuOpenId === song.id && (
                          <div className="absolute right-12 mt-12 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 w-40 z-30 text-left text-[11px] max-h-28 overflow-y-auto custom-scrollbar">
                            <p className="text-zinc-500 font-bold font-mono px-2.5 py-1 border-b border-zinc-900 uppercase text-[8px] tracking-wider">Save to Playlist</p>
                            {customPlaylists.map((p) => (
                              <button 
                                key={p.id}
                                onClick={(e) => handleAddToPlaylist(e, song, p.id)}
                                className="w-full text-zinc-300 hover:text-[#1db954] hover:bg-zinc-900 px-2.5 py-1.5 block truncate font-medium"
                              >
                                📁 {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Top Albums if Artist */}
            {selectedSaavnItem.type === 'artist' && artistAlbums.length > 0 && (
              <div className="flex flex-col gap-4 mt-8 animate-in fade-in duration-500">
                <h3 className="text-sm font-extrabold font-mono text-zinc-400 uppercase tracking-wider px-2">Top Albums</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                  {artistAlbums.map((album, index) => (
                    <div key={`${album.id}-${index}`} onClick={() => fetchItemDetails(album)} className="flex flex-col gap-2.5 group cursor-pointer relative">
                      <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                        {album.image_url ? (
                          <img src={album.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                            AL
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                            <span className="text-sm font-bold">▶</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col px-1">
                        <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{album.title}</h3>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{album.year || 'Album'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : searchQuery.trim() ? (
          
          // ================== SEARCH RESULTS TABS ==================
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Tab controls */}
            <div className="flex gap-2 border-b border-zinc-900 pb-2">
              <button 
                onClick={() => setActiveSearchTab('songs')}
                className={`py-2 px-5 text-xs font-extrabold font-mono uppercase tracking-wider rounded-xl transition ${activeSearchTab === 'songs' ? 'bg-[#1db954]/10 text-[#1db954] border border-[#1db954]/20' : 'text-zinc-500 hover:text-white'}`}
              >
                🎵 Songs ({(searchResults?.songs || []).length})
              </button>
              <button 
                onClick={() => setActiveSearchTab('albums')}
                className={`py-2 px-5 text-xs font-extrabold font-mono uppercase tracking-wider rounded-xl transition ${activeSearchTab === 'albums' ? 'bg-[#1db954]/10 text-[#1db954] border border-[#1db954]/20' : 'text-zinc-500 hover:text-white'}`}
              >
                💽 Albums ({(searchResults?.albums || []).length})
              </button>
              <button 
                onClick={() => setActiveSearchTab('playlists')}
                className={`py-2 px-5 text-xs font-extrabold font-mono uppercase tracking-wider rounded-xl transition ${activeSearchTab === 'playlists' ? 'bg-[#1db954]/10 text-[#1db954] border border-[#1db954]/20' : 'text-zinc-500 hover:text-white'}`}
              >
                📁 Playlists ({(searchResults?.playlists || []).length})
              </button>
            </div>

            {searchLoading ? (
              <div className="p-12 text-center text-xs font-bold text-zinc-600 font-mono animate-pulse">⚡ GATHERING API MATCHES...</div>
            ) : (
              <div className="mt-2">
                {/* 1. SONGS TAB */}
                {activeSearchTab === 'songs' && (
                  <div className="flex flex-col gap-1.5">
                    {(searchResults?.songs || []).length === 0 ? (
                      <p className="text-xs text-zinc-600">No songs found.</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {searchResults.songs.map((song) => {
                          const isCurrentTrack = currentSong?.id === song.id
                          return (
                            <div 
                              key={song.id} 
                              onClick={() => playTrack(song, searchResults.songs)}
                              className={`flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/40 cursor-pointer group border transition-all ${isCurrentTrack ? 'bg-zinc-900/40 border-zinc-800' : 'border-transparent'}`}
                            >
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                <img src={song.image_url} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-sm font-bold truncate ${isCurrentTrack ? 'text-[#1db954]' : 'text-zinc-100'}`}>{song.title}</span>
                                  <span className="text-[11px] text-zinc-500 truncate mt-0.5">{song.artist} • {song.album}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 shrink-0 pl-3">
                                <span className="text-[11px] text-zinc-500 font-mono">{formatDuration(song.duration)}</span>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); addToQueue(song) }} 
                                    className="text-[10px] bg-zinc-805/80 hover:bg-[#1db954] text-zinc-300 hover:text-black px-2 py-0.5 rounded font-mono font-bold transition shrink-0"
                                    title="Add to Queue"
                                  >
                                    + QUEUE
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(song, song.is_favorite) }} 
                                    className={`text-xs p-1 hover:scale-115 transition shrink-0 ${song.is_favorite ? 'text-emerald-400' : 'text-zinc-500'}`}
                                    title="Favorite"
                                  >
                                    💚
                                  </button>
                                  {customPlaylists?.length > 0 && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setPlaylistMenuOpenId(playlistMenuOpenId === song.id ? null : song.id); }} 
                                      className={`text-xs p-1 font-bold hover:scale-115 transition shrink-0 ${playlistMenuOpenId === song.id ? 'text-emerald-400' : 'text-zinc-500'}`}
                                      title="Add to Playlist"
                                    >
                                      ➕
                                    </button>
                                  )}
                                </div>
                              </div>
                              {playlistMenuOpenId === song.id && (
                                <div className="absolute right-12 mt-12 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 w-40 z-30 text-left text-[11px] max-h-28 overflow-y-auto custom-scrollbar">
                                  <p className="text-zinc-500 font-bold font-mono px-2.5 py-1 border-b border-zinc-900 uppercase text-[8px] tracking-wider">Save to Playlist</p>
                                  {customPlaylists.map((p) => (
                                    <button 
                                      key={p.id}
                                      onClick={(e) => handleAddToPlaylist(e, song, p.id)}
                                      className="w-full text-zinc-300 hover:text-[#1db954] hover:bg-zinc-900 px-2.5 py-1.5 block truncate font-medium"
                                    >
                                      📁 {p.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ALBUMS TAB */}
                {activeSearchTab === 'albums' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                    {(searchResults?.albums || []).length === 0 ? (
                      <p className="text-xs text-zinc-600 col-span-full">No albums found.</p>
                    ) : (
                      searchResults.albums.map((album, index) => (
                        <div key={`${album.id}-${index}`} onClick={() => fetchItemDetails(album)} className="flex flex-col gap-2.5 group cursor-pointer relative">
                          <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                            {album.image_url ? (
                              <img src={album.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                                {album.title ? album.title.substring(0, 2).toUpperCase() : 'AL'}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                                <span className="text-sm font-bold">▶</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col px-1">
                            <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{album.title}</h3>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{album.subtitle}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 3. PLAYLISTS TAB */}
                {activeSearchTab === 'playlists' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                    {(searchResults?.playlists || []).length === 0 ? (
                      <p className="text-xs text-zinc-600 col-span-full">No playlists found.</p>
                    ) : (
                      searchResults.playlists.map((pl, index) => (
                        <div key={`${pl.id}-${index}`} onClick={() => fetchItemDetails(pl)} className="flex flex-col gap-2.5 group cursor-pointer relative">
                          <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                            {pl.image_url ? (
                              <img src={pl.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                                {pl.title ? pl.title.substring(0, 2).toUpperCase() : 'PL'}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                                <span className="text-sm font-bold">▶</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col px-1">
                            <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{pl.title}</h3>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{pl.subtitle}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeMenu === 'top_charts' ? (
          
          // ================== TOP CHARTS VIEW ==================
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">📈 Top Charts</h2>
            {saavnHomeLoading ? (
              <div className="p-12 text-center text-xs font-bold text-zinc-600 font-mono animate-pulse">⚡ LOADING CHARTS...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {(saavnHome.charts || []).map((item, index) => (
                  <div key={`${item.id}-${index}`} onClick={() => fetchItemDetails(item)} className="flex flex-col gap-2.5 group cursor-pointer relative animate-fade-in">
                    <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                          CH
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">▶</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col px-1">
                      <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{item.title}</h3>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeMenu === 'top_playlists' ? (
          
          // ================== TOP PLAYLISTS VIEW ==================
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">📁 Featured Playlists</h2>
            {saavnHomeLoading ? (
              <div className="p-12 text-center text-xs font-bold text-zinc-600 font-mono animate-pulse">⚡ LOADING PLAYLISTS...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {(saavnHome.top_playlists || []).map((item, index) => (
                  <div key={`${item.id}-${index}`} onClick={() => fetchItemDetails(item)} className="flex flex-col gap-2.5 group cursor-pointer relative animate-fade-in">
                    <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                          PL
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">▶</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col px-1">
                      <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{item.title}</h3>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeMenu === 'top_artists' ? (
          
          // ================== TOP ARTISTS VIEW ==================
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">👤 Popular Artists</h2>
            {topArtistsLoading ? (
              <div className="p-12 text-center text-xs font-bold text-zinc-600 font-mono animate-pulse">⚡ LOADING POPULAR ARTISTS...</div>
            ) : topArtistsList.length === 0 ? (
              <p className="text-xs text-zinc-500">No artists found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {topArtistsList.map((artist, index) => (
                  <div 
                    key={`${artist.id}-${index}`} 
                    onClick={() => fetchItemDetails({ id: artist.id, type: 'artist', title: artist.title || artist.name, image_url: artist.image_url })} 
                    className="flex flex-col gap-2.5 group cursor-pointer relative"
                  >
                    <div className="w-full aspect-square rounded-full relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                      {artist.image_url ? (
                        <img src={artist.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                          {(artist.title || artist.name || '').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full">
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">▶</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col px-1 text-center">
                      <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{artist.title || artist.name}</h3>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">Artist</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeMenu === 'podcasts' ? (
          
          // ================== PODCASTS & AUDIOBOOKS VIEW ==================
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Podcast search input */}
            <div className="relative w-full max-w-sm bg-zinc-950/80 border border-zinc-900 rounded-2xl px-4 py-2.5 flex items-center gap-3 focus-within:border-[#1db954]/50 focus-within:shadow-[0_0_15px_rgba(29,185,84,0.1)] transition-all">
              <span className="text-zinc-600 text-sm">🎙️</span>
              <input 
                type="text"
                value={podcastSearchQuery}
                onChange={(e) => setPodcastSearchQuery(e.target.value)}
                placeholder="Search podcasts, katha, audiobooks..."
                className="bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none w-full font-sans antialiased"
              />
              {podcastSearchQuery && (
                <button onClick={() => setPodcastSearchQuery('')} className="text-zinc-600 hover:text-white text-xs px-0.5">✕</button>
              )}
            </div>

            {podcastSearchQuery.trim() ? (
              /* Podcast Search Results Grid */
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">🔍 Podcast Results for "{podcastSearchQuery}"</h2>
                {podcastSearchLoading ? (
                  <div className="p-12 text-center text-xs font-bold text-zinc-600 font-mono animate-pulse">⚡ SEARCHING SHOWS...</div>
                ) : !podcastSearchResults || podcastSearchResults.length === 0 ? (
                  <p className="text-xs text-zinc-500">No shows found matching this search.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                    {podcastSearchResults.map((item, index) => (
                      <div key={`${item.id}-${index}`} onClick={() => fetchItemDetails(item)} className="flex flex-col gap-2.5 group cursor-pointer relative animate-fade-in">
                        <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                              🎙️
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                              <span className="text-sm font-bold">▶</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col px-1">
                          <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{item.title}</h3>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{item.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Regular View with Trending & aggregated default shows */
              <>
                {/* 1. ALL PODCASTS GRID */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">🎙️ All Podcasts</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                    {TRENDING_PODCASTS.map((item, index) => (
                      <div key={`${item.id}-${index}`} onClick={() => fetchItemDetails(item)} className="flex flex-col gap-2.5 group cursor-pointer relative animate-fade-in">
                        <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                              🎙️
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                              <span className="text-sm font-bold">▶</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col px-1">
                          <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{item.title}</h3>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{item.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. DYNAMIC PODCASTS GRID */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">🎙️ More Shows & Audiobooks</h2>
                  {podcastsLoading ? (
                    <div className="p-12 text-center text-xs font-bold text-zinc-600 font-mono animate-pulse">⚡ LOADING PODCASTS...</div>
                  ) : podcastsList.length === 0 ? (
                    <p className="text-xs text-zinc-500">No podcasts found.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                      {podcastsList.map((item, index) => (
                        <div key={`${item.id}-${index}`} onClick={() => fetchItemDetails({ id: item.id, type: item.type || 'playlist', title: item.title, image_url: item.image_url, subtitle: item.subtitle })} className="flex flex-col gap-2.5 group cursor-pointer relative animate-fade-in">
                          <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                                🎙️
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                                <span className="text-sm font-bold">▶</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col px-1">
                            <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{item.title}</h3>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{item.subtitle}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : activeMenu === 'radio' ? (
          
          // ================== RADIO VIEW ==================
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">📻 JioSaavn Live Radio</h2>
            {saavnHomeLoading ? (
              <div className="p-12 text-center text-xs font-bold text-zinc-600 font-mono animate-pulse">⚡ LOADING RADIO STATIONS...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {(saavnHome.radio || []).map((item, index) => (
                  <div key={`${item.id}-${index}`} onClick={() => fetchItemDetails(item)} className="flex flex-col gap-2.5 group cursor-pointer relative animate-fade-in">
                    <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                          📻
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">▶</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col px-1">
                      <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{item.title}</h3>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeMenu === 'library_history' ? (
          
          // ================== USER HISTORY VIEW ==================
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">🕒 Recently Played</h2>
            {history.length === 0 ? (
              <div className="p-12 border border-zinc-900 border-dashed rounded-2xl text-center flex flex-col items-center justify-center gap-3">
                <span className="text-2xl">🕒</span>
                <p className="text-xs text-zinc-500">No listening history yet. Start playing your favorite tracks and we will track them here!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {history.map((song, idx) => {
                  const isCurrentTrack = currentSong?.id === song.id
                  return (
                    <div 
                      key={song.id} 
                      onClick={() => playTrack(song, history)}
                      className={`flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/40 cursor-pointer group border transition-all ${isCurrentTrack ? 'bg-zinc-900/40 border-zinc-800' : 'border-transparent'}`}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <span className={`text-xs font-mono font-bold w-4 text-center shrink-0 ${isCurrentTrack ? 'text-[#1db954]' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                          {isCurrentTrack && isPlaying ? '🔊' : idx + 1}
                        </span>
                        <img src={song.image_url} alt="" className="w-9 h-9 object-cover rounded-lg shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-bold truncate ${isCurrentTrack ? 'text-[#1db954]' : 'text-zinc-100'}`}>{song.title}</span>
                          <span className="text-[11px] text-zinc-500 truncate mt-0.5">{song.artist} • {song.album}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 pl-3">
                        <span className="text-[11px] text-zinc-500 font-mono">{formatDuration(song.duration)}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); addToQueue(song) }} 
                            className="text-[10px] bg-zinc-805/80 hover:bg-[#1db954] text-zinc-300 hover:text-black px-2 py-0.5 rounded font-mono font-bold transition shrink-0"
                            title="Add to Queue"
                          >
                            + QUEUE
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(song, song.is_favorite) }} 
                            className={`text-xs p-1 hover:scale-115 transition ${song.is_favorite ? 'text-emerald-400' : 'text-zinc-500'}`}
                            title="Favorite"
                          >
                            💚
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : activeMenu === 'library_albums' ? (
          
          // ================== USER SAVED ALBUMS VIEW ==================
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">💽 Saved Albums</h2>
            {savedAlbums.length === 0 ? (
              <div className="p-12 border border-zinc-900 border-dashed rounded-2xl text-center flex flex-col items-center justify-center gap-3">
                <span className="text-2xl">💽</span>
                <p className="text-xs text-zinc-500">You haven't saved any albums yet. Click on any album profile and click "Save to Library"!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {savedAlbums.map((album, index) => (
                  <div key={`${album.id}-${index}`} onClick={() => fetchItemDetails(album)} className="flex flex-col gap-2.5 group cursor-pointer relative">
                    <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                      {album.image_url ? (
                        <img src={album.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                          AL
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">▶</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col px-1">
                      <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{album.title}</h3>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{album.artist || album.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeMenu === 'library_podcasts' ? (
          
          // ================== USER SAVED PODCASTS VIEW ==================
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">🎙️ Subscribed Podcasts</h2>
            {savedPodcasts.length === 0 ? (
              <div className="p-12 border border-zinc-900 border-dashed rounded-2xl text-center flex flex-col items-center justify-center gap-3">
                <span className="text-2xl">🎙️</span>
                <p className="text-xs text-zinc-500">You haven't subscribed to any podcasts yet. Explore the Podcasts directory and click "Subscribe"!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {savedPodcasts.map((podcast, index) => (
                  <div key={`${podcast.id}-${index}`} onClick={() => fetchItemDetails({ id: podcast.id, type: 'playlist', title: podcast.title, image_url: podcast.image_url, subtitle: podcast.subtitle })} className="flex flex-col gap-2.5 group cursor-pointer relative">
                    <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                      {podcast.image_url ? (
                        <img src={podcast.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                          🎙️
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">▶</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col px-1">
                      <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{podcast.title}</h3>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{podcast.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeMenu === 'library_artists' ? (
          
          // ================== USER SAVED ARTISTS VIEW ==================
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">👥 Followed Artists</h2>
            {savedArtists.length === 0 ? (
              <div className="p-12 border border-zinc-900 border-dashed rounded-2xl text-center flex flex-col items-center justify-center gap-3">
                <span className="text-2xl">👥</span>
                <p className="text-xs text-zinc-500">You aren't following any artists yet. Explore Popular Artists and click "Follow Artist"!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {savedArtists.map((artist, index) => (
                  <div key={`${artist.id}-${index}`} onClick={() => fetchItemDetails({ id: artist.id, type: 'artist', title: artist.title, image_url: artist.image_url })} className="flex flex-col gap-2.5 group cursor-pointer relative">
                    <div className="w-full aspect-square rounded-full relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                      {artist.image_url ? (
                        <img src={artist.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                          {artist.title ? artist.title.substring(0, 2).toUpperCase() : 'AR'}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full">
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                          <span className="text-sm font-bold">▶</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col px-1 text-center">
                      <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{artist.title}</h3>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">Artist</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeMenu === 'liked_songs' || activeMenu === 'custom_playlist' ? (
          
          // ================== LIBRARY VIEWS (LIKED SONGS OR PLAYLISTS) ==================
          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">
              {activeMenu === 'liked_songs' ? "My Favorite Tracks" : "Playlist Collection"}
            </h2>
            {libraryLoading ? (
              <div className="p-12 text-center text-xs font-bold text-zinc-600 font-mono animate-pulse">⚡ ACCESSING SUPABASE RECORDS...</div>
            ) : librarySongs.length === 0 ? (
              <div className="p-12 border border-zinc-900 border-dashed rounded-2xl text-center flex flex-col items-center justify-center gap-3">
                <span className="text-2xl">💚</span>
                <p className="text-xs text-zinc-500">Your library is currently empty. Go ahead and search for online tracks and hit Like or add them to your playlists!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {librarySongs.map((song, idx) => {
                  const isCurrentTrack = currentSong?.id === song.id
                  return (
                    <div 
                      key={song.id} 
                      onClick={() => playTrack(song, librarySongs)}
                      className={`flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/40 cursor-pointer group border transition-all ${isCurrentTrack ? 'bg-zinc-900/40 border-zinc-800' : 'border-transparent'}`}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <span className={`text-xs font-mono font-bold w-4 text-center shrink-0 ${isCurrentTrack ? 'text-[#1db954]' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                          {isCurrentTrack && isPlaying ? '🔊' : idx + 1}
                        </span>
                        <img src={song.image_url} alt="" className="w-9 h-9 object-cover rounded-lg shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-bold truncate ${isCurrentTrack ? 'text-[#1db954]' : 'text-zinc-100'}`}>{song.title}</span>
                          <span className="text-[11px] text-zinc-500 truncate mt-0.5">{song.artist} • {song.album}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 pl-3">
                        <span className="text-[11px] text-zinc-500 font-mono">{formatDuration(song.duration)}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); addToQueue(song) }} 
                            className="text-[10px] bg-zinc-805/80 hover:bg-[#1db954] text-zinc-300 hover:text-black px-2 py-0.5 rounded font-mono font-bold transition shrink-0"
                            title="Add to Queue"
                          >
                            + QUEUE
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(song, song.is_favorite) }} 
                            className={`text-xs p-1 hover:scale-115 transition ${song.is_favorite ? 'text-emerald-400' : 'text-zinc-500'}`}
                            title="Favorite"
                          >
                            💚
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          
          // ================== DEFAULT SAAVN HOME RECOMMENDATIONS ==================
          <div className="flex flex-col gap-10 animate-in fade-in duration-500">
            {saavnHomeLoading ? (
              <div className="p-16 text-center text-xs font-bold text-zinc-600 font-mono animate-pulse">⚡ LOADING RECOMMENDATION MODULES...</div>
            ) : (
              <>
                {/* 1. TRENDING NOW ROW */}
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">🔥 Trending Now</h2>
                  </div>
                  <div className="flex overflow-x-auto gap-5 pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {saavnHome.new_trending.map((item, index) => (
                      <div 
                        key={`${item.id}-${index}`} 
                        onClick={() => {
                          if (item.type === 'song') {
                            // Normalize the song and play it
                            const normalized = {
                              id: `saavn_${item.id}`,
                              title: item.title,
                              artist: item.subtitle,
                              album: 'JioSaavn Single',
                              image_url: item.image_url,
                              audio_url: `/api/saavn/play/${item.id}`,
                              source: 'saavn'
                            }
                            playTrack(normalized, [normalized])
                          } else {
                            fetchItemDetails(item)
                          }
                        }}
                        className="w-36 md:w-40 flex flex-col gap-2 group cursor-pointer shrink-0"
                      >
                        <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                              {item.title ? item.title.substring(0, 2).toUpperCase() : 'TR'}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                              <span className="text-sm font-bold">▶</span>
                            </div>
                          </div>
                          <div className="absolute bottom-2.5 left-2.5 bg-black/80 border border-zinc-800/80 text-[8px] font-bold font-mono px-2 py-0.5 rounded-full text-emerald-400 opacity-90">
                            {item.type === 'song' ? '🎵 Track' : '💽 Album'}
                          </div>
                        </div>
                        <div className="flex flex-col px-1">
                          <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{item.title}</h3>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{item.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. NEW ALBUMS ROW */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">🆕 New Releases</h2>
                  <div className="flex overflow-x-auto gap-5 pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {saavnHome.new_albums.map((item, index) => (
                      <div key={`${item.id}-${index}`} onClick={() => fetchItemDetails(item)} className="w-36 md:w-40 flex flex-col gap-2 group cursor-pointer shrink-0">
                        <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                              {item.title ? item.title.substring(0, 2).toUpperCase() : 'AL'}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                              <span className="text-sm font-bold">▶</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col px-1">
                          <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{item.title}</h3>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{item.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. TOP PLAYLISTS ROW */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">📁 Featured Playlists</h2>
                  <div className="flex overflow-x-auto gap-5 pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {saavnHome.top_playlists.map((item, index) => (
                      <div key={`${item.id}-${index}`} onClick={() => fetchItemDetails(item)} className="w-36 md:w-40 flex flex-col gap-2 group cursor-pointer shrink-0">
                        <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                              {item.title ? item.title.substring(0, 2).toUpperCase() : 'PL'}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                              <span className="text-sm font-bold">▶</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col px-1">
                          <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{item.title}</h3>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{item.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. CHARTS ROW */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono text-zinc-300">📈 Top Charts</h2>
                  <div className="flex overflow-x-auto gap-5 pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {saavnHome.charts.map((item, index) => (
                      <div key={`${item.id}-${index}`} onClick={() => fetchItemDetails(item)} className="w-36 md:w-40 flex flex-col gap-2 group cursor-pointer shrink-0">
                        <div className="w-full aspect-square rounded-2xl relative overflow-hidden shadow-md bg-zinc-950 border border-zinc-900/60 group-hover:border-zinc-700/80 transition-all duration-300 group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center text-xl font-serif text-zinc-500 font-bold">
                              {item.title ? item.title.substring(0, 2).toUpperCase() : 'CH'}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform transition hover:scale-105 active:scale-95">
                              <span className="text-sm font-bold">▶</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col px-1">
                          <h3 className="font-bold text-[13px] tracking-tight truncate text-zinc-100 group-hover:text-[#1db954]">{item.title}</h3>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-medium">{item.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </section>

    </div>
  )
}