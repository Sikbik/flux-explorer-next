# Flux Blockchain Explorer

A modern, real-time blockchain explorer for the Flux network. Built with Next.js 14 and powered by the Blockbook API.

![Flux Explorer](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![Security](https://img.shields.io/badge/Security-98%2F100-brightgreen)

## ✨ Features

### Core Features
- 🔍 **Smart Search** - Automatically detects blocks, transactions, and addresses
- 📊 **Network Statistics** - Real-time metrics including circulating supply, block time, and transaction count
- 🔗 **Block Explorer** - Browse blocks with full transaction details
- 💰 **Transaction Viewer** - Detailed transaction info with FluxNode tier detection (STRATUS/NIMBUS/CUMULUS)
- 📍 **Address Tracker** - Monitor balances and transaction history with CSV export
- ⛏️ **Block Rewards** - Live visualization of mining rewards and FluxNode payouts
- 📈 **Rich List** - Top Flux holders with balance distribution analytics
- 📱 **Responsive Design** - Seamless experience on all devices
- 🎨 **Modern UI** - Clean, professional interface with dark theme

### Advanced Features
- 🎯 **Smart API Detection** - Auto-detects local vs public Blockbook and adapts settings
- ⚡ **Dynamic Rate Limiting** - 10x faster updates when running local Blockbook (3s vs 30s polling)
- 🔄 **Automatic Failover** - Seamlessly switches between local and public APIs based on health
- 🏥 **Health Monitoring** - Built-in endpoint health checks with intelligent switching
- 🐳 **Flux-Native Deployment** - Generic Docker image works with any Flux deployment using runtime environment variables

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/RunOnFlux/flux-explorer.git
cd flux-explorer/flux-explorer

# Install dependencies
npm install

# Configure environment (optional - uses public Blockbook API by default)
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the explorer.

## 🏗️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Data Fetching:** [TanStack React Query](https://tanstack.com/query)
- **HTTP Client:** [ky](https://github.com/sindresorhus/ky)
- **Blockchain API:** [Blockbook](https://github.com/trezor/blockbook) by Trezor
- **Charts:** [Recharts](https://recharts.org/)

## 📁 Project Structure

```
flux-explorer/
├── flux-explorer/              # Main Next.js application
│   ├── src/
│   │   ├── app/               # Next.js app router pages
│   │   │   ├── api/           # Server-side API routes
│   │   │   │   ├── health/    # Dynamic endpoint detection
│   │   │   │   ├── supply/    # CoinMarketCap proxy
│   │   │   │   ├── rich-list/ # Rich list data
│   │   │   │   └── ...
│   │   │   ├── block/         # Block detail pages
│   │   │   ├── tx/            # Transaction pages
│   │   │   ├── address/       # Address pages
│   │   │   ├── blocks/        # Block list page
│   │   │   └── rich-list/     # Rich list page
│   │   ├── components/        # React components
│   │   │   ├── block/         # Block components
│   │   │   ├── transaction/   # Transaction components
│   │   │   ├── address/       # Address components
│   │   │   ├── home/          # Homepage components
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── lib/               # Utilities & API clients
│   │   │   └── api/           # API configuration
│   │   │       ├── config.ts  # Dynamic rate limiting
│   │   │       ├── health-monitor.ts # Health checks
│   │   │       └── hooks/     # React Query hooks
│   │   ├── types/             # TypeScript definitions
│   │   └── hooks/             # Custom React hooks
│   ├── public/                # Static assets
│   ├── Dockerfile             # Production Docker build
│   ├── package.json           # Dependencies and scripts
│   ├── .env.example           # Environment variables template
│   ├── README.md              # Explorer documentation
│   └── DEPLOYMENT.md          # Deployment guide
├── flux-scanner/              # Blockchain scanner component
│   ├── src/
│   │   ├── scanner.ts         # Block/transaction scanner
│   │   ├── config.ts          # Dynamic scanning config
│   │   ├── server.ts          # Rich list API server
│   │   ├── index.ts           # Entry point
│   │   └── types.ts           # TypeScript definitions
│   ├── Dockerfile             # Scanner Docker build
│   ├── package.json           # Dependencies and scripts
│   ├── README.md              # Scanner documentation
│   └── DOCKER_COMMANDS.md     # Quick reference for Docker commands
├── README.md                  # Main project documentation
├── FLUX_DEPLOYMENT_TUTORIAL.md # Complete Flux deployment guide
└── .gitignore                 # Git ignore configuration
```

## 🎯 Key Features

### Smart API Detection & Dynamic Rate Limiting

**Auto-adaptive performance** based on your Blockbook instance:

| Mode | Polling | Batch Size | Use Case |
|------|---------|------------|----------|
| **Local** | 3 seconds | 500 blocks | Running your own Blockbook |
| **Public** | 30 seconds | 50 blocks | Using public API |
| **Auto** | Adaptive | Adaptive | Automatically switches based on health |

**How it works:**
1. Explorer detects available Blockbook endpoints at runtime
2. Health monitor checks endpoint availability and response time
3. Automatically switches to local mode when available (10x faster)
4. Falls back to public API if local instance is unavailable

**One sentence explanation:**
*Smart API detection gives you 10x faster updates when running your own Blockbook, with automatic fallback to public APIs if your local instance goes offline.*

### FluxNode Tier Detection
Automatically identifies FluxNode types based on block reward amounts:
- **STRATUS** (11.25 FLUX) - Blue badge
- **NIMBUS** (4.6875 FLUX) - Purple badge
- **CUMULUS** (2.8125 FLUX) - Pink badge
- **MINER** (Other amounts) - Yellow badge

### Real-time Updates
Components refresh automatically:
- **Local Mode**: Every 3 seconds (when running local Blockbook)
- **Public Mode**: Every 30 seconds (conservative, avoids rate limits)
- Network stats: Cached on server-side for performance

### Smart Search
Automatically detects search type:
- Block heights (numbers like `2009100`)
- Block hashes (64-char hex)
- Transaction IDs (64-char hex)
- Addresses (t1/t3 prefixes)

### Network Statistics
Real-time metrics:
- Current block height
- Circulating & max supply (from CoinMarketCap)
- Average block time (calculated from last 100 blocks)
- 24-hour transaction count (cached for performance)
- FluxNode count & ArcaneOS adoption rate

### Rich List Analytics
- Top 1000 Flux holders
- Balance distribution charts
- Address rankings with percentages
- Paginated view with search
- Real-time updates from scanner component

## 🔧 Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🌐 Environment Variables

### Explorer Configuration

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_BLOCKBOOK_API_URL` | Public | Public Blockbook API endpoint | `https://blockbookflux.app.runonflux.io/api/v2` |
| `NEXT_PUBLIC_LOCAL_BLOCKBOOK_API_URL` | Public | Local Blockbook endpoint (optional) | Not set |
| `NEXT_PUBLIC_API_MODE` | Public | API mode (`auto`, `local`, `public`) | `auto` |
| `BLOCKBOOK_API_URL` | Runtime | Server-side Blockbook URL (for Flux deployments) | Not set |
| `SCANNER_API_URL` | Runtime | Scanner component URL (for Flux deployments) | Not set |

### For Flux Deployment

When deploying to Flux, set these runtime environment variables:

```bash
BLOCKBOOK_API_URL=http://fluxblockbook_yourappname:9158/api/v2
SCANNER_API_URL=http://fluxscanner_yourappname:3001
```

The explorer will automatically detect and use your local Blockbook instance with aggressive settings (3s polling, large batches).

See [FLUX_DEPLOYMENT_TUTORIAL.md](FLUX_DEPLOYMENT_TUTORIAL.md) for complete deployment guide.

## 📖 Documentation

### Getting Started
- **[README.md](README.md)** - This file (overview and quick start)
- **[.env.example](flux-explorer/.env.example)** - Environment variable reference

### Deployment
- **[FLUX_DEPLOYMENT_TUTORIAL.md](FLUX_DEPLOYMENT_TUTORIAL.md)** - Complete Flux deployment guide with 3-component architecture
- **[Dockerfile](flux-explorer/Dockerfile)** - Production Docker configuration

### Architecture & Implementation
- **[DYNAMIC_API_CONFIGURATION.md](DYNAMIC_API_CONFIGURATION.md)** - Smart API detection and dynamic rate limiting
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Quick reference for implementation details
- **[RICH_LIST_IMPLEMENTATION.md](RICH_LIST_IMPLEMENTATION.md)** - Rich list feature documentation

### Security & Maintenance
- **[SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)** - Comprehensive security audit (98/100 score)
- **[AUDIT_CLEANUP_SUMMARY.md](AUDIT_CLEANUP_SUMMARY.md)** - Recent audit summary

### Planning
- **[ROADMAP.md](ROADMAP.md)** - Planned features and development roadmap

## 🐳 Docker Deployment

### Quick Start

```bash
# Build
cd flux-explorer
docker build -t flux-explorer:latest .

# Run with public API
docker run -p 3000:3000 flux-explorer:latest

# Run with local Blockbook
docker run -p 3000:3000 \
  -e BLOCKBOOK_API_URL=http://your-blockbook:9158/api/v2 \
  flux-explorer:latest
```

### Flux Deployment

The explorer is designed to run on Flux with automatic local Blockbook detection:

```bash
# Deploy to Flux with 3 components:
# 1. Blockbook (blockchain indexer)
# 2. Scanner (rich list data processor)
# 3. Explorer (web interface)

# See FLUX_DEPLOYMENT_TUTORIAL.md for complete guide
```

**Key Features for Flux:**
- Generic Docker image (no hardcoded component names)
- Runtime environment variable configuration
- Automatic local endpoint detection via internal Flux DNS
- Health monitoring with automatic failover
- ~150MB optimized image size

## 🏥 Health Monitoring

The explorer includes built-in health monitoring that:

1. **Detects available endpoints** at startup (local + public)
2. **Checks health** of each endpoint every 30-60 seconds
3. **Automatically switches** to the fastest healthy endpoint
4. **Falls back** to public API if local becomes unavailable
5. **Logs status** to browser console for transparency

View health status in browser console:
```
[Health Monitor] LOCAL endpoint: healthy (7ms)
[Health Monitor] PUBLIC endpoint: healthy (558ms)
[Health Monitor] Switching to LOCAL endpoint
[API Config] Switched to LOCAL mode (aggressive settings)
```

## 🔒 Security

- ✅ **Zero vulnerabilities** in dependencies (502 packages scanned)
- ✅ **No hardcoded secrets** - all config via environment variables
- ✅ **Docker security** - runs as non-root user (nextjs:nodejs)
- ✅ **API validation** - all inputs validated and sanitized
- ✅ **Rate limiting** - intelligent caching prevents API abuse
- ✅ **Security score: 98/100** (see [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md))

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write clean, documented code
- Test with both local and public Blockbook
- Update documentation for new features
- Run `npm run lint` before committing

## 📊 Performance

- **Bundle size**: ~150MB Docker image (optimized)
- **First Load JS**: 87.3 kB (gzipped)
- **Local mode**: 3-second updates, 500 block batches
- **Public mode**: 30-second updates, 50 block batches
- **Caching**: Intelligent server-side caching for expensive queries

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built for the [Flux](https://runonflux.io/) blockchain network
- Powered by [Blockbook](https://github.com/trezor/blockbook) API by Trezor
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Data provided by [CoinMarketCap](https://coinmarketcap.com/) API
- Icons from [Lucide](https://lucide.dev/)

## 🔗 Links

- **Flux Website:** https://runonflux.io
- **Flux Documentation:** https://docs.runonflux.io
- **Official Flux Explorer:** https://explorer.runonflux.io
- **Blockbook API:** https://blockbookflux.app.runonflux.io
- **Flux GitHub:** https://github.com/RunOnFlux

## 📈 Recent Updates

### Version 1.0.0-rc1 (October 2025)

#### Transaction Export Enhancements
- ✅ **Fixed progress bar accuracy** - Shows correct export progress
- ✅ **Mining pool transaction support** - Properly displays multi-recipient transactions
- ✅ **Enhanced JSON metadata** - Added transaction input/output counts

#### Blockbook Bootstrap System
- ✅ **Automated backup creation** - Generate 53GB compressed Blockbook backup
- ✅ **Fast deployment** - Restore in 30 minutes (saves 4-7 hours)
- ✅ **Cloudflare R2 integration** - Affordable hosting solution ($0.80/month)
- ✅ **Progress monitoring** - Real-time sync tracking with ETA

#### Scanner Service
- ✅ **Production Docker image** - Autonomous rich list generator
- ✅ **Performance optimization** - 3x faster scanning with LOCAL mode
- ✅ **Resilient error handling** - Extended timeouts and retry logic for large transactions
- ✅ **Dynamic configuration** - Auto-adapts to local vs public Blockbook

#### Previous Features
- ✅ Smart API detection with automatic local/public switching
- ✅ Dynamic rate limiting (3s local, 30s public)
- ✅ Health monitoring with automatic failover
- ✅ Runtime environment variable support for Flux deployments
- ✅ Comprehensive security audit (98/100 score)
- ✅ Code cleanup and optimization
- ✅ Rich list feature with top 1000 holders
- ✅ CSV/JSON export for address transactions
- ✅ FluxNode tier detection
- ✅ Real-time network statistics

## 📄 Additional Documentation

- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Comprehensive project state and accomplishments
- **[BLOCKBOOK_BOOTSTRAP_GUIDE.md](BLOCKBOOK_BOOTSTRAP_GUIDE.md)** - Complete bootstrap creation and usage guide
- **[BLOCKBOOK_R2_INTEGRATION.md](BLOCKBOOK_R2_INTEGRATION.md)** - Cloudflare R2 hosting setup

---

Built with ❤️ for the Flux community
