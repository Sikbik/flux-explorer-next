# Flux Scanner - Docker Commands Quick Reference

## 🚀 Quick Start

### Build and Run (Development Mode)
```bash
cd flux-scanner
./build-and-run.sh
```

This will:
- Build the Docker image
- Run scanner connected to local Blockbook
- Start scan immediately
- Show live logs

---

## 📋 Manual Commands

### Build Image
```bash
docker build -t flux-scanner:latest .
```

### Run Container (Development Mode)
```bash
docker run -d \
  --name flux-scanner \
  --network bridge \
  -p 3001:3001 \
  -v flux-scanner-data:/data \
  -e BLOCKBOOK_API_URL=http://blockbookflux:9158/api/v2 \
  -e RUN_SCAN_ON_STARTUP=true \
  -e MIN_BALANCE=1 \
  -e BATCH_SIZE=100 \
  flux-scanner:latest
```

### Run Container (Production Mode with Cron)
```bash
docker run -d \
  --name flux-scanner \
  --network bridge \
  -p 3001:3001 \
  -v flux-scanner-data:/data \
  -e BLOCKBOOK_API_URL=http://blockbookflux:9158/api/v2 \
  -e CRON_SCHEDULE="0 2 * * *" \
  -e RUN_SCAN_ON_STARTUP=true \
  -e MIN_BALANCE=1 \
  -e BATCH_SIZE=100 \
  --restart unless-stopped \
  flux-scanner:latest
```

---

## 🔍 Monitoring Commands

### View Logs
```bash
docker logs -f flux-scanner
```

### Check Health
```bash
curl http://localhost:3001/health
```

### View Scan Metadata
```bash
curl http://localhost:3001/rich-list/metadata | jq
```

### Get Rich List (Paginated)
```bash
# First 100 addresses
curl http://localhost:3001/rich-list/paginated?page=1&pageSize=100 | jq

# Top 10
curl http://localhost:3001/rich-list/paginated?page=1&pageSize=10 | jq
```

### Get Full Rich List
```bash
curl http://localhost:3001/rich-list | jq > rich-list.json
```

---

## 🛠️ Management Commands

### Stop Scanner
```bash
docker stop flux-scanner
```

### Start Scanner
```bash
docker start flux-scanner
```

### Restart Scanner
```bash
docker restart flux-scanner
```

### Remove Container
```bash
docker stop flux-scanner
docker rm flux-scanner
```

### Remove Image
```bash
docker rmi flux-scanner:latest
```

### View Container Stats
```bash
docker stats flux-scanner
```

### Access Container Shell
```bash
docker exec -it flux-scanner sh
```

---

## 📊 Data Management

### View Data Volume
```bash
docker volume inspect flux-scanner-data
```

### Backup Data
```bash
docker run --rm \
  -v flux-scanner-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/scanner-backup.tar.gz /data
```

### Restore Data
```bash
docker run --rm \
  -v flux-scanner-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/scanner-backup.tar.gz -C /
```

### Clear Scan Data (Start Fresh)
```bash
docker stop flux-scanner
docker volume rm flux-scanner-data
docker volume create flux-scanner-data
docker start flux-scanner
```

---

## 🔧 Troubleshooting

### Scanner Won't Start
```bash
# Check logs
docker logs flux-scanner

# Check if Blockbook is accessible
docker exec flux-scanner wget -O- http://blockbookflux:9158/api/v2

# Verify network
docker network inspect bridge | grep -A 20 blockbookflux
```

### Scan Stuck or Slow
```bash
# Check progress
curl http://localhost:3001/rich-list/metadata

# Watch logs for errors
docker logs -f flux-scanner | grep -E "ERROR|error|Error"

# Restart scan (will resume from checkpoint)
docker restart flux-scanner
```

### Out of Memory
```bash
# Check memory usage
docker stats flux-scanner

# Increase memory limit
docker run -d \
  --name flux-scanner \
  --memory="2g" \
  --memory-swap="4g" \
  ...other options...
```

---

## 🎯 Build Script Options

### Build Only (Don't Run)
```bash
./build-and-run.sh --build-only
```

### Run Only (Skip Build)
```bash
./build-and-run.sh --run-only
```

### Development Mode
```bash
./build-and-run.sh --dev
```

### Production Mode
```bash
./build-and-run.sh --prod
```

---

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | HTTP server port |
| `DATA_DIR` | /data | Data directory |
| `BLOCKBOOK_API_URL` | Required | Blockbook API endpoint |
| `CRON_SCHEDULE` | `0 2 * * *` | Cron schedule (2am daily) |
| `RUN_SCAN_ON_STARTUP` | true | Run scan when service starts |
| `MIN_BALANCE` | 1 | Minimum balance to include (FLUX) |
| `BATCH_SIZE` | 100 | Blocks to process per batch |
| `CHECKPOINT_INTERVAL` | 1000 | Save state every N blocks |

---

## 🌐 Network Configuration

### Default Bridge Network
Scanner and Blockbook on same host:
```bash
-e BLOCKBOOK_API_URL=http://blockbookflux:9158/api/v2
```

### Custom Network
If using custom Docker network:
```bash
# Create network
docker network create flux-network

# Connect Blockbook
docker network connect flux-network blockbookflux

# Run scanner with custom network
docker run -d \
  --name flux-scanner \
  --network flux-network \
  -e BLOCKBOOK_API_URL=http://blockbookflux:9158/api/v2 \
  ...
```

### Host Network (Direct Access)
```bash
docker run -d \
  --name flux-scanner \
  --network host \
  -e BLOCKBOOK_API_URL=http://localhost:9158/api/v2 \
  ...
```

---

## 📈 Expected Performance

### Initial Scan
- **Time**: 2-6 hours (depends on blocks)
- **Memory**: 500MB-1GB
- **CPU**: 10-30%
- **Disk**: 50-200MB

### Daily Updates
- **Time**: 1-5 minutes
- **Memory**: 200-500MB
- **CPU**: 5-15%

---

## ✅ Testing

### Quick Test After Build
```bash
# Start scanner
./build-and-run.sh

# Wait 30 seconds for startup
sleep 30

# Test health endpoint
curl http://localhost:3001/health

# Check if scan started
curl http://localhost:3001/rich-list/metadata

# Watch progress
watch -n 5 'curl -s http://localhost:3001/rich-list/metadata | jq'
```

---

## 🔗 Integration with Explorer

Once scanner is running, update your explorer to use it:

```bash
# In flux-explorer environment
SCANNER_API_URL=http://localhost:3001

# Or for Docker
SCANNER_API_URL=http://flux-scanner:3001
```

Then access rich list at:
```
http://localhost:3000/rich-list
```

---

**Created:** 2025-10-13
**Version:** 1.0.0
