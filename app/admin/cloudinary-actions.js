'use server'

import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function getCloudinarySignature() {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000)
    
    // We specify the folder we want to upload to
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'audiobooks' },
      process.env.CLOUDINARY_API_SECRET
    )

    return { 
      success: true, 
      timestamp, 
      signature, 
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}