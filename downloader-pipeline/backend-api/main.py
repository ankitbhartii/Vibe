import json
import os
import re
import uuid
import time
import hashlib
from typing import Dict, Any, Optional
import redis
import requests
import yt_dlp
from fastapi import FastAPI, HTTPException, status, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Music Downloader Gateway API",
    description="Validates JWT, enforces quotas, checks duplicates, and routes links to BullMQ queues",
    version="2.0.0"
)

# CORS configuration
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
custom_domain = os.getenv("CUSTOM_DOMAIN")
if custom_domain:
    allowed_origins.extend([
        f"https://{custom_domain}",
        f"https://www.{custom_domain}",
        f"http://{custom_domain}",
        f"http://www.{custom_domain}"
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection parameters
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    decode_responses=True,
    protocol=2
)

# RegEx patterns for validation
SAAVN_PATTERN = re.compile(r"(jio)?saavn\.com/(song|album|playlist|artist|featured)/")
TIDAL_PATTERN = re.compile(r"tidal\.com/(browse/)?(track|album|playlist|artist)/")
QOBUZ_PATTERN = re.compile(r"qobuz\.com/[\w-]+/album/")
YOUTUBE_PATTERN = re.compile(r"(?:music\.)?youtube\.com/(?:watch\?v=|playlist\?list=|channel/|shared\?ci=)|youtu\.be/")
SOUNDCLOUD_PATTERN = re.compile(r"soundcloud\.com/[\w-]+/")

class DownloadRequest(BaseModel):
    url: str

async def verify_supabase_jwt(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Extracts Bearer token from Authorization header and verifies it against Supabase Auth API
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header. Bearer token required."
        )
    
    token = authorization.split(" ")[1]
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_anon_key:
        print("⚠️ Warning: SUPABASE_URL or SUPABASE_ANON_KEY environment variables not set. Bypassing JWT checks for testing.")
        return {
            "id": "test-user-id",
            "email": "test@example.com",
            "role": "authenticated",
            "user_metadata": {"is_premium": True}
        }
        
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "apikey": supabase_anon_key
        }
        res = requests.get(f"{supabase_url}/auth/v1/user", headers=headers, timeout=6)
        if res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Supabase Auth token"
            )
        return res.json()
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification service unavailable: {str(e)}"
        )

def check_and_increment_quota(user_id: str, is_premium: bool):
    """
    Enforces daily download quotas (Premium: 20/day, Free: 10/day) and hourly limits (10/hour)
    """
    # 1. Hourly rate limit: 10 downloads/hour
    hourly_key = f"quota:download:{user_id}:hour"
    hourly_count = redis_client.get(hourly_key)
    if hourly_count and int(hourly_count) >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Hourly quota limit reached. Maximum 10 downloads per hour allowed."
        )
        
    # 2. Daily quota: Premium 20/day, Free 10/day
    daily_key = f"quota:download:{user_id}:day"
    daily_count = redis_client.get(daily_key)
    daily_limit = 20 if is_premium else 10
    if daily_count and int(daily_count) >= daily_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily quota limit reached. Tier limit is {daily_limit} downloads per day."
        )
        
    # Increment and set TTL atomically
    pipeline = redis_client.pipeline()
    pipeline.incr(hourly_key)
    pipeline.expire(hourly_key, 3600, nx=True)
    pipeline.incr(daily_key)
    pipeline.expire(daily_key, 86400, nx=True)
    pipeline.execute()

