

# VirBiCoin Explorer

<img src="public/img/explorer-logo.png" alt="VBC Explorer logo" height="200" />

[![Lint/Format](https://github.com/virbicoin/vbc-explorer/actions/workflows/lint.yml/badge.svg)](https://github.com/virbicoin/vbc-explorer/actions/workflows/lint.yml)
[![Node.js CI](https://github.com/virbicoin/vbc-explorer/actions/workflows/node.js.yml/badge.svg)](https://github.com/virbicoin/vbc-explorer/actions/workflows/node.js.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![EIP-3091](https://img.shields.io/badge/EIP--3091-Supported-brightgreen)](https://eips.ethereum.org/EIPS/eip-3091)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<b>Live Version: [explorer.digitalregion.jp](https://explorer.digitalregion.jp)</b>

A modern, real-time blockchain explorer for the VirBiCoin network built with Next.js App Router, TypeScript, and MongoDB.

## Features

- **EIP-3091 URI Support** - Direct URI redirection for addresses, transactions, and blocks (ethereum:...)
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

## System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js App Router]
        B[React Components]
        C[TypeScript]
        D[Tailwind CSS]
    end
    
    subgraph "API Layer"
        E[Next.js API Routes]
        F[Data Fetching]
        G[Real-time Updates]
    end
    
    subgraph "Data Processing Layer"
        H[Sync Service]
        I[Stats Service]
        J[Price Service]
        K[Tokens Service]
        L[Richlist Service]
    end
    
    subgraph "Database Layer"
        M[MongoDB]
        N[Mongoose ODM]
        O[Data Models]
    end
    
    subgraph "Blockchain Layer"
        P[VirBiCoin Node]
        Q[Web3.js]
        R[RPC Connection]
    end
    
    subgraph "External Services"
        S[Price APIs]
        T[NFT Metadata]
        U[Contract Verification]
    end
    
    A --> E
    B --> E
    C --> E
    D --> A
    
    E --> F
    F --> G
    
    F --> H
    F --> I
    F --> J
    F --> K
    F --> L
    
    H --> N
    I --> N
    J --> N
    K --> N
    L --> N
    
    N --> M
    O --> N
    
    H --> Q
    I --> Q
    J --> Q
    K --> Q
    L --> Q
    
    Q --> R
    R --> P
    
    J --> S
    K --> T
    L --> U
    
    style A fill:#61dafb
    style B fill:#61dafb
    style C fill:#007acc
    style D fill:#38bdf8
    style M fill:#47a248
    style P fill:#f7931e
```

## Project Structure

```
/
|-- app
|    |-- api
|    |-- components
|    |-- contract
|    |-- address
|    |-- tx
|    |-- tokens
|    |-- search
|    |-- block
|    |-- transactions
|    |-- blocks
|    |-- nft
|    |-- richlist
|    |-- accounts
|    |-- page.tsx
|    |-- layout.tsx
|    |-- globals.css
|-- components
|    |-- TransactionDetails.tsx
|    |-- AccountDetails.tsx
|-- lib
|    |-- db.ts
|    |-- stats.ts
|    |-- filters.ts
|    |-- etherUnits.ts
|    |-- models.ts
|    |-- bigint-utils.ts
|-- models
|    |-- index.ts
|    |-- Token.js
|-- tools
|    |-- sync.ts
|    |-- stats.ts
|    |-- price.ts
|    |-- tokens.ts
|    |-- richlist.ts
|-- types
|-- logs
|-- public
|-- .github
|-- package.json
|-- ecosystem.config.json
|-- config.json
|-- config.example.json
|-- .env
|-- .gitignore
|-- next.config.ts
|-- tsconfig.json
|-- eslint.config.ts
|-- Dockerfile
|-- docker-compose.yml
|-- README.md
|-- LICENSE
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Sync
    participant Database
    participant Blockchain
    
    User->>Frontend: Access Explorer
    Frontend->>API: Request Data
    API->>Database: Query Stored Data
    Database-->>API: Return Data
    API-->>Frontend: Send Response
    Frontend-->>User: Display Information
    
    loop Real-time Sync
        Sync->>Blockchain: Poll New Blocks
        Blockchain-->>Sync: Block Data
        Sync->>Database: Store Block Data
        Sync->>Database: Update Statistics
        Sync->>Database: Process Transactions
        Sync->>Database: Update Token Balances
        Sync->>Database: Update Rich List
    end
    
    loop Price Updates
        Sync->>External APIs: Fetch Price Data
        External APIs-->>Sync: Price Information
        Sync->>Database: Update Price Data
    end
```

## Quick Start with PM2 (Recommended)

### Prerequisites

- **Node.js 18+** and npm
- **MongoDB 6.0+** running on localhost:27017
- **VirBiCoin node** running on localhost:8329 with RPC enabled
- **PM2** installed globally: `npm install -g pm2`

### Installation

1. **Clone and setup**
```bash
git clone https://github.com/virbicoin/vbc-explorer
cd vbc-explorer
npm install
```

2. **Configure environment** (optional)
```bash
# Edit .env file if needed
vi .env
```

3. **Start all services with PM2**
```bash
# Start all services (Web + Data sync)
pm2 start ecosystem.config.json

# Check status
pm2 status

# View logs
pm2 logs
```

4. **Access the explorer**
```
http://localhost:3000
```

### PM2 Management Commands

```bash
# Start all services
pm2 start ecosystem.config.json

# Stop all services
pm2 stop ecosystem.config.json

# Restart all services
pm2 restart ecosystem.config.json

# View status
pm2 status

# View logs
pm2 logs                    # All logs
pm2 logs vbc-explorer-web   # Web service only
pm2 logs vbc-sync          # Sync service only

# Monitor resources
pm2 monit

# Delete all services
pm2 delete ecosystem.config.json

# Setup auto-restart (production)
pm2 startup
pm2 save
```

### Individual Service Management

```bash
# Start specific services only
pm2 start ecosystem.config.json --only vbc-explorer-web
pm2 start ecosystem.config.json --only vbc-sync
pm2 start ecosystem.config.json --only vbc-stats

# Restart specific service
pm2 restart vbc-explorer-web
pm2 restart vbc-sync
pm2 restart vbc-stats
```

## Local Installation (Development)

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
npm run data:all

# Or start services individually
npm run data:sync    # Blockchain synchronization
npm run data:stats   # Network statistics
npm run data:richlist # Account richlist
npm run data:tokens  # Token tracking
npm run data:price   # Price tracking
```

The explorer will be available at `http://localhost:3000`

### Alternative: Docker Setup

```bash
# Start with Docker Compose
docker-compose up -d

# The explorer will be available at http://localhost:3000
# MongoDB will be accessible on localhost:27017
```

## Configuration

### Environment Variables (.env)

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/explorerDB

# Web3 Provider Configuration  
WEB3_PROVIDER_URL=http://localhost:8329

# Server Configuration
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=512

# 1GB RAM Optimization
BATCH_SIZE=50
MAX_BLOCKS_PER_RUN=100
SYNC_BATCH_SIZE=20
MAX_SYNC_BLOCKS=50

# Features
ENABLE_NFT=true
ENABLE_CONTRACT_VERIFICATION=true
ENABLE_TOKEN_TRACKING=true
ENABLE_STATS=true
ENABLE_RICHLIST=true
ENABLE_PRICE_TRACKING=true

# Performance Optimization
USE_SWAP=true
MEMORY_LIMIT=512
LOG_LEVEL=info

# Caching
ENABLE_CACHE=true
CACHE_DURATION=300
```

### Application Configuration (config.json)

```json
{
  "nodeAddr": "localhost",
  "port": 8329,
  "wsPort": 8330,
  "bulkSize": 50,
  "syncAll": false,
  "quiet": false,
  "useRichList": true,
  "startBlock": 0,
  "endBlock": null,
  "maxRetries": 3,
  "retryDelay": 1000,
  "logLevel": "info",
  "enableNFT": true,
  "enableContractVerification": true,
  "enableTokenTracking": true,
  "apiRateLimit": 100,
  "webSocketEnabled": true,
  "miners": {
    "0x950302976387b43E042aeA242AE8DAB8e5C204D1": "digitalregion.jp",
    "0x6C0DB3Ea9EEd7ED145f36da461D84A8d02596B08": "coolpool.top"
  }
}
```

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
npm run data:all          # Start all services
npm run data:sync         # Blockchain synchronization
npm run data:stats        # Network statistics calculation  
npm run data:richlist     # Rich list calculation
npm run data:tokens       # Token and NFT tracking
npm run data:price        # Price monitoring
```

### Production Mode with PM2

```bash
# Build and start with PM2
npm run build
pm2 start ecosystem.config.json

# Check status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit
```

### Docker Deployment

```bash
# Build and run with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Endpoints

### Core Endpoints

- `GET /api/stats` - Network statistics
- `GET /api/blocks` - Block list with pagination
- `GET /api/block/[number]` - Block details
- `GET /api/tx/[hash]` - Transaction details
- `GET /api/address/[address]` - Address details
- `GET /api/contract/[address]` - Contract details
- `GET /api/tokens` - Token list
- `GET /api/tokens/[address]` - Token details
- `GET /api/richlist` - Account rich list

### WebSocket Endpoints

- `ws://localhost:3000/api/ws` - Real-time updates

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod
```

2. **VirBiCoin Node Connection Error**
```bash
# Test RPC connection
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8329
```

3. **PM2 Service Issues**
```bash
# Check PM2 status
pm2 status

# View detailed logs
pm2 logs --lines 100

# Restart specific service
pm2 restart vbc-explorer-web
```

4. **Memory Issues (1GB RAM)**
```bash
# Check memory usage
pm2 monit

# Restart with memory optimization
pm2 restart ecosystem.config.json
```

### Performance Optimization

For low-resource environments (1GB RAM):

1. **Reduce batch sizes in .env**
```bash
BATCH_SIZE=25
MAX_BLOCKS_PER_RUN=50
```

2. **Enable swap**
```bash
# Create swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

3. **Monitor resources**
```bash
pm2 monit
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [GitHub Wiki](https://github.com/virbicoin/vbc-explorer/wiki)
- **Issues**: [GitHub Issues](https://github.com/virbicoin/vbc-explorer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/virbicoin/vbc-explorer/discussions)
- **Live Demo**: [explorer.digitalregion.jp](https://explorer.digitalregion.jp)

## Acknowledgments

- **VirBiCoin Community** - For blockchain network support
- **Next.js Team** - For the amazing React framework
- **MongoDB Team** - For the robust database solution
- **Web3.js Team** - For blockchain interaction libraries
