# VirBiCoin Explorer

<img src="public/img/explorer-logo.png" alt="VBC Explorer logo" height="200" />

[![Lint/Format](https://github.com/virbicoin/vbc-explorer/actions/workflows/lint.yml/badge.svg)](https://github.com/virbicoin/vbc-explorer/actions/workflows/lint.yml)
[![Node.js CI](https://github.com/virbicoin/vbc-explorer/actions/workflows/node.js.yml/badge.svg)](https://github.com/virbicoin/vbc-explorer/actions/workflows/node.js.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<b>Live Version: [explorer.digitalregion.jp](https://explorer.digitalregion.jp)</b>

A modern, real-time blockchain explorer for the VirBiCoin network built with Next.js App Router, TypeScript, and MongoDB.

## Features

- **Real-time Blockchain Sync** - Live synchronization of blocks and transactions from VirBiCoin network
- **Advanced Statistics** - Network hashrate, difficulty, mining analytics, and performance metrics
- **NFT Support** - Complete VRC-721 and VRC-1155 token tracking with metadata and image loading
- **Contract Verification** - Smart contract source code verification with Solidity compiler integration
- **Rich List** - Real-time account balance tracking and wealth distribution analysis
- **Token Management** - VRC-20 token tracking with holder analytics and transfer history
- **Price Tracking** - Real-time VBC price updates from multiple external APIs
- **Contract Interaction** - Direct smart contract interaction interface with ABI support
- **Advanced Search** - Search blocks, transactions, addresses, tokens, and contracts
- **Responsive Design** - Modern UI optimized for desktop, tablet, and mobile devices
- **TypeScript** - Full TypeScript support for enhanced development experience
- **Production Ready** - Optimized builds, error handling, and performance monitoring

## Tech Stack

- **Frontend**: Next.js 15+ (App Router), React 19+, TypeScript 5+, Tailwind CSS v4
- **Backend**: Node.js 18+, TypeScript, MongoDB 6.0+, Mongoose ODM
- **Blockchain**: Web3.js v4, VirBiCoin RPC (port 8329)
- **Development**: ts-node, ESLint, Prettier
- **Deployment**: Docker, PM2, production builds

## Local Installation

### Prerequisites

- **Node.js 18+** and npm
- **MongoDB 6.0+** with authentication enabled
- **VirBiCoin node** running on localhost:8329 with RPC enabled
- **Minimum 4GB RAM** and **20GB storage** for full blockchain data

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/virbicoin/vbc-explorer
cd vbc-explorer
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure MongoDB Authentication**
```bash
# Start MongoDB and create database user
mongosh
use explorerDB
db.createUser({
  user: "explorer",
  pwd: "your_secure_password",
  roles: [{ role: "readWrite", db: "explorerDB" }]
})
exit
```

4. **Set up environment variables**
```bash
# Create environment configuration
cat > .env.local << EOF
MONGODB_URI=mongodb://explorer:your_secure_password@localhost:27017/explorerDB
NODE_ENV=development
PORT=3000
EOF
```

5. **Configure application settings** (optional)
```bash
# Copy and customize configuration
cp config.example.json config.json
# Edit config.json for your VirBiCoin node settings
```

6. **Start VirBiCoin node** (ensure RPC is enabled)
```bash
# Verify node is running and accessible
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8329
```

7. **Start the development server**
```bash
npm run dev
```

8. **Initialize blockchain data** (in a separate terminal)
```bash
# Start all data synchronization services
npm run data:start

# Or start services individually
npm run data:start:sync    # Blockchain synchronization
npm run data:start:stats   # Network statistics
npm run data:start:rich    # Account richlist
npm run data:start:tokens  # Token tracking
```

The explorer will be available at `http://localhost:3000`

### Alternative: Docker Setup

```bash
# Start with Docker Compose
docker-compose up -d

# The explorer will be available at http://localhost:3000
# MongoDB will be accessible on localhost:27017
```
    "0x6C0DB3Ea9EEd7ED145f36da461D84A8d02596B08": "coolpool.top"
  }
}
```

### Configuration Options

| Name | Description |
|------|-------------|
| `nodeAddr` | VirBiCoin node RPC address |
| `port` | RPC port (default: 8329) |
| `wsPort` | WebSocket port (default: 8330) |
| `bulkSize` | Number of blocks to process in bulk |
| `syncAll` | Sync all blocks from start |
| `quiet` | Suppress console output |
| `useRichList` | Enable rich list functionality |
| `enableNFT` | Enable NFT tracking |
| `enableContractVerification` | Enable contract verification |
| `settings.useFiat` | Enable USD price display |
| `settings.symbol` | Currency symbol |
| `miners` | Known miner addresses and names |

## Database Setup

### MongoDB Authentication (Recommended)

For production environments, configure MongoDB authentication:

1. **Create admin user**
```bash
mongosh
> use admin
> db.createUser({ user: "admin", pwd: "<secure_password>", roles: ["root"] })
```

2. **Create explorer database user**
```bash
> use vbc-explorer
> db.createUser({ user: "explorer", pwd: "<secure_password>", roles: ["dbOwner"] })
```

3. **Enable authentication in MongoDB config**
```bash
# Add to /etc/mongod.conf
security:
  authorization: enabled
```

4. **Update connection string in your environment**
```bash
export MONGODB_URI="mongodb://explorer:<password>@localhost:27017/vbc-explorer"
```

## Running the Application

### Development Mode

```bash
# Start the development server
npm run dev

# Start data services (in separate terminals or background)
npm run data:start          # Start all services
npm run data:start:sync     # Blockchain synchronization
npm run data:start:stats    # Network statistics calculation  
npm run data:start:rich     # Rich list calculation
npm run data:start:tokens   # Token and NFT tracking
npm run data:start:price    # Price monitoring

# Check service status
npm run data:status

# View service logs
npm run data:logs:sync
npm run data:logs:stats
npm run data:logs:rich
npm run data:logs:tokens
```

### Production Mode

```bash
# Build and start production server
npm run production

# Or with data services
npm run production:with-data

# Manual production deployment
npm run build               # Build optimized application
npm start                   # Start production server
```

### Available NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production application |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm test` | Run test suite |
| **Data Management** |
| `npm run data:start` | Start all data services |
| `npm run data:stop` | Stop all data services |
| `npm run data:restart` | Restart all data services |
| `npm run data:status` | Check service status |
| `npm run data:sync` | Initial blockchain sync |
| `npm run data:rescan` | Rescan statistics |
| **Individual Services** |
| `npm run sync` | Manual blockchain sync |
| `npm run stats` | Manual statistics calculation |
| `npm run rich` | Manual rich list update |
| `npm run tokens` | Manual token tracking |
| `npm run price` | Manual price update |
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js
```

### Data Management

```bash
# Start all data services
npm run data:start

# Stop all data services
npm run data:stop

# Check service status
npm run data:status

# Initial sync
npm run data:sync
```

## API Endpoints

### Core APIs
- `GET /api/stats-enhanced` - Enhanced network statistics
- `GET /api/blocks` - Latest blocks
- `GET /api/transactions` - Latest transactions
- `POST /api/richlist` - Account rich list (DataTables format)

### Token APIs
- `GET /api/tokens` - List all tokens
- `GET /api/tokens/[address]` - Token details
- `GET /api/nft/[address]` - NFT collection details
- `GET /api/nft/[address]/metadata/[tokenId]` - NFT metadata

### Contract APIs
- `GET /api/contract/[address]` - Contract verification status
- `POST /api/contract/[address]` - Add/update contract data
- `POST /api/contract/interact` - Interact with smart contracts

### Web3 Relay APIs
- `POST /api/web3relay` - Blockchain data relay (transactions, addresses, blocks)

### Search APIs
- `GET /api/search/blocks-by-miner` - Search blocks by miner

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes (TypeScript)
│   │   ├── blocks/        # Block APIs
│   │   ├── transactions/  # Transaction APIs
│   │   ├── richlist/      # Rich list API
│   │   ├── contract/      # Contract APIs
│   │   ├── web3relay/     # Web3 relay API
│   │   └── ...
│   ├── components/        # Page-specific components
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # Shared components
├── lib/                   # Core utilities
│   ├── models.ts          # MongoDB models (TypeScript)
│   ├── db.ts             # Database connection
│   ├── filters.ts        # Data filtering utilities
│   └── etherUnits.ts     # Unit conversion
├── tools/                 # Data sync tools (TypeScript)
│   ├── sync.ts           # Blockchain sync
│   ├── stats.ts          # Statistics calculation
│   ├── richlist.ts       # Rich list generation
│   ├── tokens.ts         # Token tracking
│   └── price.ts          # Price monitoring
├── public/                # Static assets
└── types/                 # TypeScript definitions
```

## Features

### NFT Support
- **VRC-721 & VRC-1155** token tracking
- **Metadata retrieval** from IPFS and HTTP
- **Image caching** with fallback handling
- **Token holder tracking** and transfer history
- **Collection statistics** and floor prices

### Contract Verification
- **Source code compilation** with multiple Solidity versions
- **Bytecode comparison** for verification
- **ABI generation** and storage
- **Contract interaction** interface
- **Verification status** tracking

### Rich List
- **Account balance** tracking
- **Percentage of supply** calculations
- **Ranking system** by balance
- **Real-time updates** from blockchain
- **DataTables integration** for pagination

### Advanced Statistics
- **Network hashrate** and difficulty
- **Block time** calculations
- **Transaction statistics**
- **Mining pool** information
- **Active miners** tracking
- **Average gas price** monitoring

### Price Tracking
- **Real-time VBC price** from multiple APIs
- **USD and BTC** price pairs
- **Automatic updates** every 5 minutes
- **Fallback data** when APIs are unavailable
- **Transaction fee** calculations in USD

## Development

### Adding New Features

1. **Create new API route**
```typescript
// app/api/new-feature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  await connectToDatabase();
  // Implementation
  return NextResponse.json({ data: 'example' });
}
```

2. **Add database model**
```typescript
// lib/models.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface INewFeature extends Document {
  // Interface definition
}

const NewFeatureSchema = new Schema<INewFeature>({
  // Schema definition
});

export const NewFeature = mongoose.model<INewFeature>('NewFeature', NewFeatureSchema);
```

3. **Create frontend page**
```typescript
// app/new-feature/page.tsx
export default function NewFeaturePage() {
  // Component implementation
}
```

### TypeScript Configuration

The project uses strict TypeScript configuration with:
- **Strict mode** enabled
- **Path mapping** for clean imports
- **ESLint integration** for code quality
- **Next.js App Router** type safety

## Docker Installation

1. **Set node address in config.json**
```json
{
  "nodeAddr": "host.docker.internal"
}
```

2. **Run with Docker Compose**
```bash
docker-compose up -d
```

3. **Access the application**
```
http://localhost:3000
```

## Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/vbc-explorer

# Blockchain
VBC_NODE_URL=http://localhost:8329
VBC_WS_URL=ws://localhost:8330

# API
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_EXPLORER_URL=https://explorer.digitalregion.jp

# Features
ENABLE_NFT=true
ENABLE_CONTRACT_VERIFICATION=true
ENABLE_RICHLIST=true
```

## Troubleshooting

### Common Issues

1. **Cannot connect to VirBiCoin node**
```bash
# Check node status
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8329
```

2. **MongoDB connection issues**
```bash
# Verify MongoDB is running
mongosh --eval "db.runCommand('ping')"
```

3. **Build errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

4. **TypeScript errors**
```bash
# Check TypeScript compilation
npx tsc --noEmit
```

5. **Price data not updating**
```bash
# Check price tool logs
npm run price -- --once
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [DATA_MANAGEMENT.md](DATA_MANAGEMENT.md)
- **Issues**: [GitHub Issues](https://github.com/virbicoin/vbc-explorer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/virbicoin/vbc-explorer/discussions)

## Acknowledgments

- Built on the foundation of Ethereum Classic Explorer
- VirBiCoin community for testing and feedback
- Open source contributors and maintainers
