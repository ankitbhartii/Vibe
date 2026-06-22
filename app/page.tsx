'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function WelcomePage() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [dragProgress, setDragProgress] = useState(0)
  const [swipeSuccess, setSwipeSuccess] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  // Redirect to dashboard if session exists
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      } else {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [supabase, router])

  const handleDrag = (event: any, info: any) => {
    const track = trackRef.current
    const thumb = thumbRef.current
    if (track && thumb) {
      const trackWidth = track.clientWidth
      const thumbWidth = thumb.clientWidth
      const maxDrag = trackWidth - thumbWidth - 12 // accounting for padding/borders
      const currentDrag = info.offset.x
      const progress = Math.min(1, Math.max(0, currentDrag / maxDrag))
      setDragProgress(progress)

      if (progress >= 0.95 && !swipeSuccess) {
        setSwipeSuccess(true)
        // Springy feedback transition before redirect
        setTimeout(() => {
          router.push('/login')
        }, 150)
      }
    }
  }

  const handleDragEnd = () => {
    if (dragProgress < 0.95) {
      setDragProgress(0)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="text-xs font-bold font-mono text-zinc-500 animate-pulse">
          ⚡ CHECKING VIBE SESSION...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070708] flex items-center justify-center overflow-hidden font-sans relative p-4 select-none">
      {/* Outer ambient blur background for premium desktop preview */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ff2d55]/10 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Phone Mockup Frame wrapper */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[390px] h-[780px] rounded-[48px] bg-black border border-zinc-800/80 shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col justify-between p-6 pb-8 relative z-10"
      >
        {/* Dynamic Island / Notch Mockup */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-full z-50 border border-zinc-900 flex items-center justify-center" />

        {/* Top Image Section */}
        <div className="w-full h-[52%] rounded-[36px] overflow-hidden relative mt-2 group border border-zinc-900">
          <motion.img 
            src="/welcome_girl.png" 
            alt="Vibe Music Welcome"
            className="w-full h-full object-cover"
            initial={{ scale: 1.1, filter: 'blur(10px)' }}
            animate={{ scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        </div>

        {/* Text Section */}
        <div className="flex flex-col gap-3 px-2">
          {/* Music Tag */}
          <div className="flex items-center gap-2 text-[#ff2d55] font-semibold text-sm tracking-wide">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h6V3h-8z" />
            </svg>
            <span>Jungle Pulse</span>
          </div>

          {/* Heading */}
          <h1 className="text-[34px] leading-[40px] font-bold text-white tracking-tight">
            Desires Come <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#ff2d55]/90">
              Alive in Sound
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-zinc-500 text-[14px] leading-relaxed max-w-[90%]">
            Step into a world where your desires come alive in sound. Explore millions of songs with premium acoustics.
          </p>
        </div>

        {/* Slider Action Section */}
        <div className="px-2 pt-4">
          <div 
            ref={trackRef}
            className="w-full h-[64px] rounded-full bg-zinc-900/80 border border-zinc-800/60 p-1 flex items-center relative overflow-hidden"
          >
            {/* Slide message */}
            <motion.span 
              style={{ opacity: 1 - dragProgress }}
              className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm font-medium pl-8 pointer-events-none select-none tracking-wide"
            >
              Swipe to Get Started
            </motion.span>

            {/* Slider track background overlay that fills on drag */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-[#ff2d55]/10 rounded-l-full pointer-events-none transition-all duration-75"
              style={{ width: `${dragProgress * 100}%` }}
            />

            {/* The draggable thumb */}
            <motion.div
              ref={thumbRef}
              drag="x"
              dragConstraints={{ left: 0, right: 300 }} // dynamically constrained onDrag
              dragElastic={0.02}
              dragMomentum={false}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              animate={dragProgress === 0 ? { x: 0 } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ x: dragProgress === 0 ? 0 : undefined }}
              className="w-[54px] h-[54px] rounded-full bg-[#ff2d55] flex items-center justify-center cursor-grab active:cursor-grabbing text-white shadow-lg shadow-[#ff2d55]/30 z-20 hover:scale-105 active:scale-95 transition-transform"
            >
              <AnimatePresence mode="wait">
                {swipeSuccess ? (
                  <motion.svg 
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="w-5 h-5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </motion.svg>
                ) : (
                  <motion.svg 
                    key="arrows"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-5 h-5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}