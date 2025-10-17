#!/bin/bash

#############################################################################
# Flux Scanner - Build and Run Script
#
# Builds the Docker image and runs it connected to your local Blockbook
#
# Usage: ./build-and-run.sh [options]
#
# Options:
#   --build-only    Only build the image, don't run
#   --run-only      Only run (skip build)
#   --dev           Run in dev mode (immediate scan, no cron)
#   --prod          Run in production mode (cron enabled)
#############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
IMAGE_NAME="flux-scanner"
IMAGE_TAG="latest"
CONTAINER_NAME="flux-scanner"
BLOCKBOOK_CONTAINER="blockbookflux"

# Parse arguments
BUILD_ONLY=false
RUN_ONLY=false
DEV_MODE=false
PROD_MODE=false

for arg in "$@"; do
    case $arg in
        --build-only) BUILD_ONLY=true ;;
        --run-only) RUN_ONLY=true ;;
        --dev) DEV_MODE=true ;;
        --prod) PROD_MODE=true ;;
    esac
done

# If no mode specified, default to dev
if [ "$DEV_MODE" = false ] && [ "$PROD_MODE" = false ]; then
    DEV_MODE=true
fi

log_info "============================================"
log_info "Flux Rich List Scanner - Build & Run"
log_info "============================================"
echo ""

# Step 1: Check if Blockbook is running
if [ "$RUN_ONLY" = false ]; then
    log_info "Step 1/4: Checking Blockbook status..."

    if ! docker ps --format '{{.Names}}' | grep -q "^${BLOCKBOOK_CONTAINER}$"; then
        log_error "Blockbook container '${BLOCKBOOK_CONTAINER}' is not running!"
        log_info "Start it first with: docker start ${BLOCKBOOK_CONTAINER}"
        exit 1
    fi

    # Check if Blockbook API is responding
    BLOCKBOOK_HEALTH=$(docker exec $BLOCKBOOK_CONTAINER curl -s http://localhost:9158/api/v2 2>/dev/null | grep -o '"blockbook"' || echo "")

    if [ -z "$BLOCKBOOK_HEALTH" ]; then
        log_warning "Blockbook API is not responding yet (still syncing?)"
        log_warning "Scanner will wait for Blockbook to be ready"
    else
        log_success "Blockbook is running and healthy"
    fi
else
    log_info "Skipping Blockbook check (--run-only mode)"
fi

# Step 2: Build Docker image
if [ "$RUN_ONLY" = false ]; then
    log_info "Step 2/4: Building Docker image..."
    echo ""

    # Check if package-lock.json exists
    if [ ! -f "package-lock.json" ]; then
        log_warning "package-lock.json not found. Creating it..."
        docker run --rm -v "$(pwd):/app" -w /app node:20-alpine npm install
    fi

    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} . --no-cache

    log_success "Docker image built: ${IMAGE_NAME}:${IMAGE_TAG}"
else
    log_info "Skipping build (--run-only mode)"
fi

if [ "$BUILD_ONLY" = true ]; then
    log_success "Build complete! (--build-only mode)"
    exit 0
fi

# Step 3: Stop existing container if running
log_info "Step 3/4: Checking for existing container..."

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_warning "Container '${CONTAINER_NAME}' already exists. Removing..."
    docker stop ${CONTAINER_NAME} 2>/dev/null || true
    docker rm ${CONTAINER_NAME} 2>/dev/null || true
    log_success "Old container removed"
fi

# Step 4: Run container
log_info "Step 4/4: Starting scanner container..."

# Get Blockbook container's network
BLOCKBOOK_NETWORK=$(docker inspect ${BLOCKBOOK_CONTAINER} --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{end}}' | head -1)

if [ -z "$BLOCKBOOK_NETWORK" ]; then
    BLOCKBOOK_NETWORK="bridge"
    log_warning "Could not detect Blockbook network, using default 'bridge'"
fi

# Create data volume if it doesn't exist
docker volume create flux-scanner-data 2>/dev/null || true

# Set environment variables based on mode
if [ "$DEV_MODE" = true ]; then
    log_info "Running in DEV mode (immediate scan, no cron)"
    RUN_ON_STARTUP="true"
    CRON_SCHEDULE=""
    MIN_BALANCE="1"
    BATCH_SIZE="100"
elif [ "$PROD_MODE" = true ]; then
    log_info "Running in PRODUCTION mode (daily cron at 2am)"
    RUN_ON_STARTUP="true"
    CRON_SCHEDULE="0 2 * * *"
    MIN_BALANCE="1"
    BATCH_SIZE="100"
fi

# Run the container
docker run -d \
  --name ${CONTAINER_NAME} \
  --network ${BLOCKBOOK_NETWORK} \
  -p 3001:3001 \
  -v flux-scanner-data:/data \
  -e BLOCKBOOK_API_URL=http://${BLOCKBOOK_CONTAINER}:9158/api/v2 \
  -e CRON_SCHEDULE="${CRON_SCHEDULE}" \
  -e RUN_SCAN_ON_STARTUP="${RUN_ON_STARTUP}" \
  -e MIN_BALANCE="${MIN_BALANCE}" \
  -e BATCH_SIZE="${BATCH_SIZE}" \
  -e CHECKPOINT_INTERVAL=1000 \
  --restart unless-stopped \
  ${IMAGE_NAME}:${IMAGE_TAG}

log_success "Scanner container started!"

# Wait for health check
log_info "Waiting for scanner to be healthy..."
sleep 5

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_success "Container is running!"
else
    log_error "Container failed to start. Check logs with: docker logs ${CONTAINER_NAME}"
    exit 1
fi

# Display status
echo ""
log_info "============================================"
log_success "Scanner is now running!"
log_info "============================================"
echo ""
log_info "Container Details:"
log_info "  Name: ${CONTAINER_NAME}"
log_info "  Network: ${BLOCKBOOK_NETWORK}"
log_info "  Blockbook URL: http://${BLOCKBOOK_CONTAINER}:9158/api/v2"
log_info "  API Port: 3001"
log_info "  Data Volume: flux-scanner-data"
echo ""
log_info "Scanner Mode:"
if [ "$DEV_MODE" = true ]; then
    log_info "  Mode: Development (immediate scan)"
    log_info "  Scan will start immediately and run once"
else
    log_info "  Mode: Production (daily cron)"
    log_info "  Schedule: Daily at 2:00 AM UTC"
    log_info "  Also runs once on startup"
fi
echo ""
log_info "Useful Commands:"
log_info "  View logs:          docker logs -f ${CONTAINER_NAME}"
log_info "  Check status:       curl http://localhost:3001/health"
log_info "  View metadata:      curl http://localhost:3001/rich-list/metadata"
log_info "  Get rich list:      curl http://localhost:3001/rich-list"
log_info "  Stop scanner:       docker stop ${CONTAINER_NAME}"
log_info "  Restart scanner:    docker restart ${CONTAINER_NAME}"
echo ""

# Show initial logs
log_info "Initial logs (Ctrl+C to exit, container keeps running):"
echo ""
sleep 2
docker logs -f ${CONTAINER_NAME}
