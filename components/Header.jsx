'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAudio } from '@/context/AudioContext'

/* ── Vibe wordmark logo (matches VibeLoader aesthetic) ── */
function VibeLogo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 group select-none">
      <style>{`
        @keyframes vibe-logo-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(255,45,85,0.7)); }
          50%       { filter: drop-shadow(0 0 18px rgba(255,45,85,1)); }
        }
        @keyframes eq-logo {
          0%   { height: 4px; }
          100% { height: 14px; }
        }
        .vibe-logo-text {
          background: linear-gradient(135deg, #fff 0%, #ff2d55 60%, #ff6b8a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: vibe-logo-glow 3s ease-in-out infinite;
          transition: letter-spacing 0.3s ease;
        }
        .group:hover .vibe-logo-text {
          letter-spacing: 2px;
        }
        .vibe-eq-bar {
          width: 3px;
          border-radius: 2px;
          background: linear-gradient(to top, #ff2d55, #ff8ca0);
          box-shadow: 0 0 5px rgba(255,45,85,0.8);
          animation: eq-logo 0.5s ease-in-out infinite alternate;
        }
      `}</style>

      {/* Equalizer bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '16px' }}>
        {[0.4, 0.6, 0.35, 0.55, 0.45].map((dur, i) => (
          <div
            key={i}
            className="vibe-eq-bar"
            style={{
              animationDuration: `${dur}s`,
              animationDelay: `${i * 0.07}s`,
            }}
          />
        ))}
      </div>

      {/* VIBE text */}
      <span
        className="vibe-logo-text font-black tracking-wider select-none"
        style={{
          fontSize: '20px',
          fontFamily: '"Arial Black", "Impact", "Helvetica Neue", sans-serif',
          lineHeight: 1,
        }}
      >
        VIBE
      </span>
    </Link>
  )
}

