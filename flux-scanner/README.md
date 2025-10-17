# Flux Rich List Scanner

Blockchain scanner service that generates and maintains a rich list of Flux addresses sorted by balance.

## Features

- Incremental blockchain scanning with resume capability
- Periodic updates via cron job (default: daily at 2am)
- HTTP API to serve rich list data
- Checkpoint saving to prevent data loss
- Configurable minimum balance threshold
- Memory-efficient processing with batching

## Environment Variables

### Basic Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP server port |
| `DATA_DIR` | `/data` | Directory for storing scan state and rich list |
| `BLOCKBOOK_API_URL` | `http://fluxblockbook_explorertest2:9158/api/v2` | Blockbook API endpoint |
| `CRON_SCHEDULE` | `0 2 * * *` | Cron schedule for periodic scans (2am daily) |
| `RUN_SCAN_ON_STARTUP` | `true` | Run initial scan when service starts |
| `MIN_BALANCE` | `1` | Minimum balance (FLUX) to include in rich list |

### Advanced Configuration (Optional)

These override automatic LOCAL/PUBLIC mode detection:

| Variable | Default | Description |
|----------|---------|-------------|
| `API_MODE` | `auto` | Force mode: `local`, `public`, or `auto` |
| `BATCH_SIZE` | Auto (500 local, 50 public) | Blocks per batch |
| `THROTTLE_DELAY` | Auto (100ms local, 2000ms public) | Delay between batches |
| `CHECKPOINT_INTERVAL` | Auto (5000 local, 1000 public) | Save state every N blocks |
| `API_TIMEOUT` | Auto (10s local, 60s public) | Request timeout in milliseconds |
| `API_RETRY_LIMIT` | Auto (1 local, 3 public) | Number of retry attempts |

**Note**: If you don't set these, the scanner auto-detects LOCAL vs PUBLIC mode based on the `BLOCKBOOK_API_URL` and uses optimized settings.

## API Endpoints

### `GET /health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "service": "flux-rich-list-scanner",
  "timestamp": "2025-10-11T12:34:56Z"
}
```

### `GET /rich-list`
Get the complete rich list

**Response:**
```json
{
  "lastUpdate": "2025-10-11T02:00:00Z",
  "lastBlockHeight": 2010042,
  "totalSupply": 440000000,
  "totalAddresses": 15234,
  "addresses": [
    {
      "rank": 1,
      "address": "t1abc...",
      "balance": 1234567.89,
      "percentage": 0.281,
      "txCount": 8432
    }
  ]
}
```

### `GET /rich-list/metadata`
Get rich list metadata without full address list

**Response:**
```json
{
  "lastUpdate": "2025-10-11T02:00:00Z",
  "lastBlockHeight": 2010042,
  "totalSupply": 440000000,
  "totalAddresses": 15234
}
```

### `GET /rich-list/paginated?page=1&pageSize=100`
Get paginated rich list

**Query Parameters:**
- `page` (default: 1) - Page number (1-based)
- `pageSize` (default: 100, max: 1000) - Results per page

**Response:**
```json
{
  "lastUpdate": "2025-10-11T02:00:00Z",
  "lastBlockHeight": 2010042,
  "totalSupply": 440000000,
  "totalAddresses": 15234,
  "page": 1,
  "pageSize": 100,
  "totalPages": 153,
  "addresses": [...]
}
```

## Local Development

### Install Dependencies
```bash
npm install
```

### Run in Development Mode
```bash
npm run dev
```

### Run Scanner Once
```bash
npm run scan
```

### Build for Production
```bash
npm run build
npm start
```

## Docker Deployment

### Build Image
```bash
docker build -t flux-scanner:latest .
```

### Run with Local Blockbook
```bash
# Find your Blockbook container IP
docker inspect blockbookflux --format '{{.NetworkSettings.IPAddress}}'

# Run scanner (replace <BLOCKBOOK_IP> with the IP from above)
docker run -d \
  --name flux-scanner \
  --network bridge \
  -p 3001:3001 \
  -v flux-scanner-data:/data \
  -e BLOCKBOOK_API_URL=http://<BLOCKBOOK_IP>:9158/api/v2 \
  flux-scanner:latest
