'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({ children }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        // Verifying your exact admin account email structure (100)
        if (user && user.email?.toLowerCase().trim() === 'ankitkumarbharti100@gmail.com') {
          setAuthorized(true)
        } else {
          // Send non-admins away instantly
          router.push('/dashboard') 
        }
      } catch (error) {
        console.error("Security verification failed:", error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    checkAdmin()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black text-white flex items-center justify-center font-bold tracking-widest text-xs animate-pulse">
        🛡️ VERIFYING SYSTEM LEVEL ACCESS...
      </div>
    )
  }

  return authorized ? (
    <div className="flex h-screen w-screen bg-black text-white font-sans overflow-hidden select-none">
      
      {/* EXCLUSIVE ADMIN CONTROL SIDEBAR */}
      <aside className="w-64 bg-zinc-950 p-6 flex flex-col gap-6 border-r border-zinc-800/50 h-full">
        <div>
          <div className="text-xl font-black text-red-500 tracking-tighter flex items-center gap-2">
            <span>🛡️</span> VIBE CONTROL
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5 tracking-widest font-mono">ROOT DEPLOYMENT MGR</p>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          <Link href="/admin" className="bg-zinc-900 text-white p-3 rounded-lg text-sm font-bold flex items-center gap-2 border border-zinc-800">
            🎵 Upload Center
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white p-3 rounded-lg text-sm font-bold flex items-center gap-2 transition mt-auto">
            ⬅️ Back to Web Player
          </Link>
        </nav>
      </aside>

      {/* CORE CONTROL SHEET */}
      <main className="flex-1 bg-zinc-900 overflow-y-auto">
        {children}
      </main>

    </div>
  ) : null
}