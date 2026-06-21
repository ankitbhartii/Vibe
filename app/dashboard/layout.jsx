'use client'
import React, { useState } from 'react'
import Header from '@/components/Header'
import GlobalPlayer from '@/components/GlobalPlayer'
import { useAudio } from '@/context/AudioContext'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function DashboardLayout({ children }) {
  const { 
    activeMenu, setActiveMenu, customPlaylists, 
    selectedPlaylistId, setSelectedPlaylistId, createNewPlaylist,
    queue, playTrack, removeFromQueue, currentSong,
    showQueueSidebar, setShowQueueSidebar
  } = useAudio()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const NavButton = ({ menuKey, icon, label, onClick, closeMobile }) => {
    const isActive = activeMenu === menuKey
    return (
      <button 
        onClick={() => {
          if (onClick) { onClick() } else { setActiveMenu(menuKey); setSelectedPlaylistId(null); }
          if (closeMobile) setMobileMenuOpen(false)
        }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium relative overflow-hidden gpu-accel transition-colors duration-300 ${
          isActive 
            ? 'text-white' 
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
        }`}
      >
        {isActive && (
          <motion.div 
            layoutId="activeNavIndicator"
            className="absolute inset-0 bg-white/[0.08] z-0"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        {isActive && (
          <motion.div 
            layoutId="activeNavLine"
            className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r-full bg-[#fa2d48] z-10"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="text-[15px] z-10" style={{ transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}>{icon}</span>
        <span className="z-10">{label}</span>
      </button>
    )
  }

  /* Shared sidebar content — used in both desktop aside and mobile drawer */
  const SidebarContent = ({ closeMobile }) => (
    <>
      {/* SECTION 1: BROWSE */}
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase px-3 mb-1.5">Browse</h3>
        <nav className="flex flex-col gap-0.5">
          <NavButton menuKey="new_releases" icon="🎵" label="New Releases" closeMobile={closeMobile} />
          <NavButton menuKey="top_charts" icon="📈" label="Top Charts" closeMobile={closeMobile} />
          <NavButton menuKey="top_playlists" icon="📁" label="Top Playlists" closeMobile={closeMobile} />
          <NavButton menuKey="podcasts" icon="🎙️" label="Podcasts" closeMobile={closeMobile} />
          <NavButton menuKey="top_artists" icon="👤" label="Top Artists" closeMobile={closeMobile} />
          <NavButton menuKey="radio" icon="📻" label="Radio" closeMobile={closeMobile} />
        </nav>
      </div>

      {/* SECTION 2: MY LIBRARY */}
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase px-3 mb-1.5">My Library</h3>
        <nav className="flex flex-col gap-0.5">
          <NavButton menuKey="library_history" icon="🕒" label="History" closeMobile={closeMobile} />
          <NavButton menuKey="liked_songs" icon="💚" label="Liked Songs" closeMobile={closeMobile} />
          <NavButton menuKey="library_albums" icon="💽" label="Albums" closeMobile={closeMobile} />
          <NavButton menuKey="library_podcasts" icon="🎙️" label="Podcasts" closeMobile={closeMobile} />
          <NavButton menuKey="library_artists" icon="👥" label="Artists" closeMobile={closeMobile} />
        </nav>
      </div>

      {/* SECTION 3: PLAYLISTS */}
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase px-3 mb-1.5">Playlists</h3>
        <div className="flex flex-col gap-0.5 overflow-y-auto custom-scrollbar pr-1 max-h-[200px]">
          {customPlaylists && customPlaylists.map((playlist) => {
            const isActive = activeMenu === 'custom_playlist' && selectedPlaylistId === playlist.id
            return (
              <button 
                key={playlist.id}
                onClick={() => { setActiveMenu('custom_playlist'); setSelectedPlaylistId(playlist.id); if (closeMobile) setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-left truncate relative overflow-hidden transition-colors duration-300 ${
                  isActive
                    ? 'text-white' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-white/[0.08] z-0"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {isActive && (
                  <motion.div 
                    layoutId="activeNavLine"
                    className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r-full bg-[#fa2d48] z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="z-10">📁</span> <span className="z-10 truncate">{playlist.name}</span>
              </button>
            )
          })}
        </div>
        <button 
          onClick={() => { createNewPlaylist(); if (closeMobile) setMobileMenuOpen(false); }}
          className="mt-2 mx-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[12px] text-[#fa2d48] hover:text-[#ff4466] font-semibold py-2 px-4 rounded-full flex items-center justify-center gap-1.5 apple-press"
          style={{ transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
        >
          ➕ Create Playlist
        </button>
      </div>

      {/* LOGOUT BUTTON */}
      <div className="pt-3 border-t border-white/[0.04] flex flex-col gap-1 mt-auto">
        <button 
          onClick={() => { handleLogout(); if (closeMobile) setMobileMenuOpen(false); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/[0.06] transition-all duration-300"
        >
          <span>🚪</span> Log Out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-[#f5f5f7] font-sans overflow-hidden select-none relative">
      
      {/* APPLE MUSIC HEADER */}
      <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} mobileMenuOpen={mobileMenuOpen} />
      
      {/* MAIN PLATFORM WORKSPACE FRAME */}
      <div className="flex flex-1 w-full overflow-hidden p-1.5 md:p-3 gap-2 pb-24 md:pb-28"> 
        
        {/* DESKTOP SIDEBAR */}
        <aside 
          className="w-56 lg:w-60 hidden md:flex flex-col gap-5 h-full shrink-0 pt-3 px-2.5 overflow-y-auto custom-scrollbar rounded-2xl"
          style={{
            background: 'rgba(18, 18, 20, 0.6)',
            backdropFilter: 'blur(40px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          <SidebarContent />
        </aside>
        
        {/* MAIN FEED SCROLL WORKSPACE WINDOW */}
        <main 
          className="flex-1 rounded-2xl overflow-y-auto custom-scrollbar relative"
          style={{
            background: 'rgba(10, 10, 12, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.03)',
          }}
        >
          {children}
        </main>

        {/* DESKTOP RIGHT SIDEBAR (QUEUE & MINI VIDEO PLAYER) */}
        {showQueueSidebar && (
          <aside 
            className="w-72 lg:w-80 hidden md:flex flex-col gap-4 h-full shrink-0 p-3 overflow-hidden rounded-2xl"
            style={{
              background: 'rgba(18, 18, 20, 0.6)',
              backdropFilter: 'blur(40px) saturate(150%)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.04] shrink-0">
              <span className="text-[13px] font-bold tracking-wider uppercase text-zinc-300">Queue</span>
              <button 
                onClick={() => setShowQueueSidebar(false)}
                className="text-zinc-500 hover:text-white text-xs px-1.5 py-0.5 rounded bg-white/[0.02] hover:bg-white/[0.06] transition"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Queue list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-0.5 select-none">
              {/* Now Playing in Queue */}
              {currentSong && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold tracking-widest text-[#fa2d48]/90 uppercase pl-1">Now Playing</span>
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-blue-500/[0.1] border border-blue-500/20">
                    {currentSong.image_url ? (
                      <img src={currentSong.image_url} alt="" className="w-9 h-9 object-cover rounded-lg shrink-0" />
                    ) : (
                      <div className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center text-xs shrink-0">🎵</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{currentSong.title}</p>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{currentSong.artist}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Up Next List */}
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase pl-1">Next Up</span>
                {queue.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 italic pl-1 mt-1">Queue is empty</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {queue.map((song, idx) => (
                      <div 
                        key={song.id + '-layout-' + idx} 
                        className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/[0.04] transition group/layoutq"
                      >
                        <span className="text-[9px] font-mono text-zinc-650 w-4 text-center">{idx + 1}</span>
                        {song.image_url && <img src={song.image_url} alt="" className="w-8 h-8 object-cover rounded-lg shrink-0" />}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playTrack(song)}>
                          <p className="text-xs font-semibold text-zinc-300 truncate group-hover/layoutq:text-white transition-colors">{song.title}</p>
                          <p className="text-[9px] text-zinc-500 truncate mt-0.5">{song.artist}</p>
                        </div>
                        <button 
                          onClick={() => removeFromQueue(song.id)}
                          className="text-zinc-650 hover:text-red-400 opacity-0 group-hover/layoutq:opacity-100 transition-opacity p-1 text-xs shrink-0"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* MOBILE SLIDE-OUT SIDEBAR DRAWER */}
      {/* Backdrop overlay */}
      <div 
        className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={() => setMobileMenuOpen(false)}
      />
      
      {/* Slide-out drawer */}
      <div 
        className={`md:hidden fixed top-0 left-0 bottom-0 w-[280px] z-[70] flex flex-col gap-5 pt-16 pb-28 px-3 overflow-y-auto custom-scrollbar gpu-accel`}
        style={{
          background: 'rgba(18, 18, 20, 0.97)',
          backdropFilter: 'blur(50px) saturate(180%)',
          WebkitBackdropFilter: 'blur(50px) saturate(180%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: mobileMenuOpen ? '20px 0 60px rgba(0, 0, 0, 0.7)' : 'none',
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#fa2d48] to-[#d91e36] flex items-center justify-center text-white font-black text-sm shadow-lg">V</div>
            <span className="text-[14px] font-semibold text-white">Vibe Music</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-400 hover:text-white apple-press text-sm"
          >
            ✕
          </button>
        </div>

        <SidebarContent closeMobile={true} />
      </div>

      {/* MOBILE BOTTOM NAV DOCK — simplified with menu toggle */}
      <div 
        className="md:hidden fixed bottom-[76px] left-3 right-3 h-[52px] rounded-full px-6 flex items-center justify-between z-40"
        style={{
          background: 'rgba(18, 18, 20, 0.92)',
          backdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 15px 50px rgba(0, 0, 0, 0.8)',
        }}
      >
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center gap-0.5 apple-press ${mobileMenuOpen ? 'text-[#fa2d48]' : 'text-zinc-500'}`}
          style={{ transition: 'color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
        >
          <span className="text-lg">☰</span>
          <span className="text-[8px] font-semibold uppercase tracking-tight">Menu</span>
        </button>
        <button 
          onClick={() => { setActiveMenu('new_releases'); setSelectedPlaylistId(null); setMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 apple-press ${activeMenu === 'new_releases' ? 'text-[#fa2d48]' : 'text-zinc-500'}`}
          style={{ transition: 'color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
        >
          <span className="text-lg">🎵</span>
          <span className="text-[8px] font-semibold uppercase tracking-tight">Browse</span>
        </button>
        <button 
          onClick={() => { setActiveMenu('liked_songs'); setSelectedPlaylistId(null); setMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 apple-press ${activeMenu === 'liked_songs' ? 'text-[#fa2d48]' : 'text-zinc-500'}`}
          style={{ transition: 'color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
        >
          <span className="text-lg">💚</span>
          <span className="text-[8px] font-semibold uppercase tracking-tight">Library</span>
        </button>
        <button 
          onClick={() => { setActiveMenu('top_charts'); setSelectedPlaylistId(null); setMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 apple-press ${activeMenu === 'top_charts' ? 'text-[#fa2d48]' : 'text-zinc-500'}`}
          style={{ transition: 'color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
        >
          <span className="text-lg">📈</span>
          <span className="text-[8px] font-semibold uppercase tracking-tight">Charts</span>
        </button>
      </div>

      {/* GLOBAL FOOTER PLAYER DOCK */}
      <GlobalPlayer /> 
    </div>
  )
}