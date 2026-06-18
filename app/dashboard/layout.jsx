'use client'
import React from 'react'
import Header from '@/components/Header'
import GlobalPlayer from '@/components/GlobalPlayer'
import { useAudio } from '@/context/AudioContext'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }) {
  const { 
    activeMenu, setActiveMenu, customPlaylists, 
    selectedPlaylistId, setSelectedPlaylistId, createNewPlaylist 
  } = useAudio()

  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505] text-[#f4f4f5] font-sans overflow-hidden select-none relative">
      
      {/* MONOCHROME TOP HEADER */}
      <Header />
      
      {/* MAIN PLATFORM WORKSPACE FRAME */}
      <div className="flex flex-1 w-full overflow-hidden p-2 md:p-4 gap-4 pb-24 md:pb-28"> 
        
        {/* MONOCHROME GLASSMORPHIC SIDEBAR */}
        <aside className="w-60 lg:w-64 hidden md:flex flex-col gap-6 h-full shrink-0 pt-4 px-3 overflow-y-auto custom-scrollbar glass-card rounded-2xl">
          
          {/* SECTION 1: BROWSE */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase px-3 mb-1 font-mono">Browse</h3>
            <nav className="flex flex-col gap-1">
              <button 
                onClick={() => { setActiveMenu('new_releases'); setSelectedPlaylistId(null); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeMenu === 'new_releases' 
                    ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span>🎵</span> New Releases
              </button>
              <button 
                onClick={() => { setActiveMenu('top_charts'); setSelectedPlaylistId(null); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeMenu === 'top_charts' 
                    ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span>📈</span> Top Charts
              </button>
              <button 
                onClick={() => { setActiveMenu('top_playlists'); setSelectedPlaylistId(null); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeMenu === 'top_playlists' 
                    ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span>📁</span> Top Playlists
              </button>
              <button 
                onClick={() => { setActiveMenu('podcasts'); setSelectedPlaylistId(null); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeMenu === 'podcasts' 
                    ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span>🎙️</span> Podcasts
              </button>
              <button 
                onClick={() => { setActiveMenu('top_artists'); setSelectedPlaylistId(null); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeMenu === 'top_artists' 
                    ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span>👤</span> Top Artists
              </button>
              <button 
                onClick={() => { setActiveMenu('radio'); setSelectedPlaylistId(null); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeMenu === 'radio' 
                    ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span>📻</span> Radio
              </button>
            </nav>
          </div>
 
          {/* SECTION 2: MY LIBRARY */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase px-3 mb-1 font-mono">My Library</h3>
            <nav className="flex flex-col gap-1">
              <button 
                onClick={() => { setActiveMenu('library_history'); setSelectedPlaylistId(null); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeMenu === 'library_history' 
                    ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span>🕒</span> History
              </button>
              <button 
                onClick={() => { setActiveMenu('liked_songs'); setSelectedPlaylistId(null); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeMenu === 'liked_songs' 
                    ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span>💚</span> Liked Songs
              </button>
              <button 
                onClick={() => { setActiveMenu('library_albums'); setSelectedPlaylistId(null); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeMenu === 'library_albums' 
                    ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span>💽</span> Albums
              </button>
              <button 
                onClick={() => { setActiveMenu('library_podcasts'); setSelectedPlaylistId(null); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeMenu === 'library_podcasts' 
                    ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span>🎙️</span> Podcasts
              </button>
              <button 
                onClick={() => { setActiveMenu('library_artists'); setSelectedPlaylistId(null); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeMenu === 'library_artists' 
                    ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                }`}
              >
                <span>👥</span> Artists
              </button>
            </nav>
          </div>

          {/* SECTION 3: PLAYLISTS */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase px-3 mb-1 font-mono">Playlists</h3>
            
            <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1 max-h-[160px]">
              {customPlaylists && customPlaylists.map((playlist) => (
                <button 
                  key={playlist.id}
                  onClick={() => { setActiveMenu('custom_playlist'); setSelectedPlaylistId(playlist.id); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold text-left truncate transition-all duration-200 ${
                    activeMenu === 'custom_playlist' && selectedPlaylistId === playlist.id
                      ? 'text-white bg-[#1db954]/10 border border-[#1db954]/20 shadow-[0_0_15px_rgba(29,185,84,0.15)] glow-border' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
                  }`}
                >
                  <span>📁</span> {playlist.name}
                </button>
              ))}
            </div>

            <button 
              onClick={createNewPlaylist}
              className="mt-3 mx-1 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[12px] text-[#1db954] hover:text-[#22c55e] font-bold py-2.5 px-4 rounded-full flex items-center justify-center gap-1.5 transition-all hover:scale-102 active:scale-95 glow-border"
            >
              ➕ Create Playlist
            </button>
          </div>

          {/* LOGOUT BUTTON */}
          <div className="pt-4 border-t border-zinc-900 flex flex-col gap-2">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all duration-200"
            >
              <span>🚪</span> Log Out
            </button>
          </div>
        </aside>
        
        {/* MAIN FEED SCROLL WORKSPACE WINDOW */}
        <main className="flex-1 bg-black rounded-2xl overflow-y-auto custom-scrollbar relative border border-zinc-900/60 shadow-inner">
          {children}
        </main>
      </div>

      {/* MOBILE PERSISTENT BOTTOM TRAY NAV DOCK */}
      <div className="md:hidden fixed bottom-[90px] left-4 right-4 h-14 bg-zinc-950/90 border border-zinc-900/60 backdrop-blur-md rounded-full px-8 flex items-center justify-between z-40 shadow-2xl">
        <button 
          onClick={() => { setActiveMenu('new_releases'); setSelectedPlaylistId(null); }}
          className={`flex flex-col items-center gap-0.5 ${activeMenu === 'new_releases' ? 'text-[#1db954]' : 'text-zinc-500'}`}
        >
          <span className="text-lg">🎵</span>
          <span className="text-[9px] font-bold uppercase tracking-tight font-sans">Browse</span>
        </button>
        <button 
          onClick={() => { setActiveMenu('liked_songs'); setSelectedPlaylistId(null); }}
          className={`flex flex-col items-center gap-0.5 ${activeMenu === 'liked_songs' ? 'text-[#1db954]' : 'text-zinc-500'}`}
        >
          <span className="text-lg">💚</span>
          <span className="text-[9px] font-medium uppercase tracking-tight font-sans">Library</span>
        </button>
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 text-red-500 hover:text-red-400"
        >
          <span className="text-lg">🚪</span>
          <span className="text-[9px] font-bold uppercase tracking-tight font-sans">Log Out</span>
        </button>
      </div>

      {/* GLOBAL FOOTER PLAYER DOCK */}
      <GlobalPlayer /> 
    </div>
  )
}