```

### Run with Public Blockbook
```bash
docker run -d \
  --name flux-scanner \
  -p 3001:3001 \
  -v flux-scanner-data:/data \
  -e BLOCKBOOK_API_URL=https://blockbookflux.app.runonflux.io/api/v2 \
  -e API_TIMEOUT=60000 \
  -e API_RETRY_LIMIT=3 \
  flux-scanner:latest
```

### Advanced: Custom Configuration
```bash
docker run -d \
  --name flux-scanner \
  -p 3001:3001 \
  -v flux-scanner-data:/data \
  -e BLOCKBOOK_API_URL=http://<BLOCKBOOK_IP>:9158/api/v2 \
  -e RUN_SCAN_ON_STARTUP=true \
  -e MIN_BALANCE=10 \
  -e API_TIMEOUT=30000 \
  -e API_RETRY_LIMIT=3 \
  flux-scanner:latest
```

### Push to Docker Hub
```bash
docker tag flux-scanner:latest littlestache/flux-scanner:latest
docker push littlestache/flux-scanner:latest
```

## Flux Deployment

Add as a third component to your Flux app specification:

```json
{
  "name": "scanner",
  "description": "Rich list scanner",
  "repotag": "littlestache/flux-scanner:latest",
  "port": 3001,
  "containerPort": 3001,
  "domains": [],
  "environmentParameters": [
    "BLOCKBOOK_API_URL=http://fluxblockbook_explorertest2:9158/api/v2"
  ],
  "containerData": "/data",
  "cpu": 1.0,
  "ram": 2048,
  "hdd": 20,
  "tiered": false
}
```

The explorer component can then fetch data from:
```
http://fluxscanner_explorertest2:3001/rich-list
```

## How It Works

1. **Initial Scan**: On first run, scans entire blockchain from genesis block
2. **State Tracking**: Maintains in-memory state of all address balances
3. **Checkpointing**: Saves state every 1000 blocks to prevent data loss
4. **Incremental Updates**: On subsequent runs, only processes new blocks
5. **Rich List Generation**: Filters addresses by minimum balance and sorts by balance
6. **HTTP API**: Serves generated rich list via REST endpoints
7. **Cron Scheduling**: Automatically updates list daily (configurable)

## Performance

### Scanning Speed

| Mode | Speed | Initial Scan | Incremental | Use Case |
|------|-------|--------------|-------------|----------|
| **LOCAL** | 40-66 bl/s | 8-12 hours | 1-5 minutes | Local Blockbook Docker |
| **PUBLIC** | 5-10 bl/s | 2-3 days | 10-30 minutes | Public Blockbook API |

**Current Flux blockchain**: ~2,012,000 blocks (October 2025)

### Resource Usage

- **Memory**: ~500MB-1GB (stores all address balances in memory)
- **Storage**: ~50-200MB (scan state + rich list JSON)
- **CPU**: Low (mostly I/O bound)
- **Network**: Moderate (depends on batch size and throttle delay)

### Configuration Profiles

#### LOCAL Mode (Aggressive)
```
Batch Size: 500 blocks
Throttle Delay: 100ms
Checkpoint: 5000 blocks
Timeout: 10 seconds
Retries: 1
```

#### PUBLIC Mode (Conservative)
```
Batch Size: 50 blocks
Throttle Delay: 2000ms
Checkpoint: 1000 blocks
Timeout: 60 seconds
Retries: 3
```

## Architecture

```
┌─────────────────────────────────────┐
│  Cron Scheduler                     │
│  (Daily at 2am)                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Scanner                            │
│  - Load scan state from disk        │
│  - Fetch new blocks from Blockbook  │
│  - Update address balances          │
│  - Save checkpoints                 │
│  - Generate rich list JSON          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Data Directory (/data)             │
│  - scan-state.json                  │
│  - rich-list.json                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  HTTP Server (Port 3001)            │
│  - Serves rich list data            │
│  - Provides pagination              │
│  - Returns metadata                 │
└─────────────────────────────────────┘
```

## License

MIT
