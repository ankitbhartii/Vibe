import json
import os
import re
import uuid
import time
from typing import Dict, Any, Optional
import redis
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

app = FastAPI(
    title="Music Downloader Gateway API",
    description="Validates and routes JioSaavn, Tidal, and Qobuz links to a background BullMQ download queue",
    version="1.0.0"
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

# Queue name
QUEUE_NAME = "download-queue"

# RegEx patterns for validation
SAAVN_PATTERN = re.compile(r"(jio)?saavn\.com/(song|album|playlist|artist|featured)/")
TIDAL_PATTERN = re.compile(r"tidal\.com/(browse/)?(track|album|playlist|artist)/")
QOBUZ_PATTERN = re.compile(r"qobuz\.com/[\w-]+/album/")
YOUTUBE_PATTERN = re.compile(r"(?:music\.)?youtube\.com/(?:watch\?v=|playlist\?list=|channel/|shared\?ci=)|youtu\.be/")

class DownloadRequest(BaseModel):
    url: str

@app.get("/health")
def health_check() -> Dict[str, str]:
    try:
        redis_client.ping()
        return {"status": "ok", "redis": "connected"}
    except Exception as e:
        return {"status": "degraded", "redis": f"error: {str(e)}"}

@app.post("/download", status_code=status.HTTP_202_ACCEPTED)
async def request_download(request: DownloadRequest) -> Dict[str, Any]:
    url = request.url.strip()
    
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
    
    if not source:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported URL. We only support JioSaavn (saavn.com), Tidal (tidal.com), Qobuz (qobuz.com), and YouTube/YouTube Music links."
        )
    
    # 2. Enqueue Job to BullMQ (compatible format)
    job_id = str(uuid.uuid4())
    
    # BullMQ Job layout in Redis
    job_key = f"bull:{QUEUE_NAME}:{job_id}"
    
    job_data = {
        "id": job_id,
        "name": "download-track",
        "data": json.dumps({
            "url": url,
            "source": source
        }),
        "opts": json.dumps({
            "attempts": 3,
            "backoff": {
                "type": "fixed",
                "delay": 5000
            },
            "removeOnComplete": True,
            "removeOnFail": False
        }),
        "timestamp": int(time.time() * 1000),
        "delay": 0,
        "priority": 0
    }
    
    try:
        # Enqueue atomically
        pipeline = redis_client.pipeline()
        pipeline.hset(job_key, mapping=job_data)
        # Push to the 'wait' queue (which represents the queue of pending tasks)
        pipeline.rpush(f"bull:{QUEUE_NAME}:wait", job_id)
        # Publish event on the 'waiting' channel to notify active workers
        pipeline.publish(f"bull:{QUEUE_NAME}:waiting", job_id)
        pipeline.execute()
        
        return {
            "status": "enqueued",
            "job_id": job_id,
            "source": source,
            "url": url
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enqueue download task: {str(e)}"
        )

@app.get("/job/{job_id}")
async def get_job_status(job_id: str) -> Dict[str, Any]:
    job_key = f"bull:{QUEUE_NAME}:{job_id}"
    
    if not redis_client.exists(job_key):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or has already been cleared from the queue history."
        )
    
    try:
        job_hash = redis_client.hgetall(job_key)
        
        # Check queue lists/sets to determine state
        # States in BullMQ: active, wait, completed, failed, delayed
        state = "unknown"
        if redis_client.sismember(f"bull:{QUEUE_NAME}:completed", job_id):
            state = "completed"
        elif redis_client.sismember(f"bull:{QUEUE_NAME}:failed", job_id):
            state = "failed"
        elif redis_client.hexists(job_key, "processedOn") and not redis_client.hexists(job_key, "finishedOn"):
            state = "active"
        elif job_id in redis_client.lrange(f"bull:{QUEUE_NAME}:wait", 0, -1):
            state = "waiting"
        
        # Parse return value or error if available
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
