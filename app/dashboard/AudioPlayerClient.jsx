'use client'
import { useAudio } from '@/context/AudioContext'

export default function AudioPlayerClient({ book }) {
  const { currentTrack, isPlaying, playTrack } = useAudio()
  
  // Check if this specific card is the one playing right now
  const isThisTrackPlaying = currentTrack?.id === book.id && isPlaying

  return (
    <div 
      onClick={() => playTrack(book)}
      className="bg-zinc-900/50 p-5 rounded-xl min-w-[220px] max-w-[220px] flex flex-col items-center hover:bg-zinc-800 transition-all cursor-pointer group shadow-lg border border-transparent hover:border-zinc-700"
    >
      <div className="w-40 h-40 bg-zinc-800 rounded-md shadow-2xl mb-5 flex items-center justify-center border border-zinc-700 relative overflow-hidden">
        <span className="text-zinc-600 text-6xl">🎧</span>
        
        {/* Play Overlay: Shows on hover OR when track is currently active */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
          isThisTrackPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <button className="bg-green-500 text-black rounded-full w-14 h-14 flex items-center justify-center font-bold hover:bg-green-400 hover:scale-105 transition-transform shadow-xl transform translate-y-4 group-hover:translate-y-0">
            {isThisTrackPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </div>
      
      <h3 className="font-bold text-base truncate w-full text-white">{book.title}</h3>
      <p className="text-sm text-gray-400 mb-2 truncate w-full">{book.author}</p>
    </div>
  )
}