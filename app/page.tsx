
import "./globals.css";

import { redirect } from 'next/navigation'

export default function Home() {
  // Automatically send users to the auth page when they visit localhost:3000
  redirect('/auth')
}