def extract_metadata(url: str) -> Dict[str, str]:
    """
    Uses yt-dlp in skip-download mode to parse title, artist/uploader, and album
    """
    try:
        ydl_opts = {
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            title = info.get("title") or "Unknown Title"
            artist = info.get("artist") or info.get("uploader") or "Unknown Artist"
            album = info.get("album") or "Unknown Album"
            
            if " - Topic" in artist:
                artist = artist.replace(" - Topic", "")
                
            return {
                "title": title.strip(),
                "artist": artist.strip(),
                "album": album.strip(),
                "id": info.get("id") or str(uuid.uuid4())
            }
    except Exception as e:
        print(f"⚠️ Warning: Metadata extraction failed: {str(e)}")
        return {
            "title": "Unknown Title",
            "artist": "Unknown Artist",
            "album": "Unknown Album",
            "id": str(uuid.uuid4())
        }

def check_supabase_duplicates(track_hash: str, artist: str, title: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Checks if the song is already present in Supabase. If so, skips download and links user to shared_access.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_anon_key:
        return None
        
    try:
        headers = {
            "apikey": supabase_anon_key,
            "Authorization": f"Bearer {supabase_anon_key}"
        }
        
        # Check if song exists in 'songs' database
        url = f"{supabase_url}/rest/v1/songs?select=id,title,artist,image_url,audio_url&artist=ilike.{artist}&title=ilike.{title}"
        res = requests.get(url, headers=headers, timeout=5)
        
        if res.status_code == 200:
            songs = res.json()
            if songs:
                song = songs[0]
                song_id = song.get("id")
                print(f"✅ Duplicate track detected (Song ID: {song_id}). Bypassing download queue.")
                
                # Insert a record into the 'shared_access' mapping table
                shared_url = f"{supabase_url}/rest/v1/shared_access"
                shared_data = {
                    "user_id": user_id,
                    "song_id": song_id,
                    "track_hash": track_hash,
                    "linked_at": int(time.time())
                }
                requests.post(shared_url, json=shared_data, headers=headers, timeout=5)
                return song
        return None
    except Exception as e:
        print(f"⚠️ Error querying Supabase duplicates: {str(e)}")
        return None

@app.get("/health")
def health_check() -> Dict[str, str]:
    try:
        redis_client.ping()
        return {"status": "ok", "redis": "connected"}
    except Exception as e:
        return {"status": "degraded", "redis": f"error: {str(e)}"}

@app.post("/download", status_code=status.HTTP_202_ACCEPTED)
async def request_download(
    request: DownloadRequest, 
    user_data: Dict[str, Any] = Depends(verify_supabase_jwt)
) -> Dict[str, Any]:
    url = request.url.strip()
    user_id = user_data.get("id")
    email = user_data.get("email", "")
    
    # Check if Premium Tier
    user_metadata = user_data.get("user_metadata", {})
    is_premium = user_metadata.get("is_premium", False) or user_metadata.get("tier") == "premium" or email.strip().lower() == "ankitkumarbharti100@gmail.com"
    
    # 1. Detect Source
    source = None
    if SAAVN_PATTERN.search(url):
        source = "jiosaavn"
    elif TIDAL_PATTERN.search(url):
        source = "tidal"
    elif QOBUZ_PATTERN.search(url):
        source = "qobuz"
    elif YOUTUBE_PATTERN.search(url):
        source = "ytmusic"
    elif SOUNDCLOUD_PATTERN.search(url):
        source = "soundcloud"
    
    if not source:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported URL. We support JioSaavn, Tidal, Qobuz, YouTube/YouTube Music, and SoundCloud links."
        )
        
    # 2. Check Quotas
    check_and_increment_quota(user_id, is_premium)
    
    # 3. Extract Metadata and check duplicates
    meta = extract_metadata(url)
    artist, title, album = meta["artist"], meta["title"], meta["album"]
    
    # Compute unique MD5 track hash
    track_string = f"{artist}|{title}|{album}".strip().lower()
    track_hash = hashlib.md5(track_string.encode('utf-8')).hexdigest()
    
    # check duplicates on Supabase
    duplicate_song = check_supabase_duplicates(track_hash, artist, title, user_id)
    if duplicate_song:
        return {
            "status": "linked",
            "message": "Track already exists. Associated to library immediately.",
            "song": duplicate_song
        }
    
    # 4. Route to dedicated queues
    queue_name = "download-queue"
    if source == "ytmusic":
        queue_name = "queue:ytmusic"
    elif source == "soundcloud":
        queue_name = "queue:soundcloud"
        
    job_id = str(uuid.uuid4())
    job_key = f"bull:{queue_name}:{job_id}"
    
    # Store job queue mapping to enable status querying
    redis_client.set(f"job:queue:{job_id}", queue_name, ex=86400) # 1 day TTL
    
    job_data = {
        "id": job_id,
        "name": "download-track",
        "data": json.dumps({
            "url": url,
            "source": source,
            "user_id": user_id,
            "track_hash": track_hash
        }),
        "opts": json.dumps({
            "attempts": 3,
            "backoff": {"type": "fixed", "delay": 5000},
            "removeOnComplete": True,
            "removeOnFail": False
        }),
        "timestamp": int(time.time() * 1000),
        "delay": 0,
        "priority": 0 if is_premium else 5
    }
    
    try:
        pipeline = redis_client.pipeline()
        pipeline.hset(job_key, mapping=job_data)
        
        # Enqueue with priority (Premium = Head, Free = Tail)
        if is_premium:
            pipeline.lpush(f"bull:{queue_name}:wait", job_id)
        else:
            pipeline.rpush(f"bull:{queue_name}:wait", job_id)
            
        pipeline.publish(f"bull:{queue_name}:waiting", job_id)
        pipeline.execute()
        
        return {
            "status": "enqueued",
            "job_id": job_id,
            "source": source,
            "queue": queue_name,
            "priority": "premium" if is_premium else "free",
            "url": url
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit task: {str(e)}"
        )

@app.get("/job/{job_id}")
async def get_job_status(job_id: str) -> Dict[str, Any]:
    # Retrieve correct queue name
    queue_name = redis_client.get(f"job:queue:{job_id}") or "download-queue"
    job_key = f"bull:{queue_name}:{job_id}"
    
    if not redis_client.exists(job_key):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or has already expired."
        )
    
    try:
        job_hash = redis_client.hgetall(job_key)
        
        state = "unknown"
        if redis_client.sismember(f"bull:{queue_name}:completed", job_id):
            state = "completed"
        elif redis_client.sismember(f"bull:{queue_name}:failed", job_id):
            state = "failed"
        elif redis_client.hexists(job_key, "processedOn") and not redis_client.hexists(job_key, "finishedOn"):
            state = "active"
        elif job_id in redis_client.lrange(f"bull:{queue_name}:wait", 0, -1):
            state = "waiting"
        
        result = None
        error_msg = None
        if "returnvalue" in job_hash:
            try:
                result = json.loads(job_hash["returnvalue"])
            except ValueError:
                result = job_hash["returnvalue"]
        if "failedReason" in job_hash:
            error_msg = job_hash["failedReason"]
            
        return {
            "job_id": job_id,
            "state": state,
            "created_at": int(job_hash.get("timestamp", 0)),
            "processed_at": int(job_hash.get("processedOn", 0)) if "processedOn" in job_hash else None,
            "finished_at": int(job_hash.get("finishedOn", 0)) if "finishedOn" in job_hash else None,
            "result": result,
            "error": error_msg
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job state: {str(e)}"
        )

