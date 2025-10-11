# Flux Blockchain Explorer

A modern, real-time blockchain explorer for the Flux network. Built with Next.js 14 and powered by the Blockbook API.

![Flux Explorer](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## ✨ Features

- 🔍 **Smart Search** - Automatically detects blocks, transactions, and addresses
- 📊 **Network Statistics** - Real-time metrics including circulating supply, block time, and transaction count
- 🔗 **Block Explorer** - Browse blocks with full transaction details
- 💰 **Transaction Viewer** - Detailed transaction info with FluxNode tier detection (STRATUS/NIMBUS/CUMULUS)
- 📍 **Address Tracker** - Monitor balances and transaction history
- ⛏️ **Block Rewards** - Live visualization of mining rewards and FluxNode payouts
- 🔄 **Real-time Updates** - Auto-refreshing data every 10-30 seconds
- 📱 **Responsive Design** - Seamless experience on all devices
- 🎨 **Modern UI** - Clean, professional interface with dark theme

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/flux-explorer.git
cd flux_explorer/flux-explorer

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

## 📁 Project Structure

```
flux_explorer/
├── flux-explorer/              # Main Next.js application
│   ├── src/
│   │   ├── app/               # Next.js app router pages
│   │   │   ├── block/         # Block detail pages
│   │   │   ├── tx/            # Transaction pages
│   │   │   ├── address/       # Address pages
│   │   │   ├── blocks/        # Block list page
│   │   │   └── api/           # Server-side API routes
│   │   ├── components/        # React components
│   │   │   ├── block/         # Block components
│   │   │   ├── transaction/   # Transaction components
│   │   │   ├── address/       # Address components
│   │   │   ├── home/          # Homepage components
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── lib/               # Utilities & API clients
│   │   │   └── api/           # Flux API client & hooks
│   │   ├── types/             # TypeScript definitions
│   │   └── hooks/             # Custom React hooks
│   └── public/                # Static assets
└── README.md                  # This file
```

## 🎯 Key Features

### FluxNode Tier Detection
Automatically identifies FluxNode types based on block reward amounts:
- **STRATUS** (11.25 FLUX) - Blue badge
- **NIMBUS** (4.6875 FLUX) - Purple badge
- **CUMULUS** (2.8125 FLUX) - Pink badge
- **MINER** (Other amounts) - Yellow badge

### Real-time Updates
Components refresh automatically:
- Latest blocks: Every 10 seconds
- Block rewards: Every 10 seconds
- Network stats: Every 30 seconds (with server-side caching)

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

## 🔧 Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🌐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_BLOCKBOOK_API_URL` | Blockbook API endpoint | `https://blockbookflux.app.runonflux.io/api/v2` |

## 📖 Documentation

- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - Complete Docker deployment guide
- **[DOCKER_QUICK_START.md](DOCKER_QUICK_START.md)** - Quick Docker reference
- **[FEATURE_ROADMAP.md](FEATURE_ROADMAP.md)** - Planned features and development roadmap
- **[FLUX_API_DOCS.md](FLUX_API_DOCS.md)** - Blockchain API documentation
- **[flux-explorer/README.md](flux-explorer/README.md)** - Application-specific documentation

## 🐳 Docker Deployment

For production deployment with Docker, see [DOCKER_SETUP.md](DOCKER_SETUP.md).

Quick start:
```bash
cd flux-explorer
docker build -t flux-explorer .
docker run -p 3000:3000 flux-explorer
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built for the [Flux](https://runonflux.io/) blockchain network
- Powered by [Blockbook](https://github.com/trezor/blockbook) API
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Data provided by [CoinMarketCap](https://coinmarketcap.com/) API

## 🔗 Links

- **Flux Website:** https://runonflux.io
- **Flux Documentation:** https://docs.runonflux.io
- **Official Flux Explorer:** https://explorer.runonflux.io
- **Blockbook API:** https://blockbookflux.app.runonflux.io

---

Built with ❤️ for the Flux community
