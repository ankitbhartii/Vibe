// utils/tidal.js
// Standard Tidal public web client keys used by Monochrome
const BROWSER_CLIENT_ID = 'txNoH4kkV41MfH25';
const BROWSER_CLIENT_SECRET = 'dQjy0MinCEvxi1O4UmxvxWnDjt4cgHBPw8ll6nYBk98=';

let cachedToken = null;
let tokenExpiry = 0;

// ============================================================
// In-memory stream URL cache to avoid repeated API lookups.
// Key: trackId (string). Value: { url, type, headers, resolvedAt }
// TTL: 3 hours (Deezer/Qobuz signed URLs typically expire after ~24h)
// ============================================================
const streamCache = new Map();
const STREAM_CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

function getCachedStream(trackId) {
  const entry = streamCache.get(String(trackId));
  if (!entry) return null;
  if (Date.now() - entry.resolvedAt > STREAM_CACHE_TTL_MS) {
    streamCache.delete(String(trackId));
    return null;
  }
  return entry;
}

function setCachedStream(trackId, result) {
  streamCache.set(String(trackId), { ...result, resolvedAt: Date.now() });
}

/** Evicts a single track from the stream cache (call when upstream stream returns an error) */
export function clearStreamCache(trackId) {
  streamCache.delete(String(trackId));
  console.log(`🗑️ Cache evicted for track ${trackId}`);
}


/**
 * Retrieves the Tidal access token using Client Credentials grant.
 * Caches the token in-memory to prevent repeated authentications.
 */
export async function getTidalToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  console.log('📡 Fetching new Tidal OAuth Token...');
  const params = new URLSearchParams({
    client_id: BROWSER_CLIENT_ID,
    client_secret: BROWSER_CLIENT_SECRET,
    grant_type: 'client_credentials',
  });

  const res = await fetch('https://auth.tidal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${BROWSER_CLIENT_ID}:${BROWSER_CLIENT_SECRET}`).toString('base64'),
    },
    body: params,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Failed to obtain Tidal token: ${res.status} ${res.statusText} - ${errorText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Expire 60 seconds early to prevent edge cases
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  console.log('✅ Tidal OAuth Token refreshed successfully.');
  return cachedToken;
}

/**
 * Replaces Tidal API domain names with Monochrome's CORS proxy.
 */
export function wrapTidalUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url
    .replace('openapi.tidal.com', 'tidal-proxy.monochrome.tf/openapi')
    .replace('api.tidal.com', 'tidal-proxy.monochrome.tf/api');
}

/**
 * Helper to fetch Tidal endpoints through the CORS proxy with appropriate headers.
 */
export async function fetchTidal(path, queryParams = {}) {
  const token = await getTidalToken();
  const urlObj = new URL(path.startsWith('http') ? path : `https://api.tidal.com/v1${path}`);
  
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      urlObj.searchParams.set(k, String(v));
    }
  });

  const wrappedUrl = wrapTidalUrl(urlObj.toString());

  const res = await fetch(wrappedUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json, application/vnd.api+json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Tidal API fetch failed: ${res.status} ${res.statusText} - ${errorText}`);
  }

  return res.json();
}

/**
 * Searches Tidal for tracks and maps the response to our normalized format.
 */
export async function searchTracks(query, limit = 25) {
  try {
    const response = await fetchTidal('/search/tracks', {
      query: query,
      limit: limit,
      countryCode: 'US',
    });

    const items = response?.items || [];
    return items.map((track) => {
      const coverId = track?.album?.cover;
      const formattedCoverId = coverId ? String(coverId).replace(/-/g, '/') : null;
      const imageUrl = formattedCoverId 
        ? `https://resources.tidal.com/images/${formattedCoverId}/320x320.jpg`
        : null;

      return {
        id: `tidal_${track.id}`,
        title: track.title || 'Unknown Track',
        artist: track.artist?.name || track.artists?.[0]?.name || 'Unknown Artist',
        album: track.album?.title || '',
        image_url: imageUrl,
        audio_url: `/api/play?id=${track.id}${track.isrc ? `&isrc=${track.isrc}` : ''}`, // Route through play endpoint with ISRC
        source: 'tidal',
        duration: track.duration,
      };
    });
  } catch (error) {
    console.error('❌ Error in Tidal searchTracks service:', error);
    return [];
  }
}

/**
 * Helper to fetch a URL with a timeout limit to prevent hanging.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Monochrome headers required for Deezer proxy
const MONOCHROME_HEADERS = {
  'User-Agent': 'Monochrome/2.0.0 ( https://github.com/monochrome-music/monochrome )',
  'Origin': 'https://monochrome.tf',
  'Referer': 'https://monochrome.tf/'
};

/**
 * Fetches stream URL for full tracks via Qobuz's public worker fallback using the track's ISRC.
 * Qobuz CDN URLs have CORS: * so they can be played directly in the browser.
 */
