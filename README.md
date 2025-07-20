

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

A modern, real-time blockchain explorer for the VirBiCoin network built with Next.js 15 App Router, TypeScript, and MongoDB. Features advanced NFT support, contract verification, and comprehensive token analytics.

**This project is a fork of [ETC Explorer](https://github.com/ethereumclassic/explorer), enhanced and adapted for VirBiCoin with modern technologies and additional features.**

## ✨ Key Features

- **🔍 Advanced Search** - Search blocks, transactions, addresses, tokens, and contracts with intelligent filtering
- **💎 NFT Explorer** - Complete VRC-721 and VRC-1155 support with metadata, image galleries, and collection analytics
- **📊 Real-time Analytics** - Network statistics, gas price tracking, and blockchain performance metrics
- **🛡️ Contract Verification** - Smart contract source code verification with Solidity compiler integration
- **💰 Token Management** - Comprehensive VRC-20, VRC-721, and VRC-1155 token tracking with holder analytics
- **📈 Rich List** - Real-time account balance tracking and wealth distribution analysis
- **💸 Price Tracking** - Live VBC price updates with multiple API integrations
- **⚡ Real-time Sync** - Live blockchain synchronization with WebSocket support
- **📱 Responsive Design** - Mobile-first design optimized for all devices
- **🔗 EIP-3091 Support** - Direct URI redirection for ethereum: links

## 🚀 Multi-Chain Compatibility

This explorer is designed to work with any Ethereum-compatible blockchain. Easily configure it for different networks:

### Quick Setup for Other Chains

```bash
# Clone the repository
git clone https://github.com/virbicoin/vbc-explorer
cd vbc-explorer

# Install dependencies
npm install

# Copy and edit configuration
cp config.example.json config.json
# Edit config.json with your chain's settings

# Start the explorer
npm run dev
```

### Configuration Example

Edit `config.json` for your blockchain:

```json
{
  "nodeAddr": "localhost",
  "port": 8545,
  "currency": {
    "name": "Ethereum",
    "symbol": "ETH", 
    "unit": "wei",
    "gasUnit": "Gwei",
    "decimals": 18
  },
  "web3Provider": {
    "url": "http://localhost:8545"
  },
  "enableNFT": true,
  "enableContractVerification": true,
  "enableTokenTracking": true
}
```

### Supported Networks
- ✅ VirBiCoin (native support)
- ✅ Any EVM-compatible blockchain
- ✅ Custom gas units and currency symbols
- ✅ Configurable RPC endpoints
- ✅ Multi-chain token standards (VRC-20/721/1155)

## 📋 Core Features

### 🔍 **Advanced Explorer**
- **Real-time Blockchain Sync** - Live synchronization with WebSocket support
- **Block Explorer** - Detailed block information with transaction lists
- **Transaction Analytics** - Gas tracking, status monitoring, and transfer analysis
- **Address Analytics** - Balance history, transaction patterns, and token holdings

### 💎 **NFT & Token Support**
- **VRC-721 NFT Gallery** - Image galleries with metadata display and collection analytics
- **VRC-1155 Multi-Token** - Advanced multi-token standard support
- **VRC-20 Tracking** - Complete token analytics with holder distribution
- **Token Metadata** - Automatic metadata loading and IPFS support
- **Collection Statistics** - Floor prices, volumes, and trading analytics

### 🛡️ **Smart Contract Features**  
- **Contract Verification** - Solidity source code verification and publishing
- **Contract Interaction** - Direct smart contract interaction interface
- **Bytecode Analysis** - Contract bytecode inspection and analysis
- **ABI Support** - Automatic ABI detection and function calling

### 📊 **Analytics & Statistics**
- **Network Statistics** - Hashrate, difficulty, and network health metrics  
- **Rich List** - Real-time wealth distribution and account rankings
- **Price Tracking** - Multi-API price feeds with historical data
- **Gas Analytics** - Gas price tracking with unit customization (Gniku/niku)
- **Performance Metrics** - Transaction throughput and network performance

### 🔗 **Advanced Integration**
- **EIP-3091 URI Support** - ethereum: link handling for seamless wallet integration
- **REST API** - Complete API for external integrations
- **Multi-language Support** - Configurable currency units and symbols
- **Mobile Responsive** - Optimized experience across all devices

## 🛠️ Tech Stack

### Frontend
- **Next.js 15+** - App Router with React Server Components
- **React 19+** - Latest React with Concurrent Features  
- **TypeScript 5+** - Full type safety and enhanced DX
- **Tailwind CSS v4+** - Utility-first styling with custom design system
- **Heroicons** - Beautiful SVG icon library

### Backend & API
- **Next.js API Routes** - Serverless API endpoints
- **Node.js 18+** - Runtime environment
- **Web3.js v4+** - Ethereum blockchain interaction
- **MongoDB 8+** - Document database for scalable data storage
- **Mongoose 8+** - ODM for MongoDB with schema validation

### Development & Tooling
- **TypeScript** - Static type checking and IntelliSense
- **ESLint** - Code linting with custom rules
- **Prettier** - Automated code formatting  
- **ts-node** - TypeScript execution for tools and scripts

### Deployment & Production
- **Docker** - Containerized deployment
- **PM2** - Production process management
- **Next.js Build** - Optimized production builds

### Key Directories

- **`app/`** - Next.js App Router with page components and API routes
- **`lib/`** - Shared utilities, database connections, and configuration
- **`models/`** - MongoDB schemas and data models  
- **`tools/`** - Background services for blockchain synchronization
- **`public/`** - Static assets including images, CSS, and client libraries
    
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
    
    style A fill:#1e40af
    style B fill:#1e40af
    style C fill:#1e3a8a
    style D fill:#0ea5e9
    style M fill:#059669
    style P fill:#ea580c
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

## Project Structure

```
/
|-- app
|    |-- api
|    |   |-- address/
|    |   |-- blocks/
|    |   |-- compile/
|    |   |-- contract/
|    |   |-- health/
|    |   |-- richlist/
|    |   |-- search/
|    |   |-- stats/
|    |   |-- stats-enhanced/
|    |   |-- tokens/
|    |   |-- transactions/
|    |   |-- tx/
|    |   |-- web3relay/
|    |-- components/
|    |-- address/
|    |-- block/
|    |-- blocks/
|    |-- contract/
|    |-- ethereum/
|    |-- richlist/
|    |-- search/
|    |-- token/
|    |-- tokens/
|    |-- transactions/
|    |-- tx/
|    |-- page.tsx
|    |-- layout.tsx
|    |-- globals.css
|-- components
|-- lib
|    |-- db.ts
|    |-- stats.ts
|    |-- filters.ts
|    |-- etherUnits.ts
|    |-- models.ts
|    |-- bigint-utils.ts
|-- models
|    |-- index.ts
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

|-- .gitignore
|-- next.config.ts
|-- tsconfig.json
|-- eslint.config.ts
|-- Dockerfile
|-- docker-compose.yml
|-- README.md
|-- LICENSE
```

## Database Models

### Block
Stores block information (real-time sync via tools/sync.ts):
- `number`: Block number (unique identifier)
- `hash`: Block hash (32-byte hex string)
- `parentHash`: Parent block hash
- `miner`: Miner address (20-byte address)
- `timestamp`: Block timestamp (Unix timestamp)
- `difficulty`: Block difficulty (BigInt as string)
- `gasUsed`: Gas used by all transactions in the block
- `gasLimit`: Maximum gas limit for the block
- `transactions`: Array of transaction hashes included in the block
- `size`: Block size in bytes
- `nonce`: Proof-of-work nonce

### Transaction
Stores transaction information (real-time sync via tools/sync.ts):
- `hash`: Transaction hash (unique identifier)
- `from`: Sender address (20-byte address)
- `to`: Recipient address (20-byte address, null for contract creation)
- `value`: Transaction value in wei (BigInt as string)
- `blockNumber`: Block number containing the transaction
- `transactionIndex`: Position within the block
- `gasUsed`: Actual gas used by the transaction
- `gasPrice`: Gas price in wei
- `timestamp`: Transaction timestamp (inherited from block)
- `status`: Transaction status (1 = success, 0 = failed)
- `contractAddress`: Created contract address (for contract creation txs)
- `input`: Transaction input data (hex string)

### BlockStat
Stores aggregated block statistics (updated via tools/stats.ts):
- `number`: Block number (reference to Block)
- `blockTime`: Time between this block and previous block (seconds)
- `difficulty`: Block difficulty (BigInt as string)
- `hashrate`: Estimated network hashrate at block time
- `txCount`: Number of transactions in the block
- `gasUsed`: Total gas used by the block
- `gasLimit`: Gas limit of the block
- `timestamp`: Block timestamp
- `miner`: Miner address
- `avgGasPrice`: Average gas price of transactions in block

### Account
Stores account balance information (updated via tools/richlist.ts):
- `address`: Account address (unique 20-byte address)
- `balance`: Account balance in wei (BigInt as string)
- `type`: Account type ('contract' | 'external')
- `blockNumber`: Last updated block number
- `txCount`: Total transaction count for this address
- `lastSeen`: Last transaction timestamp
- `firstSeen`: First transaction timestamp
- `isContract`: Boolean flag for contract accounts

### Token
Stores comprehensive token information (managed via tools/tokens.ts):
- `address`: Token contract address (unique identifier)
- `name`: Token name (e.g., "VirBiCoin Token")
- `symbol`: Token symbol (e.g., "VBC")
- `decimals`: Token decimals (typically 18 for VRC-20)
- `totalSupply`: Total token supply (BigInt as string)
- `type`: Token standard ('VRC-20' | 'VRC-721' | 'VRC-1155')
- `verified`: Contract verification status
- `metadata`: Additional token metadata (JSON object)
- `holders`: Number of token holders
- `transfers`: Total number of transfers
- `createdAt`: Token creation timestamp
- `updatedAt`: Last metadata update timestamp

### Contract
Stores verified contract information (via contract verification API):
- `address`: Contract address (unique identifier)
- `contractName`: Contract name from source code
- `compilerVersion`: Solidity compiler version used
- `optimization`: Compilation optimization settings
- `sourceCode`: Complete verified source code
- `abi`: Contract ABI (JSON array)
- `bytecode`: Contract bytecode (hex string)
- `verified`: Verification status and timestamp
- `verifiedAt`: Verification completion timestamp
- `verifier`: Address that submitted verification
- `constructorArgs`: Constructor arguments used during deployment

### Price
Stores VBC price data (updated via tools/price.ts):
- `timestamp`: Price timestamp
- `price`: VBC price in USD
- `volume24h`: 24-hour trading volume
- `marketCap`: Market capitalization
- `change24h`: 24-hour price change percentage
- `source`: Price data source (e.g., "coingecko", "coinmarketcap")
- `currency`: Price currency (typically "USD")

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
# Copy and edit config file
cp config.example.json config.json
vi config.json
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

4. **Set up configuration**
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
     http://localhost:8545
```

7. **Start the development server**
```bash
npm run dev
```

8. **Initialize blockchain data** (in a separate terminal)
```bash
# Start all data synchronization services
npm run all

# Or start services individually
npm run sync    # Blockchain synchronization
npm run stats   # Network statistics
npm run richlist # Account richlist
npm run tokens  # Token tracking
npm run price   # Price tracking
```

The explorer will be available at `http://localhost:3000`

### Alternative: Docker Setup

```bash
# Start with Docker Compose
docker-compose up -d

# The explorer will be available at http://localhost:3000
# MongoDB will be accessible on localhost:27017
```

## Data Management Tools

### PM2 Management

```bash
# Start all services
pm2 start ecosystem.config.json

# Start individual services
pm2 start ecosystem.config.json --only sync     # Blockchain sync only
pm2 start ecosystem.config.json --only stats    # Statistics calculation only
pm2 start ecosystem.config.json --only richlist # Richlist calculation only
pm2 start ecosystem.config.json --only tokens   # Token tracking only
pm2 start ecosystem.config.json --only price    # Price monitoring only
pm2 start ecosystem.config.json --only web      # Web application only

# Stop services
pm2 stop all
pm2 stop sync

# Restart services
pm2 restart all
pm2 restart sync

# Check service status
pm2 status

# View logs
pm2 logs sync
pm2 logs stats
pm2 logs richlist
pm2 logs tokens
pm2 logs price
pm2 logs web

# Monitor processes
pm2 monit

# Delete services
pm2 delete all
pm2 delete sync

# Perform initial sync
SYNCALL=true pm2 start ecosystem.config.json --only sync

# Rescan statistics
RESCAN=100:10000 pm2 start ecosystem.config.json --only stats
```

### NPM Script Usage

```bash
# Data service management
npm run all          # Start all services
npm run sync         # Blockchain synchronization
npm run stats        # Network statistics
npm run richlist     # Rich list calculation
npm run tokens       # Token and NFT tracking
npm run price        # Price monitoring

# PM2 management
npm run pm2:start
npm run pm2:stop
npm run pm2:restart
npm run pm2:status
npm run pm2:logs
npm run pm2:monitor

# Development
npm run dev
npm run build
npm run lint
npm run lint:fix
npm run type-check
```

### Direct Execution

```bash
# Blockchain synchronization
npx ts-node --project tsconfig.tools.json tools/sync.ts sync

# Statistics calculation
npx ts-node --project tsconfig.tools.json tools/sync.ts stats

# Richlist calculation
npx ts-node --project tsconfig.tools.json tools/sync.ts richlist

# Token tracking
npx ts-node --project tsconfig.tools.json tools/sync.ts tokens

# Price tracking
npx ts-node --project tsconfig.tools.json tools/sync.ts price

# Environment variable configuration
RESCAN=100:10000 npx ts-node --project tsconfig.tools.json tools/sync.ts stats  # Statistics rescan
SYNCALL=true npx ts-node --project tsconfig.tools.json tools/sync.ts sync       # Full block sync
```

## Configuration

### Configuration (config.json)

All configuration is now centralized in `config.json`. The following settings are available:

### Application Configuration (config.json)

```json
{
  "nodeAddr": "localhost",
  "port": 8545,
  "wsPort": 8546,
  "bulkSize": 50,
  "syncAll": true,
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
  "currency": {
    "name": "Ethereum",
    "symbol": "ETH",
    "unit": "wei",
    "gasUnit": "Gwei",
    "decimals": 18,
    "priceApi": {
      "coingecko": {
        "enabled": true,
        "id": "ethereum"
      },
      "coinpaprika": {
        "enabled": true,
        "id": "eth-ethereum"
      }
    }
  },
  "web3Provider": {
    "url": "http://localhost:8545"
  },
  "miners": {
    "0x0000000000000000000000000000000000000000": "Unknown",
    "0x1111111111111111111111111111111111111111": "Example Pool"
  },
  "features": {
    "nft": {
      "enabled": true,
      "metadataProviders": ["ipfs", "http"],
      "imageFallback": true,
      "cacheEnabled": true
    },
    "contractVerification": {
      "enabled": true,
      "compilerVersions": ["0.8.30", "0.8.29", "0.8.28", "0.8.27", "0.8.26", "0.8.25", "0.8.24", "0.8.23", "0.8.22", "0.8.21", "0.8.20", "0.8.19", "0.8.18", "0.8.17", "0.8.16", "0.8.15", "0.8.14", "0.8.13", "0.8.12", "0.8.11", "0.8.10", "0.8.9", "0.8.8", "0.8.7", "0.8.6", "0.8.5", "0.8.4", "0.8.3", "0.8.2", "0.8.1", "0.8.0"],
      "optimizationEnabled": true,
      "maxSourceSize": 50000
    },
    "richlist": {
      "enabled": true,
      "updateInterval": 3600,
      "minBalance": "1000000000000000000"
    },
    "statistics": {
      "enabled": true,
      "updateInterval": 300,
      "blockRange": 100
    }
  },
  "api": {
    "rateLimit": {
      "windowMs": 900000,
      "max": 100
    },
    "cors": {
      "origin": ["https://your-explorer-domain.com", "http://localhost:3000"],
      "credentials": true
    }
  },
  "database": {
    "uri": "mongodb://explorer:your_secure_password@localhost:27017/explorerDB?authSource=explorerDB",
    "options": {
      "maxPoolSize": 20,
      "serverSelectionTimeoutMS": 15000,
      "socketTimeoutMS": 60000,
      "connectTimeoutMS": 15000,
      "bufferCommands": false,
      "autoIndex": false,
      "autoCreate": false
    }
  },
  "logging": {
    "level": "info",
    "file": {
      "enabled": true,
      "maxSize": "10m",
      "maxFiles": 5
    },
    "console": {
      "enabled": true,
      "colorize": true
    }
  },
  "explorer": {
    "name": "Blockchain Explorer",
    "description": "Real-time blockchain explorer",
    "version": "0.6.0",
    "url": "https://your-explorer-domain.com",
    "apiUrl": "https://your-explorer-domain.com/api"
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

4. **Update connection string in config.json**
```bash
# Edit config.json and update the database.uri field
```

## Running the Application

### Development Mode

```bash
# Start the development server
npm run dev

# Start data services (in separate terminals or background)
npm run all          # Start all services
npm run sync         # Blockchain synchronization
npm run stats        # Network statistics calculation  
npm run richlist     # Rich list calculation
npm run tokens       # Token and NFT tracking
npm run price        # Price monitoring
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

### Core Statistics APIs
- `GET /api/stats` - Basic network statistics (blocks, transactions, difficulty)
- `GET /api/stats-enhanced` - Extended statistics with network hashrate and mining data

### Blockchain Data APIs
- `GET /api/blocks` - Latest 15 blocks with pagination
- `GET /api/blocks/[number]` - Specific block details by number
- `GET /api/transactions` - Latest 15 transactions 
- `GET /api/transactions/[txhash]` - Transaction details by hash
- `GET /api/tx/[hash]` - Alternative transaction endpoint
- `GET /api/blockheight` - Current blockchain height

### Address and Account APIs
- `GET /api/address/[address]` - Address details, balance, and transaction history
- `GET /api/accounts/[address]` - Account information and metadata
- `GET /api/richlist?page=1&limit=50` - Wealth distribution and top addresses

### Token and NFT APIs
- `GET /api/tokens` - List all tracked tokens (VRC-20, VRC-721, VRC-1155)
- `GET /api/tokens/[address]` - Token details, metadata, and holder information
- `GET /api/nft/[address]` - NFT collection details and metadata
- `GET /api/nft/[address]/metadata/[tokenId]` - Individual NFT metadata and image URLs

### Contract APIs
- `GET /api/contract/status/[address]` - Contract verification status
- `GET /api/contract/[address]` - Contract details and ABI
- `POST /api/contract/verify` - Submit contract source code for verification
- `POST /api/contract/interact` - Execute contract function calls

### Search APIs
- `GET /api/search/blocks-by-miner?miner=[address]` - Blocks mined by specific address

### Utility APIs
- `POST /api/web3relay` - Web3 RPC relay for blockchain queries

### WebSocket Endpoints
- `ws://localhost:3000/api/ws` - Real-time updates

### Enhanced Statistics Response
`GET /api/stats-enhanced` returns:
```json
{
  "latestBlock": 215221,
  "avgBlockTime": "13.41",
  "networkHashrate": "7.12 GH/s",
  "networkDifficulty": "95.46 GH",
  "totalTransactions": 4878,
  "avgGasPrice": "21000",
  "activeMiners": 1,
  "isConnected": true,
  "lastBlockTime": "2h ago"
}
```

## Advanced Features

### Real-time WebSocket Support
The system supports WebSocket connections for real-time updates:
- Block notifications
- Transaction confirmations
- Network statistics updates
- NFT transfer notifications

### NFT Support
Complete NFT functionality:
- VRC-721 and VRC-1155 token tracking
- Metadata retrieval and caching
- Image loading and fallback handling
- Token holder tracking
- Transfer history with proper TokenID display
- OSATO collection support with reverse chronological TokenID ordering

### Contract Verification
Smart contract verification system:
- Source code compilation with multiple Solidity versions
- Bytecode comparison
- ABI generation
- Contract interaction interface
- Verification status tracking

### Data Export
Export functionality for backup and analysis:
```bash
# Export blocks
npm run export:blocks -- --start=1000 --end=2000

# Export transactions
npm run export:transactions -- --date=2024-01-01

# Export statistics
npm run export:stats -- --format=csv

# Export tokens
npm run export:tokens -- --type=VRC-721
```



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
# Test RPC connection - Get current block number
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8545

# Expected response (normal):
# {"jsonrpc":"2.0","id":1,"result":"0x39c01"}
# 
# Error response (connection failed):
# curl: (7) Failed to connect to localhost port 8545: Connection refused
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

5. **Database Connection Issues**
```bash
# Check MongoDB authentication
mongosh -u explorer -p password --authenticationDatabase explorerDB

# Test connection from application
node -e "
const mongoose = require('mongoose');
mongoose.connect(config.database.uri || 'mongodb://localhost/explorerDB')
  .then(() => console.log('✓ Connected'))
  .catch(err => console.error('✗ Failed:', err.message));
"
```

6. **VirBiCoin Node Connection Issues**
```bash
# Check node status and block height
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8545

# Expected response (normal):
# {"jsonrpc":"2.0","id":1,"result":"0x39c01"}

# Check node synchronization
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' \
     http://localhost:8545

# Expected response (synchronized):
# {"jsonrpc":"2.0","id":1,"result":false}
# 
# Expected response (syncing):
# {"jsonrpc":"2.0","id":1,"result":{"startingBlock":"0x0","currentBlock":"0x1000","highestBlock":"0x39c01"}}
# 
# Note: "result":false means the node is fully synchronized and up to date
```


7. **Performance Issues**
```bash
# Check MongoDB indexes
mongosh explorerDB
db.Block.getIndexes()
db.Transaction.getIndexes()

# Monitor memory usage
pm2 monit
htop

8. **Data Synchronization Issues**
```bash
# Force resync from specific block
SYNCALL=true npm run sync

# Rescan statistics
RESCAN=100:10000 npm run stats

# Check sync status
pm2 logs sync | tail -50
```

### Performance Optimization

For low-resource environments (1GB RAM):

1. **Reduce batch sizes in config.json**
```bash
# Edit config.json and reduce bulkSize and other batch settings
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

4. **Adjust bulkSize**: Increase bulkSize for large data processing
5. **Indexes**: Create appropriate indexes in MongoDB
6. **Memory**: Ensure sufficient memory for large blockchains
7. **Network**: Ensure high-speed connection to VirBiCoin node
8. **Caching**: Implement Redis caching for frequently accessed data
9. **CDN**: Use CDN for static assets and images

## Security

1. Configure MongoDB access control
2. Properly restrict RPC access to VirBiCoin node
3. Set appropriate permissions for log files
4. Implement proper firewall settings in production
5. Validate contract verification inputs
6. Implement rate limiting for API endpoints

## Development

### Adding New Data Sources
To add new data sources, create a new sync module:
```typescript
// tools/custom-sync.ts
import Web3 from 'web3';
import mongoose from 'mongoose';

class CustomSync {
  constructor(config: any) {
    this.web3 = new Web3(config.nodeAddr);
    this.config = config;
  }

  async sync(): Promise<void> {
    // Implementation
  }
}

export default CustomSync;
```

### Custom Statistics
To add custom statistics, extend the stats calculator:
```typescript
// tools/custom-stats.ts
class CustomStats {
  async calculate(): Promise<void> {
    // Custom calculation logic
  }
}
```

### NFT Metadata Providers
Implement custom metadata providers:
```typescript
// lib/metadata-provider.ts
interface MetadataProvider {
  getMetadata(tokenId: number): Promise<TokenMetadata>;
  getImageUrl(tokenId: number): Promise<string>;
}
```

## Deployment

### Production Setup
1. Use PM2 for process management
2. Configure log rotation
3. Set up monitoring and alerting
4. Implement backup strategies
5. Configure CDN for static assets
6. Set up Redis for caching

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Configuration
All configuration is now centralized in `config.json`. See the Configuration section above for details.

## Migration Guide

### From JavaScript to TypeScript
1. Rename `.js` files to `.ts`
2. Add type definitions
3. Update import/export statements
4. Configure `tsconfig.json`

### From Pages Router to App Router
1. Move pages to `app/` directory
2. Update routing structure
3. Implement server components
4. Update API routes

### Database Schema Updates
```typescript
// Add new fields to existing collections
await db.collection('tokens').updateMany({}, {
  $set: {
    type: 'VRC-20',
    verified: false,
    metadata: null
  }
});
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributors

<div align="center" markdown="1">

[![Contributors](https://contrib.rocks/image?repo=virbicoin/vbc-explorer)](https://github.com/virbicoin/vbc-explorer/graphs/contributors)

</div>

## Support

- **Documentation**: [GitHub Wiki](https://github.com/virbicoin/vbc-explorer/wiki)
- **Issues**: [GitHub Issues](https://github.com/virbicoin/vbc-explorer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/virbicoin/vbc-explorer/discussions)
- **Live Demo**: [explorer.digitalregion.jp](https://explorer.digitalregion.jp)


## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=virbicoin/vbc-explorer&type=Date&theme=dark)](https://star-history.com/#virbicoin/vbc-explorer&Date)

## 📊 Statistics

![GitHub Stats](https://github-readme-stats.vercel.app/api?username=emerauda&repo=TopazBot&show_icons=true&theme=dark)

<div align="center" markdown="1">

**⭐ If you like this project, please give it a star! ⭐**

[![GitHub stars](https://img.shields.io/github/stars/virbicoin/vbc-explorer.svg?style=social&label=Star)](https://github.com/virbicoin/vbc-explorer)
[![GitHub forks](https://img.shields.io/github/forks/virbicoin/vbc-explorer.svg?style=social&label=Fork)](https://github.com/virbicoin/vbc-explorer/fork)
[![GitHub watchers](https://img.shields.io/github/watchers/virbicoin/vbc-explorer.svg?style=social&label=Watch)](https://github.com/virbicoin/vbc-explorer)

Made with ❤️ by [VirBiCoin Project](https://github.com/virbicoin)

</div>

## Acknowledgments

- **VirBiCoin Community** - For blockchain network support
- **Next.js Team** - For the amazing React framework
- **MongoDB Team** - For the robust database solution
- **Web3.js Team** - For blockchain interaction libraries

These tools enable the VirBiCoin Explorer to track the latest blockchain data in real-time, manage NFT collections, verify smart contracts, and provide comprehensive statistical information for the VirBiCoin network.
