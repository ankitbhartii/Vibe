'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { signup } from './actions'
import Link from 'next/link'

export default function AuthPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
  }

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm p-8 bg-black">
        <h1 className="text-4xl font-bold text-center mb-8">Sign up to start listening</h1>

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-bold">Email address</label>
            <input 
              type="email" 
              placeholder="name@domain.com"
              className="w-full p-3 bg-zinc-900 border border-gray-500 rounded hover:border-white focus:border-white outline-none"
              onChange={(e) => setEmail(e.target.value)}
            />
            <button 
              onClick={() => setStep(2)} 
              className="w-full bg-green-500 text-black font-bold py-3 rounded-full hover:scale-105 transition"
            >
              Next
            </button>
          </div>
        ) : (
          <form action={signup} className="flex flex-col gap-4">
            <input name="email" type="hidden" value={email} />
            <label className="text-sm font-bold">Create a password</label>
            <input 
              name="password" 
              type="password" 
              placeholder="Password" 
              className="w-full p-3 bg-zinc-900 border border-gray-500 rounded outline-none" 
            />
            <button type="submit" className="w-full bg-green-500 text-black font-bold py-3 rounded-full hover:scale-105 transition">
              Sign Up
            </button>
          </form>
        )}

        <div className="my-8 flex items-center gap-2 text-gray-400 text-sm">
          <div className="h-px bg-gray-600 flex-1"></div> or <div className="h-px bg-gray-600 flex-1"></div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleGoogleLogin} 
            className="w-full border border-gray-500 py-3 rounded-full font-bold hover:border-white transition"
          >
            Sign up with Google
          </button>
        </div>

        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="text-white underline hover:text-green-500 transition font-bold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}