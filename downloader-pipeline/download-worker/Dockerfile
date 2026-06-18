FROM node:20-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set up Python virtual environment and install CLI downloaders + beets
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir beets ffmpeg-normalize streamrip mutagen yt-dlp && \
    pip install --no-cache-dir git+https://github.com/wiz64/saavn-cli.git

# Set up workspace
WORKDIR /app

# Copy dependency files
COPY package*.json tsconfig.json ./

# Install Node dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p /music /config/beets /tmp/downloads

# Default environment variables
ENV NODE_ENV=production
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV TEMP_DIR=/tmp/downloads
ENV BEETS_CONFIG=/config/beets/config.yaml

CMD ["npm", "start"]
