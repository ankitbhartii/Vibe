'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { getCloudinarySignature } from './cloudinary-actions'

export default function UploadForm({ genres }) {
  const supabase = createClient()
  const router = useRouter()
  
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  async function handleUpload(e) {
    e.preventDefault()
    setIsUploading(true)
    setMessage({ text: 'Authorizing upload...', type: 'loading' })

    const formData = new FormData(e.target)
    const title = formData.get('title')
    const author = formData.get('author')
    const genre_id = formData.get('genre_id')
    const file = formData.get('audio_file')

    try {
      // 1. Get secure signature from our backend
      const signData = await getCloudinarySignature()
      if (!signData.success) throw new Error('Failed to authorize upload.')

      setMessage({ text: 'Uploading track to Cloudinary...', type: 'loading' })

      // 2. Prepare the payload for Cloudinary
      const uploadData = new FormData()
      uploadData.append('file', file)
      uploadData.append('api_key', signData.apiKey)
      uploadData.append('timestamp', signData.timestamp)
      uploadData.append('signature', signData.signature)
      uploadData.append('folder', 'audiobooks')

      // Cloudinary processes audio through the /video endpoint
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/video/upload`, 
        { method: 'POST', body: uploadData }
      )
      
      const cloudinaryResponse = await uploadRes.json()
      
      if (!uploadRes.ok) throw new Error(cloudinaryResponse.error.message)

      setMessage({ text: 'Saving record to database...', type: 'loading' })

      // 3. Save the full Cloudinary URL to Supabase
      const { error: dbError } = await supabase
        .from('audiobooks')
        .insert([{ 
          title, 
          author, 
          genre_id, 
          // We save the full, secure URL directly to the database
          audio_path: cloudinaryResponse.secure_url 
        }])

      if (dbError) throw new Error(`Database Error: ${dbError.message}`)

      setMessage({ text: 'Success! Track added to Vibe library. 🎉', type: 'success' })
      e.target.reset()
      router.refresh()

    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={handleUpload} className="flex flex-col gap-5">
      {message.text && (
        <div className={`p-4 rounded-md text-sm font-bold ${
          message.type === 'success' ? 'bg-green-500/20 text-green-500' : 
          message.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-400">Title</label>
        <input name="title" type="text" required className="bg-zinc-800 p-3 rounded outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. The Martian" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-400">Author / Artist</label>
        <input name="author" type="text" required className="bg-zinc-800 p-3 rounded outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. Andy Weir" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-400">Genre</label>
        <select name="genre_id" required className="bg-zinc-800 p-3 rounded outline-none focus:ring-2 focus:ring-green-500 text-white">
          <option value="">Select a genre...</option>
          {genres.map(genre => (
            <option key={genre.id} value={genre.id}>{genre.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-400">Audio File (.mp3)</label>
        <input name="audio_file" type="file" accept="audio/*" required className="bg-zinc-800 p-3 rounded text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-black hover:file:bg-green-400" />
      </div>

      <button 
        type="submit" 
        disabled={isUploading}
        className="mt-4 w-full bg-green-500 text-black font-bold p-4 rounded-full hover:bg-green-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? 'Uploading Data...' : 'Upload Track'}
      </button>
    </form>
  )
}