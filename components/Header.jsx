'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { useAudio } from '@/context/AudioContext'

export default function Header({ onMenuToggle, mobileMenuOpen }) {
  const [user, setUser] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { searchQuery, setSearchQuery } = useAudio()
  const supabase = createClient()
  const router = useRouter()

  // FIXED: Updated target email check string to match your exact admin email address (100)
  const isAdmin = user?.email?.toLowerCase().trim() === 'ankitkumarbharti100@gmail.com'

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Scroll-linked blur intensity
  useEffect(() => {
    const handleScroll = () => {
      const main = document.querySelector('main')
      if (main) setScrolled(main.scrollTop > 10)
    }
    const main = document.querySelector('main')
    if (main) main.addEventListener('scroll', handleScroll, { passive: true })
    return () => { if (main) main.removeEventListener('scroll', handleScroll) }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setDropdownOpen(false)
    router.push('/login')
  }

  return (
    <header 
      className="h-14 w-full flex items-center justify-between px-5 z-30 relative select-none gpu-accel"
      style={{
        background: scrolled ? 'rgba(0, 0, 0, 0.82)' : 'rgba(0, 0, 0, 0.5)',
        backdropFilter: `blur(${scrolled ? 40 : 20}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${scrolled ? 40 : 20}px) saturate(180%)`,
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        transition: 'background 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), backdrop-filter 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      
      {/* LEFT SECTION */}
      <div className="flex items-center gap-3 flex-1">
        <Link 
          href="/dashboard" 
          className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#fa2d48] to-[#d91e36] flex items-center justify-center text-white font-black text-sm tracking-tight apple-press shadow-lg"
          style={{ boxShadow: '0 4px 15px rgba(250, 45, 72, 0.3)' }}
        >
          V
        </Link>
        {/* Mobile hamburger menu toggle */}
        {onMenuToggle && (
          <button 
            onClick={onMenuToggle} 
            className="md:hidden w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-base apple-press transition-colors duration-300"
            style={{ color: mobileMenuOpen ? '#fa2d48' : '#a1a1aa' }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        )}
        <button className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-lg apple-press transition-colors duration-300 hidden md:flex">
          🏠
        </button>
        <div className="relative w-full max-w-md group">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm transition-transform duration-300 group-focus-within:scale-110">🔍</span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="What do you want to play?" 
            className="w-full bg-white/[0.06] hover:bg-white/[0.09] text-[13px] pl-10 pr-10 py-2.5 rounded-xl border border-transparent focus:border-white/[0.12] focus:bg-white/[0.09] focus:outline-none transition-all duration-400 placeholder-zinc-500 text-white font-medium"
            style={{ transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs apple-press"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-5 text-[13px] font-semibold text-zinc-400 relative">
        <span className="hover:text-white cursor-pointer hidden md:inline transition-colors duration-300 apple-press">Premium</span>
        <span className="hover:text-white cursor-pointer hidden md:inline transition-colors duration-300 apple-press">Support</span>
        <div className="h-4 w-px bg-white/[0.06] hidden md:block" />

        {user ? (
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fa2d48] to-[#c0193a] text-white font-bold flex items-center justify-center text-xs border border-white/[0.08] uppercase tracking-wider apple-press"
              style={{ transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
            >
              {user.email ? user.email[0] : 'U'}
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                
                <div 
                  className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl py-1.5 z-20 animate-scale-in overflow-hidden"
                  style={{
                    background: 'rgba(30, 30, 32, 0.95)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div className="px-4 py-2.5 text-[11px] text-zinc-500 border-b border-white/[0.05] truncate font-medium">
                    {user.email}
                  </div>
                  
                  {/* ADMIN EXCLUSIVE LINK OPTION */}
                  {isAdmin && (
                    <Link 
                      href="/admin" 
                      onClick={() => setDropdownOpen(false)} 
                      className="block px-4 py-2.5 text-[13px] text-[#fa2d48] hover:bg-white/[0.05] font-bold border-b border-white/[0.05] transition-colors duration-200"
                    >
                      🛡️ Admin Panel
                    </Link>
                  )}
                  
                  <button className="w-full text-left px-4 py-2.5 text-[13px] text-zinc-200 hover:bg-white/[0.05] transition-colors duration-200 font-medium">
                    Account
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-[#fa2d48] hover:bg-white/[0.05] font-semibold border-t border-white/[0.05] transition-colors duration-200"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <Link href="/auth" className="hover:text-white transition-colors duration-300 apple-press">Sign up</Link>
            <Link 
              href="/login" 
              className="bg-white text-black px-5 py-2 rounded-full font-semibold text-[13px] apple-press"
              style={{ transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
            >
              Log in
            </Link>
          </>
        )}
      </div>
    </header>
  )
}