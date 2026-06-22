'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import VibeLoader from '@/components/VibeLoader'

export default function WelcomePage() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [dragProgress, setDragProgress] = useState(0)
  const [swipeSuccess, setSwipeSuccess] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  // 3D Parallax Tilt Effect for Desktop Hover
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    // Max tilt is 8 degrees
    setRotateX(-y / (rect.height / 2) * 8)
    setRotateY(x / (rect.width / 2) * 8)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  // Show VibeLoader for at least 3s so full animation always plays
  useEffect(() => {
    const checkSession = async () => {
      // Run session check and 3s minimum timer in parallel
      const [{ data: { session } }] = await Promise.all([
        supabase.auth.getSession(),
        new Promise<void>(resolve => setTimeout(resolve, 3000))
      ])
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
      const maxDrag = trackWidth - thumbWidth - 12
      const currentDrag = info.offset.x
      const progress = Math.min(1, Math.max(0, currentDrag / maxDrag))
      setDragProgress(progress)

      if (progress >= 0.95 && !swipeSuccess) {
        setSwipeSuccess(true)
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
    return <VibeLoader />
  }

  return (
    <div className="min-h-screen bg-[#070708] flex items-center justify-center overflow-hidden font-sans relative p-4 select-none">
      {/* Inline styles for custom keyframe animations */}
      <style>{`
        @keyframes bounce-eq {
          0% { height: 4px; }
          100% { height: 16px; }
        }
        @keyframes pulse-glow-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes background-flow {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
          50% { transform: translate(-45%, -55%) rotate(180deg) scale(1.1); }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); }
        }
      `}</style>

      {/* Floating ambient glow circles with flow animation */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ff2d55]/8 rounded-full blur-[150px] pointer-events-none z-0" 
        style={{ animation: 'background-flow 20s infinite linear' }}
      />
      <div 
        className="absolute top-[20%] left-[30%] w-[450px] h-[450px] bg-purple-600/6 rounded-full blur-[130px] pointer-events-none z-0"
        style={{ animation: 'background-flow 25s infinite linear reverse' }}
      />

      {/* Phone Mockup Frame wrapper with 3D Hover Parallax Tilt */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: rotateX,
          rotateY: rotateY,
          transformStyle: "preserve-3d",
          perspective: 1000
        }}
        className="w-full max-w-[390px] h-[780px] rounded-[48px] bg-black border border-zinc-800/80 shadow-[0_32px_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col justify-between p-6 pb-8 relative z-10 transition-transform duration-200 ease-out"
      >
        {/* Dynamic Island / Notch Mockup */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-full z-50 border border-zinc-900 flex items-center justify-center" />

        {/* Top Image Section - with parallax scale zoom on swipe progress */}
        <div className="w-full h-[52%] rounded-[36px] overflow-hidden relative mt-2 group border border-zinc-900/60 shadow-[inset_0_1px_12px_rgba(255,255,255,0.05)]">
          <motion.img 
            src="/welcome_girl.png" 
            alt="Vibe Music Welcome"
            className="w-full h-full object-cover origin-center"
            style={{ scale: 1 + dragProgress * 0.08 }}
            initial={{ scale: 1.1, filter: 'blur(10px)' }}
            animate={{ scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          {/* Subtle gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
        </div>

        {/* Text Section */}
        <div className="flex flex-col gap-3 px-2">
          {/* Vibe Music Animated Equalizer Tag */}
          <div className="flex items-center gap-2.5 text-[#ff2d55] font-bold text-sm tracking-widest uppercase">
            {/* 4-Bar Audio Equalizer */}
            <div className="flex items-end gap-[3px] h-4 w-4 text-[#ff2d55] mb-0.5">
              <span className="w-[2.5px] bg-[#ff2d55] rounded-full" style={{ animation: 'bounce-eq 0.8s ease-in-out infinite alternate' }} />
              <span className="w-[2.5px] bg-[#ff2d55] rounded-full" style={{ animation: 'bounce-eq 0.5s ease-in-out infinite alternate 0.25s' }} />
              <span className="w-[2.5px] bg-[#ff2d55] rounded-full" style={{ animation: 'bounce-eq 0.7s ease-in-out infinite alternate 0.12s' }} />
              <span className="w-[2.5px] bg-[#ff2d55] rounded-full" style={{ animation: 'bounce-eq 0.6s ease-in-out infinite alternate 0.35s' }} />
            </div>
            <span>Vibe</span>
          </div>

          {/* Heading */}
          <h1 className="text-[34px] leading-[40px] font-bold text-white tracking-tight">
            Desires Come <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#ff2d55]">
              Alive in Sound
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-zinc-500 text-[14px] leading-relaxed max-w-[95%]">
            Step into a world where your desires come alive in sound. Explore millions of songs with premium acoustics.
          </p>
        </div>

        {/* Slider Action Section */}
        <div className="px-2 pt-4">
          <div 
            ref={trackRef}
            className="w-full h-[64px] rounded-full bg-zinc-900/80 border border-zinc-800/60 p-1.5 flex items-center relative overflow-hidden shadow-inner"
          >
            {/* Slide message fading out as user drags */}
            <motion.span 
              style={{ opacity: 1 - dragProgress * 1.5 }}
              className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm font-medium pl-8 pointer-events-none select-none tracking-wide"
            >
              Swipe to Get Started
            </motion.span>

            {/* Slider track background color overlay changing opacity on drag */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-[#ff2d55]/15 rounded-l-full pointer-events-none transition-all duration-75"
              style={{ width: `${dragProgress * 100}%` }}
            />

            {/* The draggable thumb */}
            <motion.div
              ref={thumbRef}
              drag="x"
              dragConstraints={{ left: 0, right: 300 }} 
              dragElastic={0.02}
              dragMomentum={false}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              animate={dragProgress === 0 ? { x: 0 } : undefined}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="w-[50px] h-[50px] rounded-full bg-[#ff2d55] flex items-center justify-center cursor-grab active:cursor-grabbing text-white shadow-lg shadow-[#ff2d55]/30 z-20 hover:scale-105 active:scale-95 transition-transform relative"
            >
              {/* Idle Pulsing Glow Outer Ring - inactive when drag starts */}
              {dragProgress === 0 && (
                <div 
                  className="absolute inset-0 rounded-full border-2 border-[#ff2d55] pointer-events-none z-0"
                  style={{ animation: 'pulse-glow-ring 1.8s infinite cubic-bezier(0.215, 0.61, 0.355, 1)' }}
                />
              )}

              <AnimatePresence mode="wait">
                {swipeSuccess ? (
                  <motion.svg 
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="w-5 h-5 z-10" 
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
                    className="w-5 h-5 z-10" 
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