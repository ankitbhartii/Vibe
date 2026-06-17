import { resolveStreamUrl, clearStreamCache } from '@/utils/tidal'
import { decryptDeezer } from '@/utils/blowfish'

export const dynamic = 'force-dynamic'

const MONOCHROME_HEADERS = {
  'User-Agent': 'Monochrome/2.0.0 ( https://github.com/monochrome-music/monochrome )',
  'Origin': 'https://monochrome.tf',
  'Referer': 'https://monochrome.tf/'
}

/**
 * GET /api/play?id=<trackId>&isrc=<isrc>
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('id')
    const isrc = searchParams.get('isrc')

    if (!trackId) {
      return new Response('', { status: 400, headers: { 'Content-Type': 'audio/mp4' } })
    }

    console.log(`📡 Resolving playback for track: ${trackId} (ISRC: ${isrc || 'None'})`)
    const result = await resolveStreamUrl(trackId, 'HIGH', isrc)

    // ── Direct: 307 redirect (Qobuz CDN — CORS:* so browser loads directly) ───
    if (result.type === 'direct') {
      console.log(`🔗 Direct redirect to Qobuz CDN`)
      return Response.redirect(result.url, 307)
    }

    // ── Deezer: fetch encrypted audio, decrypt with Blowfish, stream back ─────
    if (result.type === 'deezer-proxy') {
      if (!result.blowfishKey) {
        console.error('❌ Deezer track missing blowfishKey — cannot decrypt')
        clearStreamCache(trackId)
        return new Response('', { status: 503, headers: { 'Content-Type': 'audio/mpeg' } })
      }

      console.log(`🔓 Fetching + decrypting Deezer audio for track ${trackId}`)
      const t0 = Date.now()

      // Fetch the full encrypted audio (we must buffer to decrypt)
      const upstreamRes = await fetch(result.url, {
        headers: MONOCHROME_HEADERS,
        cache: 'no-store'
      })

      if (!upstreamRes.ok) {
        console.error(`❌ Deezer upstream ${upstreamRes.status}`)
        clearStreamCache(trackId)
        return new Response('', { status: 503, headers: { 'Content-Type': 'audio/mpeg' } })
      }

      const encryptedData = Buffer.from(await upstreamRes.arrayBuffer())
      const decryptedData = decryptDeezer(encryptedData, result.blowfishKey)

      console.log(`✅ Deezer decrypted: ${encryptedData.length} → ${decryptedData.length} bytes in ${Date.now() - t0}ms`)

      // Verify the decrypted data starts with ID3 or MP3 sync word
      const isID3 = decryptedData[0] === 0x49 && decryptedData[1] === 0x44 && decryptedData[2] === 0x33
      const isMP3 = decryptedData[0] === 0xFF && (decryptedData[1] & 0xE0) === 0xE0
      if (!isID3 && !isMP3) {
        console.warn(`⚠️ Decrypted data doesn't look like MP3 (starts with ${decryptedData.slice(0,4).toString('hex')}), first byte: ${decryptedData[0].toString(16)}`)
      } else {
        console.log(`✅ Decrypted audio is valid MP3 (${isID3 ? 'ID3' : 'sync word'})`)
      }

      const totalLength = decryptedData.length

      // Handle Range requests for seeking
      const rangeHeader = request.headers.get('range')
      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
        if (match) {
          const start = parseInt(match[1], 10)
          const end = match[2] ? parseInt(match[2], 10) : totalLength - 1
          const clampedEnd = Math.min(end, totalLength - 1)
          const chunk = decryptedData.slice(start, clampedEnd + 1)
          return new Response(chunk, {
            status: 206,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': String(chunk.length),
              'Content-Range': `bytes ${start}-${clampedEnd}/${totalLength}`,
              'Accept-Ranges': 'bytes',
            }
          })
        }
      }

      return new Response(decryptedData, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(totalLength),
          'Accept-Ranges': 'bytes',
        }
      })
    }

    // ── Segmented DASH (Tidal 30s preview): stitch mp4 segments ──────────────
    if (result.type === 'segmented') {
      console.log(`📦 Stitching ${result.urls.length} DASH segments...`)
      const buffers = await Promise.all(
        result.urls.map(async (url, i) => {
          const res = await fetch(url, { cache: 'no-store' })
          if (!res.ok) throw new Error(`Segment ${i} failed: ${res.status}`)
          return Buffer.from(await res.arrayBuffer())
        })
      )
      const audio = Buffer.concat(buffers)
      const totalLength = audio.length

      const rangeHeader = request.headers.get('range')
      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
        if (match) {
          const start = parseInt(match[1], 10)
          const end = match[2] ? parseInt(match[2], 10) : totalLength - 1
          const chunk = audio.slice(start, end + 1)
          return new Response(chunk, {
            status: 206,
            headers: {
              'Content-Type': 'audio/mp4',
              'Content-Length': String(chunk.length),
              'Content-Range': `bytes ${start}-${end}/${totalLength}`,
              'Accept-Ranges': 'bytes',
            }
          })
        }
      }

      return new Response(audio, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mp4',
          'Content-Length': String(totalLength),
          'Accept-Ranges': 'bytes',
        }
      })
    }

    throw new Error(`Unknown result type: ${result.type}`)

  } catch (error) {
    console.error(`❌ /api/play error:`, error.message)
    return new Response('', {
      status: 503,
      headers: { 'Content-Type': 'audio/mpeg', 'X-Error': (error.message || '').substring(0, 100) }
    })
  }
}