export default function Header({ onMenuToggle, mobileMenuOpen }) {
  const [user, setUser] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const { searchQuery, setSearchQuery } = useAudio()
  const supabase = createClient()
  const router = useRouter()

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

  // Scroll-linked glass intensity
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
    <>
      <style>{`
        @keyframes header-slide-in {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dropdown-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes search-glow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(255,45,85,0.4); }
          50%       { box-shadow: 0 0 0 2px rgba(255,45,85,0.7), 0 0 20px rgba(255,45,85,0.15); }
        }
        .header-wrap {
          animation: header-slide-in 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }
        .search-input:focus {
          animation: search-glow 2s ease-in-out infinite;
          border-color: rgba(255,45,85,0.6) !important;
        }
        .avatar-btn:hover {
          box-shadow: 0 0 0 2px #ff2d55, 0 0 20px rgba(255,45,85,0.4);
          transform: scale(1.06);
        }
        .nav-link {
          position: relative;
          transition: color 0.2s ease;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 50%; right: 50%;
          height: 1.5px;
          background: #ff2d55;
          border-radius: 1px;
          transition: left 0.3s ease, right 0.3s ease;
        }
        .nav-link:hover::after { left: 0; right: 0; }
        .nav-link:hover { color: #fff; }
        .dropdown-item:hover { background: rgba(255,45,85,0.08); }
        .hamburger-btn:hover { background: rgba(255,45,85,0.12); color: #ff2d55; }
      `}</style>

      <header
        className="header-wrap h-16 w-full flex items-center justify-between px-5 z-30 relative select-none"
        style={{
          background: scrolled
            ? 'rgba(7,7,8,0.95)'
            : 'rgba(7,7,8,0.75)',
          backdropFilter: `blur(${scrolled ? 48 : 24}px) saturate(180%)`,
          WebkitBackdropFilter: `blur(${scrolled ? 48 : 24}px) saturate(180%)`,
          borderBottom: scrolled
            ? '1px solid rgba(255,45,85,0.12)'
            : '1px solid rgba(255,255,255,0.05)',
          transition: 'background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease',
        }}
      >
        {/* ── LEFT: Logo + Hamburger ── */}
        <div className="flex items-center gap-3">
          <VibeLogo />

          {/* Mobile hamburger */}
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="hamburger-btn md:hidden w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: mobileMenuOpen ? '#ff2d55' : '#a1a1aa',
              }}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          )}
        </div>

        {/* ── CENTER: Search bar ── */}
        <div className="flex-1 max-w-xs sm:max-w-md md:max-w-lg mx-2 md:mx-auto">
          <div className="relative w-full group">
            {/* Search icon with pink glow on focus */}
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-sm transition-all duration-300"
              style={{ color: searchFocused ? '#ff2d55' : '#52525b' }}
            >
              🔍
            </span>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search songs, artists, videos..."
              className="search-input w-full text-[12px] pl-10 pr-9 py-2 rounded-full text-white font-medium placeholder-zinc-600 outline-none transition-all duration-300"
              style={{
                background: searchFocused ? 'rgba(20,20,22,0.95)' : 'rgba(18,18,20,0.8)',
                border: '1px solid',
                borderColor: searchFocused ? 'rgba(255,45,85,0.6)' : 'rgba(255,255,255,0.07)',
                boxShadow: searchFocused ? '0 0 0 2px rgba(255,45,85,0.15), 0 0 24px rgba(255,45,85,0.08)' : 'none',
              }}
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#ff2d55] text-xs transition-colors duration-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Nav links + User ── */}
        <div className="flex items-center gap-5 text-[13px] font-semibold relative">
          <span className="nav-link text-zinc-400 cursor-pointer hidden md:inline">Premium</span>
          <span className="nav-link text-zinc-400 cursor-pointer hidden md:inline">Support</span>
          <div className="h-4 w-px bg-white/[0.06] hidden md:block" />

          {user ? (
            <div className="relative">
              {/* Avatar button */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="avatar-btn w-8 h-8 rounded-full text-white font-bold flex items-center justify-center text-xs uppercase tracking-wider transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #ff2d55, #c0193a)',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                }}
              >
                {user.email ? user.email[0] : 'U'}
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl py-1.5 z-20 overflow-hidden"
                    style={{
                      background: 'rgba(12,12,14,0.97)',
                      backdropFilter: 'blur(40px) saturate(180%)',
                      border: '1px solid rgba(255,45,85,0.15)',
                      animation: 'dropdown-in 0.2s cubic-bezier(0.16,1,0.3,1) both',
                    }}
                  >
                    {/* Email */}
                    <div className="px-4 py-2.5 text-[11px] text-zinc-500 border-b border-white/[0.05] truncate font-medium">
                      {user.email}
                    </div>

                    {/* Pink accent bar at top of dropdown */}
                    <div style={{ height: '2px', background: 'linear-gradient(90deg, #ff2d55, transparent)', marginBottom: '4px' }} />

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="dropdown-item block px-4 py-2.5 text-[13px] text-[#ff2d55] font-bold border-b border-white/[0.05] transition-colors duration-200"
                      >
                        🛡️ Admin Panel
                      </Link>
                    )}

                    <button className="dropdown-item w-full text-left px-4 py-2.5 text-[13px] text-zinc-200 font-medium transition-colors duration-200">
                      Account
                    </button>
                    <button
                      onClick={handleLogout}
                      className="dropdown-item w-full text-left px-4 py-2.5 text-[13px] text-[#ff2d55] font-semibold border-t border-white/[0.05] transition-colors duration-200"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link href="/signup" className="nav-link text-zinc-400">Sign up</Link>
              <Link
                href="/login"
                className="px-5 py-2 rounded-full font-semibold text-[13px] text-white transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #ff2d55, #c0193a)',
                  boxShadow: '0 0 20px rgba(255,45,85,0.35)',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(255,45,85,0.6)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(255,45,85,0.35)'}
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </header>
    </>
  )
}