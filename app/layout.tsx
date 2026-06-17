import { AudioProvider } from '@/context/AudioContext'
import GlobalPlayer from '@/components/GlobalPlayer'
import './globals.css'

export const metadata = {
  title: 'Vibe - Audiobooks',
  description: 'Stream your favorite audiobooks seamlessly',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-black text-white antialiased" suppressHydrationWarning>
        <AudioProvider>
          
          <main className="min-h-screen">
            {children}
          </main>

          <GlobalPlayer />

        </AudioProvider>
      </body>
    </html>
  )
}