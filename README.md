# Vibe Music Player 🎵

Vibe is a premium, dark-mode, serverless-compatible instant music player built with Next.js, featuring real-time JioSaavn integrations, dynamic stream decryption, and custom playlist synchronization via Supabase.

🌐 **Live Production Link:** [https://vibeee.site](https://vibeee.site)

---

## ⚙️ How It Works (Architecture & Workflow)

Vibe operates as a lightweight Next.js application that eliminates local downloading and catalog latency by utilizing on-the-fly decryption and direct CDN streaming.

```
                  +-----------------------------------+
                  |             Next.js UI            |
                  |  - Home Carousels (Trending)      |
                  |  - Dynamic Tabbed Search          |
                  |  - Album/Playlist drawers         |
                  +-----------------+-----------------+
                                    |
                    (1) API Queries | (4) Streams Audio
                                    v
                  +-----------------+-----------------+
                  |       Next.js API Gateway         |
                  |  - Decrypts DES-ECB on-the-fly    |
                  |  - Redirects (307) to direct CDN   |
                  +-----------------+-----------------+
                                    |
                 (2) JSON Metadata  | (3) 307 Redirect Location
                                    v
                  +-----------------+-----------------+
                  |       JioSaavn CDN Servers        |
                  |  - Direct 320kbps audio files     |
                  +-----------------------------------+
```

### 1. Unified Home & Search Feeds
* When you open the dashboard, Vibe calls `/api/saavn/home` to fetch `webapi.getLaunchData` containing Trending Songs, New Album Releases, Featured Playlists, and Charts.
* When you type in the search bar, `/api/saavn/search` queries JioSaavn's search index in parallel (songs, albums, and playlists) to provide instant recommendations.

### 2. Real-time Album Details
* Clicking any Album or Playlist card triggers `/api/saavn/album?id=[id]` or `/api/saavn/playlist?id=[id]`.
* The server retrieves containing track lists and returns normalized track objects, complete with high-resolution artwork and dynamic stream URLs.

### 3. On-The-Fly Decryption & Streaming (`/api/saavn/play/[id]`)
* Clicking play sets the browser `<audio>` element's source to `/api/saavn/play/[id]`.
* Next.js fetches the `encrypted_media_url` for the track and decrypts it using **DES-ECB** with the static key `38346591`.
* It upgrades the quality suffix from the default `_96` or `_160` to `_320` to resolve the high-quality **320kbps** audio stream.
* The API responds with a `307 Temporary Redirect` to the decrypted `.mp4` CDN link. The browser follows this redirect and streams the audio directly with 0% server bandwidth impact.

### 4. Supabase Favorite Syncing
* Tracks you favorite (`💚`) or add to custom playlists are stored in a Supabase PostgreSQL database.
* Your Liked Songs library and Custom Playlists render these stored items and trigger streaming dynamically.

---

## 🛠️ Local Development & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root folder and add the following credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://uwhvooramgjmlwlajdxp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_q5GIll768j1j15scMXek0g_zCP-JmCJ
ADMIN_EMAIL=ankitkumarbharti100@gmail.com

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dox9qtrrt
CLOUDINARY_API_KEY=885215217987778
CLOUDINARY_API_SECRET=JpAApDbGSpF1kzhH6kNX437SszI

# Client Id
NEXT_PUBLIC_MUSICAPI_CLIENT_ID="ee4ea26f-682a-47ac-a00e-51d8bb0a8ece"
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
