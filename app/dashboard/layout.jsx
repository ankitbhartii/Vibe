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
    selectedPlaylistId, setSelectedPlaylistId, createNewPlaylist 
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
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium relative overflow-hidden transition-all duration-300 ${
          isActive
            ? 'text-white'
            : 'text-zinc-500 hover:text-zinc-200'
        }`}
        style={isActive ? {} : {}}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,45,85,0.06)' }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
      >
        {isActive && (
          <motion.div
            layoutId="activeNavIndicator"
            className="absolute inset-0 z-0 rounded-xl"
            style={{ background: 'rgba(255,45,85,0.12)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        {isActive && (
          <motion.div
            layoutId="activeNavLine"
            className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r-full z-10"
            style={{ background: 'linear-gradient(to bottom, #ff2d55, #ff6b8a)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="text-[15px] z-10">{icon}</span>
        <span className="z-10" style={{ color: isActive ? '#ff6b8a' : 'inherit' }}>{label}</span>
      </button>
    )
  }

  /* Shared sidebar content */
  const SidebarContent = ({ closeMobile }) => (
    <>
      {/* SECTION 1: BROWSE */}
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[10px] font-bold tracking-[0.15em] uppercase px-3 mb-2" style={{ color: '#ff2d55' }}>Browse</h3>
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
        <h3 className="text-[10px] font-bold tracking-[0.15em] uppercase px-3 mb-2" style={{ color: '#ff2d55' }}>My Library</h3>
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
        <h3 className="text-[10px] font-bold tracking-[0.15em] uppercase px-3 mb-2" style={{ color: '#ff2d55' }}>Playlists</h3>
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
          className="mt-2 mx-1 text-[12px] font-semibold py-2 px-4 rounded-full flex items-center justify-center gap-1.5 transition-all duration-300"
          style={{
            background: 'rgba(255,45,85,0.1)',
            border: '1px solid rgba(255,45,85,0.25)',
            color: '#ff6b8a',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,45,85,0.2)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,45,85,0.1)'; e.currentTarget.style.color = '#ff6b8a' }}
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
    <div className="flex flex-col h-screen w-screen text-[#f5f5f7] font-sans overflow-hidden select-none relative"
      style={{ background: '#070708' }}
    >
      {/* Ambient pink glow backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(255,45,85,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(120,0,60,0.05) 0%, transparent 60%)'
        }}
      />

      {/* HEADER */}
      <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} mobileMenuOpen={mobileMenuOpen} />
      
      {/* MAIN WORKSPACE */}
      <div className="flex flex-1 w-full overflow-hidden p-1.5 md:p-3 gap-2 pb-24 md:pb-28 relative z-10">

        {/* DESKTOP SIDEBAR */}
        <aside
          className="w-56 lg:w-60 hidden md:flex flex-col gap-5 h-full shrink-0 pt-3 px-2.5 overflow-y-auto custom-scrollbar rounded-2xl"
          style={{
            background: 'rgba(12,12,14,0.85)',
            backdropFilter: 'blur(40px) saturate(160%)',
            border: '1px solid rgba(255,45,85,0.1)',
            boxShadow: 'inset 0 0 40px rgba(255,45,85,0.03)',
          }}
        >
          <SidebarContent />
        </aside>
        
        {/* MAIN FEED */}
        <main
          className="flex-1 rounded-2xl overflow-y-auto custom-scrollbar relative z-10"
          style={{
            background: 'rgba(10,10,12,0.92)',
            border: '1px solid rgba(255,255,255,0.03)',
          }}
        >
          {children}
        </main>
      </div>

      {/* MOBILE SLIDE-OUT SIDEBAR DRAWER */}
      {/* Backdrop overlay */}
      <div 
        className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={() => setMobileMenuOpen(false)}
      />
      
      {/* Slide-out mobile drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 w-[280px] z-[70] flex flex-col gap-5 pt-16 pb-28 px-3 overflow-y-auto custom-scrollbar`}
        style={{
          background: 'rgba(10,10,12,0.98)',
          backdropFilter: 'blur(50px) saturate(180%)',
          WebkitBackdropFilter: 'blur(50px) saturate(180%)',
          borderRight: '1px solid rgba(255,45,85,0.15)',
          boxShadow: mobileMenuOpen ? '20px 0 60px rgba(0,0,0,0.8), 4px 0 30px rgba(255,45,85,0.05)' : 'none',
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg"
              style={{ background: 'linear-gradient(135deg, #ff2d55, #c0193a)', boxShadow: '0 0 16px rgba(255,45,85,0.5)' }}
            >V</div>
            <span className="text-[14px] font-bold" style={{
              background: 'linear-gradient(135deg, #fff 0%, #ff2d55 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>Vibe</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >✕</button>
        </div>
        <SidebarContent closeMobile={true} />
      </div>

      {/* MOBILE BOTTOM NAV DOCK */}
      <div
        className="md:hidden fixed bottom-[76px] left-3 right-3 h-[52px] rounded-full px-6 flex items-center justify-between z-40"
        style={{
          background: 'rgba(12,12,14,0.95)',
          backdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255,45,85,0.12)',
          boxShadow: '0 15px 50px rgba(0,0,0,0.8)',
        }}
      >
        {[{
          key: 'menu', icon: '☰', label: 'Menu',
          onClick: () => setMobileMenuOpen(!mobileMenuOpen),
          active: mobileMenuOpen
        }, {
          key: 'new_releases', icon: '🎵', label: 'Browse',
          onClick: () => { setActiveMenu('new_releases'); setSelectedPlaylistId(null); setMobileMenuOpen(false) },
          active: activeMenu === 'new_releases'
        }, {
          key: 'liked_songs', icon: '💚', label: 'Library',
          onClick: () => { setActiveMenu('liked_songs'); setSelectedPlaylistId(null); setMobileMenuOpen(false) },
          active: activeMenu === 'liked_songs'
        }, {
          key: 'top_charts', icon: '📈', label: 'Charts',
          onClick: () => { setActiveMenu('top_charts'); setSelectedPlaylistId(null); setMobileMenuOpen(false) },
          active: activeMenu === 'top_charts'
        }].map(item => (
          <button
            key={item.key}
            onClick={item.onClick}
            className="flex flex-col items-center gap-0.5 transition-all duration-300"
            style={{ color: item.active ? '#ff2d55' : '#52525b' }}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[8px] font-bold uppercase tracking-tight">{item.label}</span>
          </button>
        ))}
      </div>

      {/* GLOBAL FOOTER PLAYER DOCK */}
      <GlobalPlayer /> 
    </div>
  )
}