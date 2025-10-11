# Flux Blockchain Explorer

A modern, high-performance blockchain explorer for the Flux network. Built with Next.js 14, TypeScript, and powered by the Blockbook API.

[![Security](https://img.shields.io/badge/security-A+-brightgreen)](SECURITY.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Features

### Core Functionality
- 🔍 **Universal Search** - Intelligent search for blocks, transactions, and addresses
- 📊 **Live Network Statistics** - Real-time blockchain metrics and analytics
- 🔗 **Block Explorer** - Browse blocks with detailed transaction breakdowns
- 💰 **Transaction Viewer** - Comprehensive transaction details with UTXO tracking
- 📍 **Address Tracker** - Monitor balances, transaction history with pagination
- ⛏️ **Mining Rewards** - Live visualization of block rewards and FluxNode payouts

### FluxNode Features
- 🏆 **Tier Detection** - Automatic identification of CUMULUS, NIMBUS, STRATUS nodes
- 🔔 **Node Confirmations** - Real-time FluxNode confirmation tracking
- 📈 **Tier Statistics** - Breakdown of node confirmations by tier
- 🎨 **Color-Coded Badges** - Visual distinction of different node tiers

### Technical Features
- ⚡ **Optimized Performance** - Aggressive caching, minimal API calls
- 🔄 **Real-time Updates** - Auto-refreshing data with smart polling intervals
- 📱 **Responsive Design** - Seamless experience on desktop, tablet, and mobile
- 🔒 **Security Hardened** - Zero vulnerabilities, input validation, XSS protection
- 🚀 **Production Ready** - Docker-optimized, health checks, monitoring

## Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, React Server Components)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) v3
- **UI Components:** [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Data Fetching:** [TanStack React Query](https://tanstack.com/query) v5
- **HTTP Client:** [ky](https://github.com/sindresorhus/ky) (Modern fetch wrapper)
- **Charts:** [Recharts](https://recharts.org/) (Data visualization)
- **API:** [Blockbook](https://github.com/trezor/blockbook) v2

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, pnpm, or bun
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Sikbik/flux-explorer-next.git
cd flux-explorer-next
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment** (optional)

Copy the example environment file:
```bash
cp .env.example .env.local
```

The default configuration works out of the box:
```env
NEXT_PUBLIC_BLOCKBOOK_API_URL=https://blockbookflux.app.runonflux.io/api/v2
```

4. **Start development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the explorer.

## Scripts

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint checks
```

## Project Structure

```
flux-explorer/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Home page
│   │   ├── blocks/            # Blocks list page
│   │   ├── block/[hash]/      # Block detail pages
│   │   ├── tx/[txid]/         # Transaction detail pages
│   │   ├── address/[address]/ # Address detail pages
│   │   ├── search/[query]/    # Universal search handler
│   │   └── api/               # Server-side API routes
│   │       ├── supply/        # Coinmarketcap supply proxy
│   │       ├── transactions-24h/  # 24h transaction stats
│   │       └── block-counts/  # Optimized block tx counts
│   ├── components/            # React components
│   │   ├── blocks/            # Block list components
│   │   ├── block/             # Block detail components
│   │   ├── transaction/       # Transaction components
│   │   ├── address/           # Address components
│   │   ├── home/              # Homepage components
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── Header.tsx         # Navigation header
│   │   ├── Footer.tsx         # Site footer
│   │   └── SearchBar.tsx      # Universal search
│   ├── lib/                   # Core utilities
│   │   ├── api/               # API client layer
│   │   │   ├── client.ts      # Flux API wrapper
│   │   │   ├── blockbook-client.ts  # Blockbook integration
│   │   │   ├── hooks/         # React Query hooks
│   │   │   └── ...
│   │   ├── flux-tx-parser.ts  # FluxNode transaction parser
│   │   └── utils.ts           # Helper functions
│   ├── hooks/                 # Custom React hooks
│   │   └── useBlockTransactionCounts.ts  # Block tx cache
│   └── types/                 # TypeScript definitions
│       └── flux-api.ts        # API type definitions
├── public/                    # Static assets
├── .env.example               # Environment template
├── .env.local                 # Local config (gitignored)
├── next.config.mjs            # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
├── Dockerfile                 # Docker production build
├── docker-compose.yml         # Docker Compose config
├── DEPLOYMENT.md              # Deployment guide
└── README.md                  # This file
```

## Features in Detail

### FluxNode Tier Detection

The explorer automatically identifies FluxNode tiers based on collateral amounts:

| Tier | Collateral | Badge Color | Description |
|------|-----------|-------------|-------------|
| **STRATUS** | 40,000 FLUX | 🔵 Blue | Highest tier node |
| **NIMBUS** | 12,500 FLUX | 🟣 Purple | Mid tier node |
| **CUMULUS** | 1,000 FLUX | 🟠 Pink | Entry tier node |
| **STARTING** | N/A | 🟡 Yellow | Node initialization |
| **MINER** | N/A | 🟡 Amber | Block mining reward |

Tiers are determined by parsing collateral transaction outputs from FluxNode confirmations.

### Search Intelligence

The search bar automatically detects input type:

- **Block Height**: Pure numbers (e.g., `123456`)
- **Block Hash**: 64-character hex string (e.g., `00000000...`)
- **Transaction ID**: 64-character hex string
- **Address**: Strings starting with `t1` or `t3`

When a 64-char hex is ambiguous, it tries transaction first, then block hash.

### Performance Optimizations

1. **Per-Block Caching** - Each block's data cached with `staleTime: Infinity`
2. **Server-Side Batching** - `/api/block-counts` fetches multiple blocks in parallel
3. **React Query** - Automatic request deduplication and background refetching
4. **Optimized Hooks** - Shared transaction caches prevent duplicate API calls
5. **Static Generation** - Non-dynamic pages pre-rendered at build time

### Real-time Updates

Components poll at optimized intervals:

- **Latest Blocks**: 10 seconds
- **Block Rewards**: 10 seconds
- **Network Stats**: 30 seconds
- **24h Transactions**: 5 minutes (server-cached)
- **Supply Data**: 5 minutes (server-cached)

## Docker Deployment

### Build & Run Locally

```bash
# Using Docker Compose (recommended)
docker-compose up --build

# Or manually
docker build -t flux-explorer:latest .
docker run -p 3000:3000 flux-explorer:latest
```

### Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions including:
- Flux network deployment
- Resource requirements
- Health monitoring
- Scaling strategies

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_BLOCKBOOK_API_URL` | Blockbook API endpoint | `https://blockbookflux.app.runonflux.io/api/v2` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3000` | No |

All blockchain data is fetched from the public Blockbook API - no authentication required.

## Security

This project has undergone comprehensive security auditing:

- ✅ **Zero CVEs** - All dependencies up-to-date and secure
- ✅ **Input Validation** - All user inputs sanitized with regex validation
- ✅ **XSS Protection** - React's built-in sanitization, no `dangerouslySetInnerHTML`
- ✅ **No Injection Risks** - No eval(), no shell execution, no dynamic code
- ✅ **SSRF Protected** - Hardcoded API URLs, validated user input
- ✅ **Error Handling** - Generic error messages, no stack trace leakage
- ✅ **Type Safety** - 100% TypeScript with strict mode

**Security Score: 9.5/10** - See security audit report for details.

## API Endpoints

### Client API (Blockbook)
- `GET /api/v2/block/{hashOrHeight}` - Fetch block details
- `GET /api/v2/tx/{txid}` - Fetch transaction details
- `GET /api/v2/address/{address}` - Fetch address information
- `GET /api/v2/api` - Network status and statistics

### Server API Routes
- `GET /api/supply` - Circulating/max supply from CoinMarketCap
- `GET /api/transactions-24h` - 24-hour transaction statistics
- `GET /api/block-counts?hashes=...` - Bulk transaction counts for blocks

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Use TypeScript strict mode
- Follow existing code style (ESLint)
- Add tests for new features
- Update documentation as needed
- Keep commits atomic and well-described

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Flux Team** - For building the amazing Flux blockchain network
- **Blockbook** - Trezor's excellent blockchain indexer
- **shadcn** - Beautiful, accessible UI components
- **Vercel** - Next.js framework and inspiration
- **Community** - All contributors and users

## Links

- **GitHub Repository**: [https://github.com/Sikbik/flux-explorer-next](https://github.com/Sikbik/flux-explorer-next)
- **Live Explorer**: [Coming Soon - Will be deployed on Flux Network]
- **Flux Website**: [https://runonflux.io/](https://runonflux.io/)
- **Flux GitHub**: [https://github.com/RunOnFlux](https://github.com/RunOnFlux)
- **Blockbook API**: [https://github.com/trezor/blockbook](https://github.com/trezor/blockbook)

## Support

- **Issues**: [GitHub Issues](https://github.com/Sikbik/flux-explorer-next/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Sikbik/flux-explorer-next/discussions)
- **Flux Discord**: [https://discord.gg/flux](https://discord.gg/flux)

---

**Built with ❤️ for the Flux community**
