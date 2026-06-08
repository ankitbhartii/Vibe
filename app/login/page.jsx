'use client'
import { useState } from 'react'
import { login } from './actions'
import Link from 'next/link' 

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm p-8 bg-zinc-900 rounded-lg">
        <h1 className="text-2xl font-bold text-center mb-8">Spotify Clone</h1>
        
        <form action={login} className="flex flex-col gap-4">
          <label className="text-sm font-bold">Email</label>
          <input 
            name="email" 
            type="email" 
            placeholder="Enter your email" 
            className="w-full p-3 bg-black border border-gray-600 rounded text-white outline-none focus:border-white transition" 
            required
          />
          
          <label className="text-sm font-bold">Password</label>
          {/* Input container with relative positioning */}
          <div className="relative w-full">
            <input 
              name="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              className="w-full p-3 pr-12 bg-black border border-gray-600 rounded text-white outline-none focus:border-white transition" 
              required
            />
            
            {/* SVG Toggle Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition focus:outline-none select-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                // Eye Off Icon (Hidden state)
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                  <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                  <line x1="2" y1="2" x2="22" y2="22"/>
                </svg>
              ) : (
                // Eye On Icon (Visible state)
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          
          <button type="submit" className="w-full bg-green-500 text-black font-bold py-3 rounded-full hover:scale-105 transition mt-2">
            Log In
          </button>
        </form>

        <div className="my-6 border-b border-gray-700"></div>

        <Link href="/auth" className="block w-full text-center border border-gray-500 py-3 rounded-full font-bold hover:border-white transition">
          Sign Up
        </Link>
      </div>
    </div>
  )
}