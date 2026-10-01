FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=384 \
    YT_DLP_PATH=/usr/local/bin/yt-dlp \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg python3 python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/yt-dlp \
    && /opt/yt-dlp/bin/pip install --no-cache-dir yt-dlp \
    && ln -s /opt/yt-dlp/bin/yt-dlp /usr/local/bin/yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force
COPY src ./src
RUN chown -R node:node /app

USER node
CMD ["node", "src/index.js"]
