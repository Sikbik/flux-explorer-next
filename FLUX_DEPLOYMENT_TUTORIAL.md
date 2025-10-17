# Complete Flux Deployment Tutorial

A comprehensive guide to deploying applications on the Flux decentralized cloud network, with specific examples for the Flux Explorer project.

**Last Updated:** October 11, 2025
**Flux Version:** Latest
**Target Audience:** Developers deploying Docker applications on Flux

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Understanding Flux Architecture](#understanding-flux-architecture)
- [Deployment Method 1: Web Interface (Recommended for Beginners)](#deployment-method-1-web-interface)
- [Deployment Method 2: API Calls (Advanced)](#deployment-method-2-api-calls)
- [Multi-Component Deployments](#multi-component-deployments)
- [Environment Variables](#environment-variables)
- [Monitoring and Management](#monitoring-and-management)
- [Troubleshooting](#troubleshooting)
- [Cost Estimation](#cost-estimation)
- [Best Practices](#best-practices)

---

## Overview

Flux is a decentralized cloud computing network that runs Docker containers across a global network of FluxNodes. Unlike traditional cloud providers (AWS, Google Cloud, Azure), Flux provides:

- **Decentralization**: No single point of failure
- **Geographic distribution**: Automatic deployment across multiple nodes worldwide
- **Crypto payments**: Pay with FLUX cryptocurrency
- **Censorship resistance**: No central authority can take down your app
- **Competitive pricing**: Often cheaper than traditional cloud providers

### Flux App Components

A Flux app can consist of:
- **Single component**: One Docker container
- **Multi-component**: Multiple Docker containers (e.g., frontend + backend + database)

Each component:
- Runs in its own Docker container
- Has dedicated CPU, RAM, and storage
- Can communicate with other components via internal networking
- Gets automatic domain names for external access

---

## Prerequisites

### Required

1. **Docker Hub Account** (or other public container registry)
   - Sign up at https://hub.docker.com
   - Free tier is sufficient

2. **FLUX Cryptocurrency**
   - Purchase on exchanges (KuCoin, TradeOgre, etc.)
   - Amount depends on app specifications (~50-200 FLUX/month)

3. **Zelcore Wallet** or **Flux Web Wallet**
   - Download Zelcore: https://zelcore.io
   - Or use web wallet: https://home.runonflux.io

4. **Docker Image Built and Pushed**
   ```bash
   # Build your image
   docker build -t yourusername/yourapp:latest .

   # Login to Docker Hub
   docker login

   # Push image
   docker push yourusername/yourapp:latest
   ```

5. **Flux Account**
   - Create account at https://home.runonflux.io
   - Login with Zelcore or web wallet

### Recommended

- **Domain name** (optional): Custom domain for your app
- **SSL certificate** (optional): Flux provides automatic SSL for .app.runonflux.io domains
- **GitHub repository**: For version control and documentation

---

## Understanding Flux Architecture

### FluxNode Tiers

Flux has three node tiers with different capabilities:

| Tier | CPU | RAM | Storage | Collateral | Monthly Cost per App |
|------|-----|-----|---------|------------|----------------------|
| **CUMULUS** | 2-4 cores | 8 GB | 220 GB | 10,000 FLUX | ~30-50 FLUX |
| **NIMBUS** | 8 cores | 32 GB | 880 GB | 25,000 FLUX | ~50-100 FLUX |
| **STRATUS** | 16 cores | 64 GB | 1.8 TB | 100,000 FLUX | ~100-200 FLUX |

Your app will be deployed to nodes that meet your resource requirements.

### Component Naming and Networking

**Critical Concept:** Flux uses a special naming pattern for multi-component communication:

```
flux{componentname}_{appname}
```

**Example:**
- App name: `myexplorer`
- Component 1 name: `blockbook`
- Component 2 name: `explorer`

**Internal hostnames:**
- Blockbook: `fluxblockbook_myexplorer`
- Explorer: `fluxexplorer_myexplorer`

**Connection strings:**
```bash
# From explorer component, connect to blockbook:
http://fluxblockbook_myexplorer:9158/api/v2

# From scanner component, connect to blockbook:
http://fluxblockbook_myexplorer:9158/api/v2
```

### Ports

- **Port**: External port (random, assigned by Flux)
- **Container Port**: Internal port your app listens on
- **Example**: Your app listens on port 3000 inside container, Flux assigns external port 34521

---

## Deployment Method 1: Web Interface

This is the recommended method for most users. It provides a visual interface and is easier to understand.

### Step 1: Login to Flux Dashboard

1. Navigate to https://home.runonflux.io
2. Click **"Login"** in top right
3. Choose login method:
   - **Zelcore**: Opens Zelcore app for authentication
   - **Web Wallet**: Enter your wallet credentials
4. Approve the login request

### Step 2: Navigate to Deploy App

1. Once logged in, click **"My Apps"** in the navigation menu
2. Click the **"Deploy New App"** button (blue button, top right)
3. You'll see the deployment form

### Step 3: Fill Out App Specification

#### Basic Information Section

**App Name**
- Enter a unique name (lowercase, no spaces, alphanumeric + hyphens)
- Example: `flux-explorer`, `myapp-prod`, `bitcoin-node`
- This name is used in: URLs, internal networking, Flux dashboard
- **Cannot be changed after deployment**

**Description**
- Brief description of your app (max 100 characters)
- Example: "Flux blockchain explorer with CSV export"
- Visible in Flux marketplace

**App Owner**
- Automatically filled with your Zelcore ID
- This is your wallet address
- Leave as-is (read-only)

#### Container Configuration Section

**Repository**
- Full Docker image name with tag
- Format: `username/imagename:tag`
- Example: `littlestache/flux-explorer:latest`
- Must be publicly accessible (no private registries in free tier)

**Repository Authentication**
- Select **"Public"** for public Docker images
- Select **"Private"** if using private registry (requires paid tier)

**Container Port**
- The port your application listens on **inside** the container
- Example: `3000` for Next.js apps, `80` for nginx, `8080` for Node.js
- Check your Dockerfile's `EXPOSE` directive

**Port**
- External port users will access
- Leave blank for automatic assignment (recommended)
- Or specify a port number if you need a specific port

#### Domains Section

**Custom Domains** (Optional)
- Add custom domains that point to your app
- Example: `explorer.myfluxapp.com`
- Requires DNS configuration (CNAME record)
- Leave blank to use auto-generated Flux domains

**Automatic Domains**
- Flux automatically assigns domains in format:
- `{appname}.app.runonflux.io`
- `{appname}_{randomstring}.app.runonflux.io`
- Multiple domains for redundancy
- SSL certificates automatically provisioned

#### Environment Variables Section

**Environment Parameters**
- Click **"Add Environment Variable"** for each variable
- Format: `KEY=VALUE`
- Example: `NODE_ENV=production`
- Example: `BLOCKBOOK_API_URL=http://fluxblockbook_myapp:9158/api/v2`

**Common environment variables for Flux Explorer:**
```bash
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1

# Smart API Detection (v1.0.2+)
# Server-side (runtime) - for internal Flux DNS
BLOCKBOOK_API_URL=http://fluxblockbook_yourappname:9158/api/v2

# Client-side (public fallback)
NEXT_PUBLIC_BLOCKBOOK_API_URL=https://blockbookflux.app.runonflux.io/api/v2

# API Mode (auto = smart detection, local = force local, public = force public)
NEXT_PUBLIC_API_MODE=auto

# Scanner component URL
SCANNER_API_URL=http://fluxscanner_yourappname:3001
```

**Note about Smart API Detection:**
The Flux Explorer features intelligent API detection that automatically switches between local and public Blockbook based on availability:
- **Local mode**: 3-second polling, 500 block batches (10x faster)
- **Public mode**: 30-second polling, 50 block batches (rate-limit friendly)
- **Auto failover**: Automatically switches if local becomes unavailable
- **Server-side health checks**: `/api/health` route allows access to internal Flux DNS from browser

This gives you **10x faster updates** when running with a local Blockbook component!

**Important Notes:**
- Don't include quotes around values
- Don't use spaces around `=` sign
- One variable per line
- No trailing commas

#### Commands Section

**Commands** (Optional)
- Override container's default CMD
- Example: `npm start`
- Example: `node server.js`
- Leave blank to use Dockerfile's CMD (recommended)

#### Resource Allocation Section

**CPU**
- Number of CPU cores (decimals allowed)
- Minimum: `0.5` (half a core)
- Recommended: `1.0` - `4.0`
- Example: `2.0` for a moderate web app

**RAM**
- Memory in MB
- Minimum: `512` MB
- Recommended: `2048` - `8192` MB (2-8 GB)
- Example: `4096` MB for Next.js app

**Storage (HDD)**
- Disk space in GB
- Minimum: `1` GB
- Recommended: `10` - `50` GB for apps, `100+` GB for databases
- Example: `10` GB for web app, `181` GB for Blockbook

**Container Data** (Persistent Storage)
- Path inside container where data should persist
- Example: `/data`, `/root`, `/app/data`
- Data at this path survives container restarts
- Leave blank if no persistent storage needed

#### Advanced Options

**Tiered Deployment**
- **Tiered**: Deploy to specific FluxNode tiers (CUMULUS, NIMBUS, STRATUS)
- **Non-tiered**: Deploy to any nodes that meet resource requirements (recommended)
- Select **"Non-tiered"** unless you have specific tier requirements

**Geolocation Constraints** (Optional)
- Restrict deployment to specific countries/regions
- Example: Only deploy to US nodes
- Leave blank for worldwide deployment (recommended)

### Step 4: Review and Calculate Cost

1. Click **"Calculate Cost"** button at bottom of form
2. Review the monthly cost estimate in FLUX
3. Check that all settings are correct
4. Cost is displayed in FLUX per month

**Cost Breakdown Example:**
```
CPU: 2 cores × 10 FLUX/core = 20 FLUX
RAM: 4096 MB × 0.01 FLUX/MB = 40.96 FLUX
Storage: 10 GB × 0.5 FLUX/GB = 5 FLUX
Total: ~66 FLUX/month
```

### Step 5: Deploy App

1. Click **"Deploy App"** button
2. Zelcore will open with a transaction approval
3. Review the transaction:
   - **To**: Flux network contract address
   - **Amount**: Registration fee (~1-10 FLUX) + first month payment
   - **Message**: Your app specification (JSON)
4. Click **"Approve"** in Zelcore
5. Wait for transaction confirmation (~2 minutes)

### Step 6: Monitor Deployment

1. You'll see a success message: "App deployment initiated"
2. Navigate to **"My Apps"** to see your app
3. Initial status: **"Pending"** (yellow indicator)
4. Wait 5-10 minutes for deployment
5. Status changes to **"Running"** (green indicator) when ready

**Deployment Timeline:**
- **0-2 minutes**: Transaction confirmation
- **2-5 minutes**: Flux network broadcasts app spec
- **5-10 minutes**: FluxNodes pull Docker image and start containers
- **10-15 minutes**: App becomes accessible via assigned domains

### Step 7: Access Your App

1. Click on your app name in **"My Apps"**
2. View app details including:
   - **Domains**: Click to open your app
   - **Instances**: See which FluxNodes are running your app
   - **Resources**: Current CPU/RAM/storage usage
   - **Logs**: View container logs

**Your app is now live!** 🎉

Access via auto-generated domains:
```
https://yourappname.app.runonflux.io
https://yourappname_abc123.app.runonflux.io
```

---

## Deployment Method 2: API Calls

This method is for advanced users who want to automate deployments or integrate with CI/CD pipelines.

### Overview

Flux provides a JSON-RPC API for managing applications. All operations are performed via authenticated API calls signed with your Zelcore wallet.

### API Endpoint

```
https://api.runonflux.io/apps/v1
```

### Authentication

All API calls must be authenticated with a signature from your Zelcore wallet.

#### Generate Authentication Signature

1. **Message to Sign**:
   ```json
   {
     "timestamp": 1696924800000,
     "zelid": "1CbErtneaX2QVyUfwU7JGB7VzvPgrgc3uC"
   }
   ```

2. **Sign with Zelcore**:
   - Open Zelcore
   - Go to Settings → Signing
   - Paste the JSON message
   - Click "Sign Message"
   - Copy the signature

3. **Include in API Headers**:
   ```bash
   curl -X POST https://api.runonflux.io/apps/v1/deployapp \
     -H "Content-Type: application/json" \
     -H "zelid: 1CbErtneaX2QVyUfwU7JGB7VzvPgrgc3uC" \
     -H "signature: H123abc..." \
     -H "timestamp: 1696924800000"
   ```

### API Methods

#### 1. Deploy App

**Endpoint**: `POST /apps/v1/deployapp`

**Request Body**:
```json
{
  "version": 4,
  "name": "flux-explorer",
  "description": "Flux blockchain explorer",
  "owner": "1CbErtneaX2QVyUfwU7JGB7VzvPgrgc3uC",
  "compose": [
    {
      "name": "explorer",
      "description": "Flux Explorer frontend",
      "repotag": "littlestache/flux-explorer:latest",
      "port": 3000,
      "containerPort": 3000,
      "domains": [],
      "environmentParameters": [
        "NODE_ENV=production",
        "NEXT_TELEMETRY_DISABLED=1",
        "HOSTNAME=0.0.0.0"
      ],
      "commands": [],
      "containerData": "",
      "cpu": 2.0,
      "ram": 4096,
      "hdd": 10,
      "tiered": false,
      "secrets": []
    }
  ]
}
```

**Full cURL Example**:
```bash
curl -X POST https://api.runonflux.io/apps/v1/deployapp \
  -H "Content-Type: application/json" \
  -H "zelid: YOUR_ZELID" \
  -H "signature: YOUR_SIGNATURE" \
  -H "timestamp: $(date +%s)000" \
  -d '{
    "version": 4,
    "name": "flux-explorer",
    "description": "Flux blockchain explorer",
    "owner": "YOUR_ZELID",
    "compose": [
      {
        "name": "explorer",
        "description": "Flux Explorer frontend",
        "repotag": "littlestache/flux-explorer:latest",
        "port": 3000,
        "containerPort": 3000,
        "domains": [],
        "environmentParameters": [
          "NODE_ENV=production",
          "NEXT_TELEMETRY_DISABLED=1"
        ],
        "commands": [],
        "containerData": "",
        "cpu": 2.0,
        "ram": 4096,
        "hdd": 10,
        "tiered": false,
        "secrets": []
      }
    ]
  }'
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "message": "Application deployment initiated",
    "appName": "flux-explorer",
    "txid": "abc123def456..."
  }
}
```

#### 2. Update App

**Endpoint**: `POST /apps/v1/updateapp`

**Request Body**:
```json
{
  "version": 4,
  "name": "flux-explorer",
  "description": "Flux blockchain explorer v2",
  "compose": [
    {
      "name": "explorer",
      "description": "Updated explorer",
      "repotag": "littlestache/flux-explorer:v2.0.0",
      "port": 3000,
      "containerPort": 3000,
      "domains": [],
      "environmentParameters": [
        "NODE_ENV=production",
        "NEXT_TELEMETRY_DISABLED=1",
        "NEW_FEATURE_FLAG=true"
      ],
      "commands": [],
      "containerData": "",
      "cpu": 2.0,
      "ram": 4096,
      "hdd": 10,
      "tiered": false,
      "secrets": []
    }
  ]
}
```

**cURL Example**:
```bash
curl -X POST https://api.runonflux.io/apps/v1/updateapp \
  -H "Content-Type: application/json" \
  -H "zelid: YOUR_ZELID" \
  -H "signature: YOUR_SIGNATURE" \
  -H "timestamp: $(date +%s)000" \
  -d @update-app.json
```

#### 3. Remove App

**Endpoint**: `POST /apps/v1/removeapp`

**Request Body**:
```json
{
  "appname": "flux-explorer"
}
```

**cURL Example**:
```bash
curl -X POST https://api.runonflux.io/apps/v1/removeapp \
  -H "Content-Type: application/json" \
  -H "zelid: YOUR_ZELID" \
  -H "signature: YOUR_SIGNATURE" \
  -H "timestamp: $(date +%s)000" \
  -d '{"appname": "flux-explorer"}'
```

#### 4. Get App Status

**Endpoint**: `GET /apps/v1/app/{appname}`

**cURL Example**:
```bash
curl -X GET https://api.runonflux.io/apps/v1/app/flux-explorer \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "name": "flux-explorer",
    "version": 4,
    "hash": "abc123...",
    "height": 2010042,
    "instances": 15,
    "compose": [...],
    "status": "running"
  }
}
```

#### 5. List My Apps

**Endpoint**: `GET /apps/v1/myapps`

**cURL Example**:
```bash
curl -X GET "https://api.runonflux.io/apps/v1/myapps?zelid=YOUR_ZELID" \
  -H "Content-Type: application/json"
```

### API Specification Fields Reference

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `version` | number | Yes | Spec version (always 4) | `4` |
| `name` | string | Yes | Unique app name | `"flux-explorer"` |
| `description` | string | Yes | App description | `"Blockchain explorer"` |
| `owner` | string | Yes | Your Zelcore ID | `"1CbErt..."` |
| `compose` | array | Yes | Array of components | `[{...}]` |

#### Component Specification Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | Yes | Component name | `"explorer"` |
| `description` | string | Yes | Component description | `"Frontend"` |
| `repotag` | string | Yes | Docker image | `"user/image:tag"` |
| `port` | number | No | External port (auto if blank) | `3000` |
| `containerPort` | number | Yes | Internal port | `3000` |
| `domains` | array | No | Custom domains | `["app.com"]` |
| `environmentParameters` | array | No | Environment variables | `["KEY=value"]` |
| `commands` | array | No | Override CMD | `["npm", "start"]` |
| `containerData` | string | No | Persistent storage path | `"/data"` |
| `cpu` | number | Yes | CPU cores | `2.0` |
| `ram` | number | Yes | RAM in MB | `4096` |
| `hdd` | number | Yes | Storage in GB | `10` |
| `tiered` | boolean | Yes | Tier-specific deployment | `false` |
| `secrets` | array | No | Secret environment variables | `[]` |

### Automation Scripts

#### Python Example

```python
import requests
import time
import json
from datetime import datetime

# Configuration
ZELID = "YOUR_ZELID"
SIGNATURE = "YOUR_SIGNATURE"  # Get from Zelcore
API_BASE = "https://api.runonflux.io/apps/v1"

def deploy_app(app_spec):
    """Deploy a Flux app via API"""

    headers = {
        "Content-Type": "application/json",
        "zelid": ZELID,
        "signature": SIGNATURE,
        "timestamp": str(int(time.time() * 1000))
    }

    response = requests.post(
        f"{API_BASE}/deployapp",
        headers=headers,
        json=app_spec
    )

    return response.json()

def get_app_status(app_name):
    """Get status of a deployed app"""

    response = requests.get(f"{API_BASE}/app/{app_name}")
    return response.json()

# Example: Deploy Flux Explorer
app_spec = {
    "version": 4,
    "name": "flux-explorer",
    "description": "Flux blockchain explorer",
    "owner": ZELID,
    "compose": [{
        "name": "explorer",
        "description": "Explorer frontend",
        "repotag": "littlestache/flux-explorer:latest",
        "port": 3000,
        "containerPort": 3000,
        "domains": [],
        "environmentParameters": [
            "NODE_ENV=production",
            "NEXT_TELEMETRY_DISABLED=1"
        ],
        "commands": [],
        "containerData": "",
        "cpu": 2.0,
        "ram": 4096,
        "hdd": 10,
        "tiered": False,
        "secrets": []
    }]
}

# Deploy
result = deploy_app(app_spec)
print("Deployment result:", json.dumps(result, indent=2))

# Wait and check status
time.sleep(300)  # Wait 5 minutes
status = get_app_status("flux-explorer")
print("App status:", json.dumps(status, indent=2))
```

#### Bash Example

```bash
#!/bin/bash

# Configuration
ZELID="YOUR_ZELID"
SIGNATURE="YOUR_SIGNATURE"
TIMESTAMP=$(date +%s)000

# App specification
APP_SPEC=$(cat <<EOF
{
  "version": 4,
  "name": "flux-explorer",
  "description": "Flux blockchain explorer",
  "owner": "$ZELID",
  "compose": [{
    "name": "explorer",
    "description": "Explorer frontend",
    "repotag": "littlestache/flux-explorer:latest",
    "port": 3000,
    "containerPort": 3000,
    "domains": [],
    "environmentParameters": [
      "NODE_ENV=production",
      "NEXT_TELEMETRY_DISABLED=1"
    ],
    "commands": [],
    "containerData": "",
    "cpu": 2.0,
    "ram": 4096,
    "hdd": 10,
    "tiered": false,
    "secrets": []
  }]
}
EOF
)

# Deploy app
echo "Deploying app..."
curl -X POST https://api.runonflux.io/apps/v1/deployapp \
  -H "Content-Type: application/json" \
  -H "zelid: $ZELID" \
  -H "signature: $SIGNATURE" \
  -H "timestamp: $TIMESTAMP" \
  -d "$APP_SPEC"

echo ""
echo "Deployment initiated! Wait 5-10 minutes for containers to start."

# Wait and check status
sleep 300
echo "Checking app status..."
curl -X GET https://api.runonflux.io/apps/v1/app/flux-explorer | jq
```

---

## Multi-Component Deployments

Deploy multiple interconnected containers as a single Flux app.

### Example: Full Flux Explorer Stack

This example deploys all three components: Blockbook, Scanner, and Explorer.

#### Web Interface Method

**Step 1**: Create first component (Blockbook)

1. Click "Deploy New App"
2. Fill in details:
   - **App Name**: `explorerstack`
   - **Description**: `Full Flux explorer with rich list`
   - **Repository**: `runonflux/blockbook-docker:latest`
   - **Container Port**: `9158,1337`
   - **Port**: `34142,34143`
   - **Environment Parameters**:
     ```
     COIN=flux
     BLOCKBOOK_PORT=9158
     REMOVE_ADDNODES=true
     EXTRACONFIG=addnode=65.108.10.80 addnode=65.21.130.135 addnode=95.217.207.214 addnode=38.242.223.230 addnode=24.120.133.162 addnode=192.99.13.138 addnode=192.99.13.217 addnode=37.187.88.178 addnode=46.38.251.220 addnode=95.216.118.230 addnode=94.23.203.53 addnode=37.120.160.142 addnode=95.216.20.115 addnode=64.32.48.63 addnode=64.32.48.62
     ```
   - **Container Data**: `/root`
   - **CPU**: `5.0`
   - **RAM**: `10240` MB
   - **Storage**: `181` GB

**Step 2**: Add second component (Scanner)

3. Click "Add Component" button (bottom of form)
4. Fill in details for component 2:
   - **Component Name**: `scanner`
   - **Description**: `Rich list scanner`
   - **Repository**: `littlestache/flux-scanner:latest`
   - **Container Port**: `3001`
   - **Port**: Leave blank (auto)
   - **Environment Parameters**:
     ```
     BLOCKBOOK_API_URL=http://fluxblockbook_explorerstack:9158/api/v2
     CRON_SCHEDULE=0 2 * * *
     RUN_SCAN_ON_STARTUP=true
     MIN_BALANCE=1
     BATCH_SIZE=100
     CHECKPOINT_INTERVAL=1000
     ```
   - **Container Data**: `/data`
   - **CPU**: `1.0`
   - **RAM**: `2048` MB
   - **Storage**: `20` GB

**Step 3**: Add third component (Explorer)

5. Click "Add Component" button again
6. Fill in details for component 3:
   - **Component Name**: `explorer`
   - **Description**: `Explorer frontend`
   - **Repository**: `littlestache/flux-explorer:latest`
   - **Container Port**: `3000`
   - **Port**: Leave blank (auto)
   - **Environment Parameters**:
     ```
     NODE_ENV=production
     NEXT_TELEMETRY_DISABLED=1
     HOSTNAME=0.0.0.0
     BLOCKBOOK_API_URL=http://fluxblockbook_explorerstack:9158/api/v2
     NEXT_PUBLIC_BLOCKBOOK_API_URL=https://blockbook-url.app.runonflux.io/api/v2
     SCANNER_API_URL=http://fluxscanner_explorerstack:3001
     ```
   - **Container Data**: Leave blank
   - **CPU**: `2.0`
   - **RAM**: `4096` MB
   - **Storage**: `10` GB

**Step 4**: Review and Deploy

7. Click "Calculate Cost" - should show ~180 FLUX/month
8. Click "Deploy App"
9. Approve transaction in Zelcore

#### API Method

```json
{
  "version": 4,
  "name": "explorerstack",
  "description": "Full Flux Explorer with Blockbook and Rich List",
  "owner": "YOUR_ZELID",
  "compose": [
    {
      "name": "blockbook",
      "description": "Blockchain indexer",
      "repotag": "runonflux/blockbook-docker:latest",
      "port": 34142,
      "containerPort": 9158,
      "domains": [],
      "environmentParameters": [
        "COIN=flux",
        "BLOCKBOOK_PORT=9158",
        "REMOVE_ADDNODES=true",
        "EXTRACONFIG=addnode=65.108.10.80 addnode=65.21.130.135 addnode=95.217.207.214 addnode=38.242.223.230 addnode=24.120.133.162 addnode=192.99.13.138 addnode=192.99.13.217 addnode=37.187.88.178 addnode=46.38.251.220 addnode=95.216.118.230 addnode=94.23.203.53 addnode=37.120.160.142 addnode=95.216.20.115 addnode=64.32.48.63 addnode=64.32.48.62"
      ],
      "commands": [],
      "containerData": "/root",
      "cpu": 5.0,
      "ram": 10240,
      "hdd": 181,
      "tiered": false,
      "secrets": []
    },
    {
      "name": "scanner",
      "description": "Rich list scanner",
      "repotag": "littlestache/flux-scanner:latest",
      "port": 3001,
      "containerPort": 3001,
      "domains": [],
      "environmentParameters": [
        "BLOCKBOOK_API_URL=http://fluxblockbook_explorerstack:9158/api/v2",
        "CRON_SCHEDULE=0 2 * * *",
        "RUN_SCAN_ON_STARTUP=true",
        "MIN_BALANCE=1",
        "BATCH_SIZE=100",
        "CHECKPOINT_INTERVAL=1000"
      ],
      "commands": [],
      "containerData": "/data",
      "cpu": 1.0,
      "ram": 2048,
      "hdd": 20,
      "tiered": false,
      "secrets": []
    },
    {
      "name": "explorer",
      "description": "Explorer frontend",
      "repotag": "littlestache/flux-explorer:latest",
      "port": 3000,
      "containerPort": 3000,
      "domains": [],
      "environmentParameters": [
        "NODE_ENV=production",
        "NEXT_TELEMETRY_DISABLED=1",
        "HOSTNAME=0.0.0.0",
        "BLOCKBOOK_API_URL=http://fluxblockbook_explorerstack:9158/api/v2",
        "NEXT_PUBLIC_BLOCKBOOK_API_URL=https://blockbook-url.app.runonflux.io/api/v2",
        "SCANNER_API_URL=http://fluxscanner_explorerstack:3001"
      ],
      "commands": [],
      "containerData": "",
      "cpu": 2.0,
      "ram": 4096,
      "hdd": 10,
      "tiered": false,
      "secrets": []
    }
  ]
}
```

Save as `multi-component-app.json` and deploy:

```bash
curl -X POST https://api.runonflux.io/apps/v1/deployapp \
  -H "Content-Type: application/json" \
  -H "zelid: YOUR_ZELID" \
  -H "signature: YOUR_SIGNATURE" \
  -H "timestamp: $(date +%s)000" \
  -d @multi-component-app.json
```

### Multi-Component Networking

**Internal Communication:**
```bash
# Scanner connects to Blockbook (same app)
http://fluxblockbook_explorerstack:9158/api/v2

# Explorer connects to Scanner (same app)
http://fluxscanner_explorerstack:3001/rich-list

# Explorer connects to Blockbook (same app)
http://fluxblockbook_explorerstack:9158/api/v2
```

**External Access:**
- Blockbook: `https://explorerstack_blockbook_abc123.app.runonflux.io`
- Scanner: `https://explorerstack_scanner_def456.app.runonflux.io`
- Explorer: `https://explorerstack_explorer_ghi789.app.runonflux.io`

---

## Environment Variables

### Types of Environment Variables

1. **Build-time variables** (baked into Docker image)
   - Set in Dockerfile with `ENV`
   - Cannot be changed without rebuilding image
   - Example: `ENV NODE_ENV=production`

2. **Runtime variables** (configured in Flux)
   - Set in Flux deployment spec
   - Can be changed by updating app
   - Example: `BLOCKBOOK_API_URL=http://...`

### Common Environment Variables

#### Next.js Apps
```bash
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
HOSTNAME=0.0.0.0
PORT=3000
```

#### Node.js Apps
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

#### Database Connections
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
MONGODB_URI=mongodb://host:27017/db
```

#### API URLs (Multi-Component)
```bash
# Server-side (from explorer to blockbook)
BLOCKBOOK_API_URL=http://fluxblockbook_appname:9158/api/v2

# Client-side (from browser to blockbook)
NEXT_PUBLIC_BLOCKBOOK_API_URL=https://blockbook.app.runonflux.io/api/v2

# Scanner API
SCANNER_API_URL=http://fluxscanner_appname:3001
```

### Security Best Practices

**Never include in environment variables:**
- Private keys
- API secrets (use Flux secrets feature)
- Passwords (use Flux secrets feature)
- JWT signing keys

**Use Flux Secrets instead:**

In Web Interface:
1. Click "Add Secret" instead of "Add Environment Variable"
2. Enter key and value
3. Secret is encrypted and not visible in public app spec

In API:
```json
{
  "secrets": [
    {
      "key": "DATABASE_PASSWORD",
      "value": "supersecret123"
    }
  ]
}
```

---

## Monitoring and Management

### Flux Dashboard

Access at https://home.runonflux.io

#### My Apps Overview

- **List of all your apps**: Name, status, instances count
- **Status indicators**:
  - 🟢 Green: Running normally
  - 🟡 Yellow: Starting/Updating
  - 🔴 Red: Error/Stopped

#### App Details Page

Click on an app name to view:

**1. Instances Tab**
- Shows all FluxNodes running your app
- Geographic distribution map
- Node IP addresses and locations
- Health status of each instance

**2. Specifications Tab**
- Current app configuration
- Resource allocation
- Environment variables (non-secret)
- Docker image info

**3. Domains Tab**
- Auto-generated Flux domains
- Custom domains
- Click to open in browser

**4. Logs Tab**
- Real-time container logs
- Filter by instance
- Download logs

**5. Management Tab**
- Update app specification
- Redeploy app
- Stop/Start app
- Delete app

### Component Control

For multi-component apps, each component has its own controls:

**Via Web Interface:**
1. Click on app name
2. Select "Component Control" tab
3. Choose component from dropdown
4. Available actions:
   - Start Component
   - Stop Component
   - Restart Component
   - Pause Component
   - Unpause Component
   - Stop & Delete Data (warning: deletes persistent storage!)

**Via Browser Terminal (New Feature!):**
1. Click on app name
2. Select component
3. Click "Browser-based Interactive Terminal"
4. Select shell: `/bin/bash`, `/bin/sh`, or custom
5. Click "Connect"
6. Execute commands directly in container

**Example commands:**
```bash
# Check process status
ps aux | grep blockbook

# View logs
tail -f /var/log/app.log

# Check disk usage
du -sh /data

# Test API
curl http://localhost:9158/api
```

**Via Volume Browser (New Feature!):**
1. Click on app name
2. Select component
3. Click "Volume browser"
4. Select volume (shows persistent storage mounts)
5. Browse files
6. Download files
7. View file contents

This is useful for:
- Downloading database backups
- Inspecting log files
- Checking configuration files
- Creating bootstraps (like we discussed earlier!)

### Monitoring Tools

**1. Check App Status**
```bash
# Via API
curl https://api.runonflux.io/apps/v1/app/yourappname | jq

# Check specific instance
curl https://yourapp.app.runonflux.io/health
```

**2. Health Checks**

Add health check endpoint to your app:
```javascript
// Express.js example
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

**3. Application Logs**

View logs in Flux dashboard or via API:
```bash
curl https://api.runonflux.io/apps/v1/applogs/yourappname
```

**4. Resource Usage**

Monitor in dashboard:
- CPU usage percentage
- RAM usage (MB / total MB)
- Storage usage (GB / total GB)
- Network bandwidth

**5. External Monitoring**

Use external services to monitor your Flux app:
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://pingdom.com
- Better Uptime: https://betteruptime.com

Example configuration:
- **Monitor Type**: HTTP(s)
- **URL**: `https://yourapp.app.runonflux.io/health`
- **Interval**: 5 minutes
- **Expected Status**: 200

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: App Stuck in "Pending" Status

**Symptoms:**
- App shows yellow "Pending" status for >15 minutes
- No instances showing

**Possible Causes:**
1. No FluxNodes meet your resource requirements
2. Docker image not found or private
3. Invalid app specification

**Solutions:**
```bash
# Check if image exists and is public
docker pull yourimage:tag

# Reduce resource requirements
# Try: 1 CPU, 2GB RAM, 10GB storage

# Check app specification
curl https://api.runonflux.io/apps/v1/app/yourappname | jq
```

#### Issue 2: App Crashes Immediately

**Symptoms:**
- App starts but immediately stops
- Logs show error messages
- Status changes from "Running" to "Error"

**Possible Causes:**
1. Application error (code bug)
2. Missing environment variables
3. Port already in use
4. Insufficient permissions

**Solutions:**
```bash
# Check logs in Flux dashboard
# Look for error messages

# Common fixes:
# - Add missing environment variables
# - Fix application code
# - Change container port
# - Check Dockerfile CMD/ENTRYPOINT
```

**Debug locally:**
```bash
# Run exact same container locally
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e OTHER_VAR=value \
  yourimage:tag

# Check logs
docker logs containerid
```

#### Issue 3: Can't Access App via Domain

**Symptoms:**
- App shows "Running" status
- Logs look normal
- Domain returns timeout or 502 error

**Possible Causes:**
1. App not listening on correct port
2. App listening on localhost instead of 0.0.0.0
3. Health check failing
4. DNS propagation delay

**Solutions:**
```bash
# Verify app is listening on correct port
# In Dockerfile:
EXPOSE 3000
CMD ["node", "server.js"]

# In server code:
app.listen(3000, '0.0.0.0', () => {
  console.log('Server listening on 0.0.0.0:3000');
});

# NOT THIS:
app.listen(3000, 'localhost'); // Won't work on Flux!

# Wait 5-10 minutes for DNS propagation
# Try different auto-generated domains
```

#### Issue 4: Multi-Component Apps Can't Communicate

**Symptoms:**
- Components running individually
- Connection refused errors in logs
- ECONNREFUSED or timeout errors

**Possible Causes:**
1. Incorrect hostname pattern
2. Wrong port number
3. Components not in same app

**Solutions:**
```bash
# Correct pattern: flux{componentname}_{appname}
# Example: fluxblockbook_myapp

# Verify in environment variables:
BLOCKBOOK_API_URL=http://fluxblockbook_myapp:9158/api/v2
#                        ^^^ component     ^^^ app name

# Test from container terminal:
ping fluxblockbook_myapp
curl http://fluxblockbook_myapp:9158/api

# Check that all components are part of same app
# They must share the same app name
```

#### Issue 5: Persistent Storage Not Working

**Symptoms:**
- Data disappears after restart
- Database resets
- Uploaded files missing

**Possible Causes:**
1. Container Data path not set
2. App writing to wrong directory
3. Volume not mounted correctly

**Solutions:**
```bash
# In Flux deployment:
# Set "Container Data": /data

# In application:
# Write to /data directory
const dataPath = '/data/mydatabase.db';

# Verify in Dockerfile:
VOLUME ["/data"]

# Check volume browser in Flux dashboard
# Browse to /data and verify files exist
```

#### Issue 6: Out of Memory Errors

**Symptoms:**
- App crashes randomly
- Logs show "out of memory" or "killed"
- Status oscillates between running and error

**Solutions:**
```bash
# Increase RAM allocation
# From: 2048 MB
# To: 4096 MB or higher

# Optimize application:
# - Reduce memory usage
# - Add pagination
# - Implement caching with limits
# - Fix memory leaks
```

#### Issue 7: Slow Performance

**Symptoms:**
- App takes long to respond
- Timeouts
- High latency

**Solutions:**
```bash
# 1. Increase CPU allocation
# From: 1.0 cores
# To: 2.0 cores or higher

# 2. Add caching
# Use Redis or in-memory cache

# 3. Optimize database queries
# Add indexes, reduce joins

# 4. Use local Blockbook instead of public API
# 10-100x performance improvement

# 5. Implement CDN for static assets
# Use Flux CDN or external CDN
```

#### Issue 8: Can't Update App

**Symptoms:**
- Update button doesn't work
- Transaction fails
- App shows old version

**Solutions:**
```bash
# Method 1: Update via dashboard
# 1. Go to app details
# 2. Click "Update App"
# 3. Change specifications
# 4. Click "Update" and approve transaction

# Method 2: Redeploy
# If update fails, redeploy entirely:
# 1. Note down all settings
# 2. Delete app
# 3. Wait 5 minutes
# 4. Deploy fresh with new settings

# Method 3: Update via API
curl -X POST https://api.runonflux.io/apps/v1/updateapp \
  -H "zelid: YOUR_ZELID" \
  -H "signature: YOUR_SIGNATURE" \
  -H "timestamp: $(date +%s)000" \
  -d @updated-spec.json
```

---

## Cost Estimation

### Base Cost Formula

```
Monthly Cost = (CPU × CPU_RATE) + (RAM × RAM_RATE) + (Storage × STORAGE_RATE)
```

**Current Rates (Approximate):**
- CPU: ~10-15 FLUX per core per month
- RAM: ~0.01 FLUX per MB per month
- Storage: ~0.3-0.5 FLUX per GB per month

### Example Calculations

#### Small Web App
```
Specs: 1 CPU, 2 GB RAM, 10 GB storage

Cost = (1 × 10) + (2048 × 0.01) + (10 × 0.5)
     = 10 + 20.48 + 5
     = ~35.5 FLUX/month
```

#### Medium Web App
```
Specs: 2 CPU, 4 GB RAM, 20 GB storage

Cost = (2 × 10) + (4096 × 0.01) + (20 × 0.5)
     = 20 + 40.96 + 10
     = ~71 FLUX/month
```

#### Flux Explorer (Single Component)
```
Specs: 2 CPU, 4 GB RAM, 10 GB storage

Cost = (2 × 10) + (4096 × 0.01) + (10 × 0.5)
     = 20 + 40.96 + 5
     = ~66 FLUX/month
```

#### Flux Explorer + Blockbook (2 Components)
```
Blockbook: 5 CPU, 10 GB RAM, 181 GB storage
Explorer: 2 CPU, 4 GB RAM, 10 GB storage

Total: 7 CPU, 14 GB RAM, 191 GB storage

Cost = (7 × 10) + (14336 × 0.01) + (191 × 0.5)
     = 70 + 143.36 + 95.5
     = ~309 FLUX/month
```

#### Full Stack with Scanner (3 Components)
```
Blockbook: 5 CPU, 10 GB RAM, 181 GB storage
Scanner: 1 CPU, 2 GB RAM, 20 GB storage
Explorer: 2 CPU, 4 GB RAM, 10 GB storage

Total: 8 CPU, 16 GB RAM, 211 GB storage

Cost = (8 × 10) + (16384 × 0.01) + (211 × 0.5)
     = 80 + 163.84 + 105.5
     = ~349 FLUX/month
```

### Cost Comparison with Traditional Cloud

| Provider | Similar Specs | Monthly Cost (USD) |
|----------|---------------|-------------------|
| **Flux** | 2 CPU, 4 GB RAM, 10 GB | ~$8-15 (66 FLUX @ $0.12-0.23) |
| AWS EC2 | t3.medium (2 vCPU, 4 GB) | ~$30-40 |
| Google Cloud | e2-medium (2 vCPU, 4 GB) | ~$25-35 |
| DigitalOcean | Basic Droplet (2 vCPU, 4 GB) | ~$24 |
| Azure | B2s (2 vCPU, 4 GB) | ~$30-40 |

**Flux is typically 50-75% cheaper than traditional cloud!**

### Payment and Billing

**How Flux Billing Works:**

1. **Pre-payment**: Pay upfront for deployment
2. **Monthly renewal**: Charged automatically every 30 days
3. **Pay from balance**: FLUX deducted from your wallet
4. **Grace period**: 7 days after payment due
5. **Auto-removal**: App deleted if payment not made

**Check App Balance:**
```bash
curl https://api.runonflux.io/apps/v1/app/yourappname | jq '.data.expire'
```

**Renew App Manually:**
```bash
# Via dashboard: Click "Extend" button
# Via API: Use /extendapp endpoint
```

**Monitor Costs:**
- Dashboard shows current spend
- Estimate at deployment time
- Monthly invoices in transaction history

---

## Best Practices

### 1. Docker Image Optimization

```dockerfile
# ✅ Good: Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]

# ❌ Bad: Single stage, large image
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

**Tips:**
- Use Alpine base images (smaller)
- Multi-stage builds to reduce size
- .dockerignore to exclude unnecessary files
- Minimize layers

### 2. Environment Variable Management

```bash
# ✅ Good: Use environment variables
DATABASE_URL=${DATABASE_URL}
API_KEY=${API_KEY}

# ❌ Bad: Hardcoded values
DATABASE_URL=postgresql://user:pass@host:5432/db
API_KEY=abc123secret456
```

**Tips:**
- Never hardcode secrets
- Use Flux secrets feature
- Document required env vars
- Provide sensible defaults

### 3. Health Checks

```javascript
// ✅ Good: Comprehensive health check
app.get('/health', async (req, res) => {
  try {
    // Check database
    await db.ping();

    // Check external APIs
    await fetch('https://api.example.com/status');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### 4. Logging

```javascript
// ✅ Good: Structured logging
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

logger.info('Server started', { port: 3000 });
logger.error('Database error', { error: err.message });
```

**Tips:**
- Use structured logging (JSON)
- Include timestamps
- Log to stdout/stderr (not files)
- Use appropriate log levels

### 5. Graceful Shutdown

```javascript
// ✅ Good: Handle shutdown signals
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');

  // Stop accepting new requests
  server.close();

  // Close database connections
  await db.close();

  // Exit
  process.exit(0);
});
```

### 6. Resource Limits

```javascript
// ✅ Good: Implement pagination
app.get('/api/items', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);

  const items = getItems(page, limit);
  res.json({ items, page, limit });
});

// ❌ Bad: No limits
app.get('/api/items', (req, res) => {
  const items = getAllItems(); // Could be millions!
  res.json(items);
});
```

### 7. Security

```javascript
// ✅ Good: Security headers
const helmet = require('helmet');
app.use(helmet());

// Rate limiting
const rateLimit = require('express-rate-limit');
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Input validation
const { body, validationResult } = require('express-validator');
app.post('/api/user', [
  body('email').isEmail(),
  body('name').trim().isLength({ min: 1, max: 100 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process request
});
```

### 8. Monitoring and Alerts

```javascript
// ✅ Good: Export metrics
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

### 9. Database Connections

```javascript
// ✅ Good: Connection pooling
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ❌ Bad: New connection per request
app.get('/api/users', async (req, res) => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();
  const result = await client.query('SELECT * FROM users');
  await client.end();
  res.json(result.rows);
});
```

### 10. Testing Before Deployment

```bash
# ✅ Always test locally first!

# Test Docker build
docker build -t myapp:test .

# Test Docker run with exact Flux environment
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=... \
  myapp:test

# Test health endpoint
curl http://localhost:3000/health

# Test API endpoints
curl http://localhost:3000/api/users

# Load test
ab -n 1000 -c 10 http://localhost:3000/

# Only deploy to Flux after local tests pass!
```

---

## Additional Resources

### Flux Documentation
- Official Docs: https://docs.runonflux.io
- Flux Wiki: https://wiki.runonflux.io
- API Reference: https://api.runonflux.io/docs

### Community
- Discord: https://discord.gg/runonflux
- Telegram: https://t.me/runonflux
- Twitter: https://twitter.com/RunOnFlux
- Reddit: https://reddit.com/r/Flux

### Developer Tools
- Flux Dashboard: https://home.runonflux.io
- Flux Explorer: https://explorer.runonflux.io
- Flux Apps Marketplace: https://home.runonflux.io/apps

### Support
- GitHub Issues: https://github.com/RunOnFlux/flux
- Discord Support: #support channel
- Email: support@runonflux.io

---

## Conclusion

You now have a comprehensive understanding of deploying applications to the Flux network! Key takeaways:

✅ **Two deployment methods**: Web interface (easy) and API (automation)
✅ **Multi-component apps**: Deploy complex stacks with internal networking
✅ **Cost-effective**: 50-75% cheaper than traditional cloud
✅ **Decentralized**: No single point of failure
✅ **Global distribution**: Automatic deployment worldwide

**Next Steps:**
1. Build and test your Docker image locally
2. Push image to Docker Hub
3. Deploy to Flux using web interface
4. Monitor and optimize
5. Scale as needed

Happy deploying! 🚀

---

**Document Version:** 1.0.0
**Last Updated:** October 11, 2025
**Maintainer:** Sikbik
**License:** MIT