async function resolveQobuzStream(isrc) {
  if (!isrc) return null;
  const qobuzBaseUrl = 'https://qobuz.kennyy.com.br';
  try {
    const searchUrl = `${qobuzBaseUrl}/api/get-music?q=${encodeURIComponent(isrc)}&offset=0`;
    console.log(`📡 Searching Qobuz for ISRC: ${isrc}`);
    const res = await fetchWithTimeout(searchUrl, { cache: 'no-store' }, 5000);
    if (!res.ok) return null;
    
    const searchData = await res.json();
    const qobuzItems = searchData.data?.tracks?.items || [];
    console.log(`📡 Qobuz search returned ${qobuzItems.length} items`);
    if (qobuzItems.length === 0) return null;
    
    const qobuzTrack = qobuzItems.find(t => t.isrc?.toLowerCase() === isrc.toLowerCase()) || qobuzItems[0];
    console.log(`🎯 Found Qobuz Track: ${qobuzTrack.title} (ID: ${qobuzTrack.id})`);
    
    // Try to resolve stream URL — MP3 quality is most compatible
    const qualities = ['5', '6', '7'];
    for (const qual of qualities) {
      const downloadUrl = `${qobuzBaseUrl}/api/download-music?track_id=${qobuzTrack.id}&quality=${qual}`;
      const streamRes = await fetchWithTimeout(downloadUrl, { cache: 'no-store' }, 5000);
      if (streamRes.ok) {
        const streamData = await streamRes.json();
        if (streamData.success && streamData.data?.url) {
          console.log(`✅ Qobuz stream URL obtained with quality: ${qual}`);
          return streamData.data.url; // Directly browser-accessible (CORS: *)
        }
      }
    }
  } catch (err) {
    console.error(`⚠️ Qobuz stream failed for ISRC ${isrc}:`, err.message);
  }
  return null;
}

/**
 * Fetches stream info from Deezer fallback API for full tracks using the track's ISRC.
 * Deezer audio proxy URLs require Monochrome headers and must be proxied server-side.
 */
async function resolveDeezerStream(isrc) {
  if (!isrc) return null;
  const deezerBaseUrl = 'https://dzr.tabs-vs-spaces.wtf';
  try {
    const searchUrl = `${deezerBaseUrl}/track/?isrc=${encodeURIComponent(isrc)}&format=MP3_128`;
    console.log(`📡 Searching Deezer for ISRC: ${isrc}`);
    const res = await fetchWithTimeout(searchUrl, {
      headers: MONOCHROME_HEADERS,
      cache: 'no-store'
    }, 7000);
    if (!res.ok) return null;
    
    const searchData = await res.json();
    if (searchData && searchData.audioUrl && searchData.blowfishKey) {
      console.log(`✅ Deezer stream URL obtained (blowfishKey: ${searchData.blowfishKey.substring(0,8)}...)`);
      return {
        audioUrl: searchData.audioUrl,
        blowfishKey: searchData.blowfishKey, // ← CRITICAL: needed for decryption
        title: searchData.title,
        artist: searchData.artist
      };
    }
    if (searchData && searchData.audioUrl) {
      console.warn('⚠️ Deezer returned audioUrl but NO blowfishKey — audio will be encrypted');
      return {
        audioUrl: searchData.audioUrl,
        blowfishKey: null,
        title: searchData.title,
        artist: searchData.artist
      };
    }
  } catch (err) {
    console.error(`⚠️ Deezer stream failed for ISRC ${isrc}:`, err.message);
  }
  return null;
}

/**
 * Resolves a Tidal track ID to a streamable audio URL.
 * 
 * Resolution priority:
 * 1. In-memory cache (instant)
 * 2. Qobuz (CORS: * → direct browser playback, no proxy needed)
 * 3. Deezer (requires server proxy, but reliable)
 * 4. Tidal 30s preview (fallback)
 */
