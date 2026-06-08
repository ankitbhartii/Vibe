import { signup } from '../auth/actions'
import Link from 'next/link'

export default async function SignupPage({ searchParams }) {
  // Await searchParams as it's a Promise in Next.js 16+
  const params = await searchParams
  const message = params?.message

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white">
      <form className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white">Vibe</h1>
          <p className="text-sm text-gray-400 mt-2">Create a new account</p>
        </div>
        
        {/* Dynamic Error Message Display */}
        {message && (
          <div className="rounded bg-red-500/10 p-3 text-center text-sm font-medium text-red-500 border border-red-500/20">
            {message}
          </div>
        )}
        
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-semibold text-gray-300">Email</label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            required 
            className="rounded bg-zinc-800 p-3 text-white outline-none focus:ring-2 focus:ring-green-500 transition-all" 
            placeholder="Enter your email"
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-semibold text-gray-300">Password</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            required 
            className="rounded bg-zinc-800 p-3 text-white outline-none focus:ring-2 focus:ring-green-500 transition-all" 
            placeholder="Min 6 characters"
          />
        </div>

        <p className="text-xs text-gray-400 pt-2">Password must be at least 6 characters long</p>
        
        <div className="flex flex-col gap-3 pt-6">
          <button 
            type="submit" 
            formAction={signup} 
            className="w-full rounded-full bg-green-500 p-3 font-bold text-black hover:bg-green-400 transition scale-100 hover:scale-105 active:scale-95"
          >
            Create Account
          </button>
          <Link 
            href="/auth"
            className="w-full rounded-full border border-gray-500 p-3 font-bold text-white hover:border-white transition text-center"
          >
            Back to Login
          </Link>
        </div>

        <div className="text-center pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">Already have an account? <Link href="/auth" className="text-green-400 hover:text-green-300 font-semibold">Log in here</Link></p>
        </div>
      </form>
    </div>
  )
}
