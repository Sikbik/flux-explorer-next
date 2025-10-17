# Flux Rich List Scanner Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Create data directory
RUN mkdir -p /data

# Expose HTTP port
EXPOSE 3001

# Environment variables (can be overridden)
ENV PORT=3001
ENV DATA_DIR=/data
ENV BLOCKBOOK_API_URL=http://fluxblockbook_explorertest2:9158/api/v2
ENV CRON_SCHEDULE="0 2 * * *"
ENV RUN_SCAN_ON_STARTUP=true
ENV MIN_BALANCE=1
# Note: BATCH_SIZE and CHECKPOINT_INTERVAL are not set here
# This allows the scanner to use its built-in LOCAL_CONFIG aggressive settings
# (500 batch size, 100ms throttle, 5000 checkpoint interval)

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the scanner service
CMD ["npm", "start"]