export async function resolveStreamUrl(trackId, quality = 'HIGH', passedIsrc = null) {
  // 0. Check in-memory cache first
  const cached = getCachedStream(trackId);
  if (cached) {
    const age = Math.round((Date.now() - cached.resolvedAt) / 1000);
    console.log(`⚡ Cache HIT for track ${trackId} (${age}s old, type: ${cached.type})`);
    return cached;
  }

  try {
    let isrc = passedIsrc;

    // 1. Fetch track metadata only if ISRC code is not already passed
    if (!isrc) {
      console.log(`📡 Fetching metadata for Tidal track: ${trackId}`);
      try {
        const trackMetadata = await fetchTidal(`/tracks/${trackId}`, { countryCode: 'US' });
        isrc = trackMetadata?.isrc;
      } catch (err) {
        console.warn(`⚠️ Failed to fetch Tidal track metadata for ID ${trackId}:`, err.message);
      }
    }
    
    // 2. Try Qobuz and Deezer stream resolution in parallel for the full song
    if (isrc) {
      console.log(`📡 Resolving streams in parallel for ISRC: ${isrc}...`);
      const startTime = Date.now();
      
      // Qobuz: returns a direct URL (CORS: *), marked as 'direct' — browser loads it without proxy
      const qobuzPromise = resolveQobuzStream(isrc).then(url => {
        if (url) return { type: 'direct', url };
        throw new Error('Qobuz failed');
      });

      // Deezer: returns URL that requires Monochrome headers, must proxy through /api/play
      const deezerPromise = resolveDeezerStream(isrc).then(info => {
        if (info) return {
          type: 'deezer-proxy',
          url: info.audioUrl,
          blowfishKey: info.blowfishKey, // ← for server-side Blowfish decryption
          headers: MONOCHROME_HEADERS
        };
        throw new Error('Deezer failed');
      });

      try {
        const firstSuccess = await Promise.any([qobuzPromise, deezerPromise]);
        console.log(`✅ Stream resolved in ${Date.now() - startTime}ms via ${firstSuccess.type}`);
        setCachedStream(trackId, firstSuccess);
        return firstSuccess;
      } catch (err) {
        console.warn(`⚠️ Both Qobuz and Deezer failed in ${Date.now() - startTime}ms. Falling back to Tidal preview.`);
      }
    }
    
    // 3. Fallback to existing Tidal playback info preview streaming
    console.log(`⚠️ Falling back to Tidal 30s preview manifest resolution for track: ${trackId}`);
    const url = `/tracks/${trackId}/playbackinfo`;
    const data = await fetchTidal(url, {
      audioquality: quality,
      playbackmode: 'STREAM',
      assetpresentation: 'FULL',
      countryCode: 'US',
      immersiveAudio: 'false',
    });

    const manifest = data?.manifest;
    if (!manifest) throw new Error('Playback info did not return a manifest');

    // Decode manifest from base64
    const decodedManifest = Buffer.from(manifest, 'base64').toString('utf-8');
    
    // Check if it's a segmented DASH manifest
    if (decodedManifest.includes('<SegmentTemplate')) {
      const initMatch = decodedManifest.match(/initialization="(.*?)"/);
      const mediaMatch = decodedManifest.match(/media="(.*?)"/);

      if (!initMatch || !mediaMatch) {
        throw new Error('DASH SegmentTemplate missing initialization or media attributes');
      }

      const initUrl = initMatch[1].replace(/&amp;/g, '&');
      const mediaTemplate = mediaMatch[1].replace(/&amp;/g, '&');

      // Calculate total segments from SegmentTimeline
      const timelineMatch = decodedManifest.match(/<SegmentTimeline>([\s\S]*?)<\/SegmentTimeline>/);
      let totalSegments = 0;
      if (timelineMatch) {
        const sTags = timelineMatch[1].match(/<S\s+[^>]*>/g) || [];
        sTags.forEach(sTag => {
          const rMatch = sTag.match(/r="(\d+)"/);
          const r = rMatch ? parseInt(rMatch[1], 10) : 0;
          totalSegments += (1 + r);
        });
      }

      if (totalSegments === 0) {
        totalSegments = 8; // standard default fallback
      }

      const segmentUrls = [initUrl];
      for (let i = 1; i <= totalSegments; i++) {
        segmentUrls.push(mediaTemplate.replace('$Number$', String(i)));
      }

      const result = { type: 'segmented', urls: segmentUrls };
      setCachedStream(trackId, result);
      return result;
    }

    let streamUrl = null;

    if (decodedManifest.includes('<MPD') || decodedManifest.includes('<BaseURL>')) {
      // Parse XML manifest (MPEG-DASH format with direct BaseURL)
      const match = decodedManifest.match(/<BaseURL>(.*?)<\/BaseURL>/s);
      if (match && match[1]) {
        streamUrl = match[1].trim().replace(/&amp;/g, '&');
      } else {
        throw new Error('BaseURL tag not found in XML manifest');
      }
    } else {
      // Parse JSON manifest
      const parsedManifest = JSON.parse(decodedManifest);
      if (parsedManifest.urls && Array.isArray(parsedManifest.urls)) {
        streamUrl = parsedManifest.urls[0];
      } else if (parsedManifest.url) {
        streamUrl = parsedManifest.url;
      }
    }

    if (!streamUrl) throw new Error('Could not find stream URL in decoded manifest');

    // Use Monochrome's public audio proxy to bypass CORS
    const proxyBase = 'https://audio-proxy.binimum.org/proxy-audio/';
    const result = {
      type: 'direct',
      url: `${proxyBase}${streamUrl}`,
    };
    setCachedStream(trackId, result);
    return result;
  } catch (error) {
    console.error(`❌ Error resolving Tidal track ${trackId} stream:`, error);
    throw error;
  }
}
