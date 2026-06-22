'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { login } from './actions'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [rememberMe, setRememberMe] = useState(false)
  const [message, setMessage] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const msg = params.get('message')
      if (msg) setMessage(msg)
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.href = '/dashboard'
      } else {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [supabase])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
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
      {/* Ambient background blurs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ff2d55]/10 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Phone Mockup Frame */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[390px] h-[780px] rounded-[48px] bg-black border border-zinc-800/80 shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col p-6 pb-8 relative z-10"
      >
        {/* Dynamic Island / Notch Mockup */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-full z-50 border border-zinc-900" />

        {/* Back Button & Header */}
        <div className="flex items-center justify-between w-full mt-4 mb-8">
          <Link href="/" className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <span className="text-zinc-200 font-bold text-sm tracking-wide">Aloha</span>
          <div className="w-8 h-8 opacity-0 pointer-events-none" /> {/* Spacer */}
        </div>

        {/* Heading & Subheading */}
        <div className="flex flex-col gap-1.5 mb-6 px-1">
          <h2 className="text-[26px] font-bold text-white tracking-tight">Login Now To Your Account.</h2>
          <p className="text-zinc-500 text-[13px]">Access your account to manage settings, explore features</p>
        </div>

        {/* Error Message Display */}
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl bg-red-500/10 p-3.5 text-center text-xs font-semibold text-red-500 border border-red-500/20"
          >
            ⚠️ {message}
          </motion.div>
        )}

        {/* The Form */}
        <form action={login} className="flex flex-col gap-4 flex-1">
          {/* Email field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 pl-1">Email</label>
            <input 
              name="email" 
              type="email" 
              placeholder="jamesschleifer@gmail.com" 
              required
              className="w-full p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl text-white outline-none focus:border-[#ff2d55] hover:border-zinc-700 transition duration-300 text-sm"
            />
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 pl-1">Password</label>
            <div className="relative w-full">
              <input 
                name="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••••••" 
                required
                className="w-full p-3.5 pr-12 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl text-white outline-none focus:border-[#ff2d55] hover:border-zinc-700 transition duration-300 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition focus:outline-none select-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="w-full bg-[#ff2d55] text-white font-bold py-3.5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition mt-2 cursor-pointer shadow-lg shadow-[#ff2d55]/20 hover:bg-[#fc3c62]"
          >
            Login
          </button>

          {/* Options Row: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between px-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-400 select-none">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="hidden"
              />
              <span className={`w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center transition-all ${rememberMe ? 'bg-[#ff2d55] border-[#ff2d55]' : 'bg-transparent'}`}>
                {rememberMe && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-2.5 h-2.5 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </span>
              <span>Remember me</span>
            </label>

            <Link href="/login?message=Password reset link sent to your email" className="text-[#ff2d55] hover:text-[#fc3c62] transition font-semibold">
              Forgot password?
            </Link>
          </div>
        </form>

        {/* Divider OR */}
        <div className="my-5 flex items-center gap-3 text-zinc-600 text-xs px-2">
          <div className="h-px bg-zinc-800 flex-1"></div>
          <span className="font-semibold tracking-wider">OR</span>
          <div className="h-px bg-zinc-800 flex-1"></div>
        </div>

        {/* Social Logins */}
        <div className="flex flex-col gap-3 px-1 mb-6">
          <button 
            onClick={handleGoogleLogin} 
            className="w-full bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-200 py-3 rounded-2xl font-bold flex items-center justify-center gap-3 transition text-sm cursor-pointer"
          >
            {/* Google Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 8 12.526a5.99 5.99 0 0 1 5.99-5.99c2.41 0 4.28 1.01 5.3 1.954l3.22-3.22C20.53 3.372 17.57 2 13.99 2 8.16 2 3.43 6.73 3.43 12.56s4.73 10.56 10.56 10.56c5.83 0 10.22-4.114 10.22-10.56 0-.708-.08-1.254-.25-1.745h-9.97z" />
            </svg>
            <span>Sign in with Google</span>
          </button>
          
          <button 
            onClick={() => router.push('/login?message=Apple login is currently not available')} 
            className="w-full bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-200 py-3 rounded-2xl font-bold flex items-center justify-center gap-3 transition text-sm cursor-pointer"
          >
            {/* Apple Icon */}
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.1.08.2.1.28.1 1.01 0 2.1-1.56 2.53-2.43z" />
            </svg>
            <span>Continue with Apple</span>
          </button>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-zinc-500 mt-auto">
          <span>Don't have an account? </span>
          <Link href="/signup" className="text-[#ff2d55] hover:text-[#fc3c62] transition font-bold">
            Sign Up
          </Link>
        </div>
      </motion.div>
    </div>
  )
}