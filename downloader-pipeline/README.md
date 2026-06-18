# Music Downloader & Streaming Pipeline (JioSaavn Clone Backend)

A production-ready, self-hosted music downloading and cataloging stack. Submit music URLs from JioSaavn, Tidal, or Qobuz, queue the download, normalize audio levels, tag metadata using MusicBrainz database, and stream via Navidrome (Subsonic-compatible).

## Architecture Stack

*   **Nginx**: Reverse proxy, SSL termination, and strict rate-limiting.
*   **FastAPI**: Link validation and BullMQ job generator.
*   **Redis + BullMQ**: Background queue processing with failover and job retry management.
*   **NodeJS Worker**: Oversees CLI downloader executables, processes audio normalizations, and runs catalog tags.
*   **saavn-cli**: Fetches audio files from JioSaavn.
*   **streamrip**: Downloads high-fidelity tracks from Tidal & Qobuz.
*   **FFmpeg (ffmpeg-normalize)**: Adjusts volume tracks using standard EBU R128 profiles.
*   **Beets**: Queries MusicBrainz database to correct metadata, fetch lyrics/cover art, rename folders, and write tags.
*   **Navidrome**: Exposes a responsive Web UI and Subsonic streaming API.

---

## Folder Structure

```
downloader-pipeline/
├── backend-api/           # FastAPI application
├── download-worker/       # NodeJS BullMQ worker
├── beets/                 # Beets configuration & library database
├── nginx/                 # Nginx proxy profiles
├── streamrip/             # streamrip configs & user tokens
├── music/                 # Output folder for organized music files (mount)
├── navidrome_data/        # Navidrome database & cache (mount)
└── docker-compose.yml     # Service Orchestrations
```

---

## Setup & Running

### 1. Prerequisites
Ensure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.

### 2. Startup
Run the entire stack using Docker Compose:

```bash
docker compose up -d --build
```

Nginx will spin up and expose the services:
*   **Navidrome Stream Interface**: `http://localhost/`
*   **Download Gateway API**: `http://localhost/api/`

---

## Configuration & Credentials

### 1. Beets Configuration
The Beets config is located at `./beets/config.yaml`. By default, it runs in non-interactive (quiet) mode. If Beets fails to find a high-confidence match on MusicBrainz, it automatically imports the tracks "as-is" to prevent queue blockage. You can modify this configuration locally, and the container will reflect the changes.

### 2. Authenticating Streamrip (Tidal / Qobuz)
For downloading high-fidelity tracks via Tidal/Qobuz, you must configure authentication.

#### Method A: Direct Command Line (Recommended)
Tidal uses OAuth authentication. You can trigger it inside the running worker container:
```bash
docker exec -it music-worker rip login tidal
```
Copy the URL printed in the terminal, open it in your web browser, log in, and authorize streamrip. The container will automatically catch the session token and write it to `./streamrip/config.toml`.

For Qobuz, run:
```bash
docker exec -it music-worker rip login qobuz
```
And input your credentials.

#### Method B: Manual Edit
You can manually edit `./streamrip/config.toml` on your host machine to fill in the Qobuz/Tidal parameters.

---

## API Documentation

### 1. Health Status
Verify API and Redis connection.
*   **URL**: `GET /api/health`
*   **Response**:
    ```json
    {
      "status": "ok",
      "redis": "connected"
    }
    ```

### 2. Request Download
Submit a song, album, or playlist link to be processed by the background workers.
*   **URL**: `POST /api/download`
*   **Rate Limit**: 1 request per minute per IP (strict).
*   **Request Body**:
    ```json
    {
      "url": "https://www.jiosaavn.com/song/nasir-intro/QDkyd0Z4b0E"
    }
    ```
*   **Response (202 Accepted)**:
    ```json
    {
      "status": "enqueued",
      "job_id": "42618c2f-efb5-4b13-a44d-570a9be2fa9c",
      "source": "jiosaavn",
      "url": "https://www.jiosaavn.com/song/nasir-intro/QDkyd0Z4b0E"
    }
    ```

### 3. Check Job Status
Query the status of a background job.
*   **URL**: `GET /api/job/{job_id}`
*   **Response (Waiting / Processing)**:
    ```json
    {
      "job_id": "42618c2f-efb5-4b13-a44d-570a9be2fa9c",
      "state": "waiting",
      "created_at": 1718707200000,
      "processed_at": null,
      "finished_at": null,
      "result": null,
      "error": null
    }
    ```
*   **Response (Completed)**:
    ```json
    {
      "job_id": "42618c2f-efb5-4b13-a44d-570a9be2fa9c",
      "state": "completed",
      "created_at": 1718707200000,
      "processed_at": 1718707205000,
      "finished_at": 1718707212000,
      "result": {
        "success": true,
        "source": "jiosaavn",
        "files_processed": 1,
        "message": "Successfully downloaded, normalized, and cataloged 1 track(s)."
      },
      "error": null
    }
    ```
