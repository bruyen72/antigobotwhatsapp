FROM node:20-alpine

# Install system dependencies including git (required for Baileys)
RUN apk update && apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with git available
RUN npm install --production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p sessions tmp/sessions

# Set environment variables
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/status || exit 1

# Start application
CMD ["npm", "start"]