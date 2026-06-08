'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Header() {
  const [user, setUser] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setDropdownOpen(false)
    router.push('/login')
  }

  return (
    <header className="h-16 w-full bg-black flex items-center justify-between px-6 z-30 relative border-b border-zinc-900 select-none">
      
      {/* LEFT SECTION */}
      <div className="flex items-center gap-4 flex-1">
        <Link href="/dashboard" className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-xl">
          V
        </Link>
        <button className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-xl hover:scale-105 transition">
          🏠
        </button>
        <div className="relative w-full max-w-md">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input 
            type="text" 
            placeholder="What do you want to play?" 
            className="w-full bg-zinc-900 text-sm pl-12 pr-4 py-3 rounded-full border border-transparent hover:border-zinc-700 focus:border-white focus:outline-none transition-all placeholder-gray-400 text-white"
          />
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-6 text-sm font-bold text-zinc-300 relative">
        <span className="hover:text-white cursor-pointer hidden md:inline">Premium</span>
        <span className="hover:text-white cursor-pointer hidden md:inline">Support</span>
        <div className="h-4 w-px bg-zinc-700 hidden md:block" />

        {user ? (
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center border-2 border-zinc-800 uppercase tracking-wider transition hover:scale-105"
            >
              {user.email ? user.email[0] : 'U'}
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                
                <div className="absolute right-0 mt-2 w-52 bg-zinc-900 border border-zinc-800 rounded-md shadow-2xl py-1 z-20 animate-in fade-in duration-100">
                  <div className="px-4 py-2 text-xs text-gray-400 border-b border-zinc-800 truncate">
                    {user.email}
                  </div>
                  
                  {/* ADMIN EXCLUSIVE LINK OPTION */}
                  {isAdmin && (
                    <Link 
                      href="/admin" 
                      onClick={() => setDropdownOpen(false)} 
                      className="block px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 font-extrabold border-b border-zinc-800 transition"
                    >
                      🛡️ Admin Panel
                    </Link>
                  )}
                  
                  <button className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition">
                    Account
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-zinc-800 font-bold border-t border-zinc-800 transition"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <Link href="/auth" className="hover:scale-105 transition text-white">Sign up</Link>
            <Link href="/login" className="bg-white text-black px-6 py-3 rounded-full hover:scale-105 transition">
              Log in
            </Link>
          </>
        )}
      </div>
    </header>
  )
}