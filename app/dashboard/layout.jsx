'use client'
import React from 'react'
import Header from '@/components/Header'
import GlobalPlayer from '@/components/GlobalPlayer'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex flex-col h-screen w-screen bg-black text-[#e0e0e0] font-sans overflow-hidden select-none relative">
      
      {/* JIOSAAVN UNIFIED SEARCH TOP HEADER */}
      <Header />
      
      {/* MAIN PLATFORM WORKSPACE FRAME */}
      <div className="flex flex-1 w-full overflow-hidden p-2 md:p-3 gap-3 pb-24 md:pb-28"> 
        
        {/* JIOSAAVN SIDEBAR ARCHITECTURE */}
        <aside className="w-60 lg:w-64 hidden md:flex flex-col gap-6 h-full shrink-0 pt-4 px-2 overflow-y-auto custom-scrollbar">
          
          {/* SECTION 1: BROWSE */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[11px] font-bold text-zinc-500 tracking-wider uppercase px-3 mb-1 font-mono">Browse</h3>
            <nav className="flex flex-col gap-0.5">
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-white bg-zinc-900/60 border border-zinc-800/20 shadow-sm transition-all duration-150">
                <span>🎵</span> New Releases
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all duration-150">
                <span>📈</span> Top Charts
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all duration-150">
                <span>🌟</span> Top Playlists
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all duration-150">
                <span>🎙️</span> Podcasts
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all duration-150">
                <span>🧑‍🎤</span> Top Artists
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all duration-150">
                <span>📻</span> Radio
              </button>
            </nav>
          </div>

          {/* SECTION 2: MY LIBRARY */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[11px] font-bold text-zinc-500 tracking-wider uppercase px-3 mb-1 font-mono">My Library</h3>
            <nav className="flex flex-col gap-0.5">
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all duration-150">
                <span>🕒</span> History
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all duration-150">
                <span>💚</span> Liked Songs
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all duration-150">
                <span>💿</span> Albums
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all duration-150">
                <span>📡</span> Podcasts
              </button>
              <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all duration-150">
                <span>🎨</span> Artists
              </button>
            </nav>
            <button className="mt-3 mx-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[12px] text-emerald-400 hover:text-emerald-300 font-bold py-2 px-4 rounded-full flex items-center justify-center gap-1.5 transition-all active:scale-95">
              ➕ New Playlist
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
        <button className="flex flex-col items-center gap-0.5 text-emerald-400">
          <span className="text-lg">🎵</span>
          <span className="text-[9px] font-bold uppercase tracking-tight font-sans">Browse</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-zinc-500">
          <span className="text-lg">📈</span>
          <span className="text-[9px] font-medium uppercase tracking-tight font-sans">Charts</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-zinc-500">
          <span className="text-lg">💚</span>
          <span className="text-[9px] font-medium uppercase tracking-tight font-sans">Library</span>
        </button>
      </div>

      {/* GLOBAL FOOTER PLAYER DOCK */}
      <GlobalPlayer /> 
    </div>
  )
}