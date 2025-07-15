# VirBiCoin Explorer Data Management

This document describes the data management functionality for the VirBiCoin Explorer, including real-time blockchain synchronization, statistical calculations, richlist management, token tracking, NFT support, and contract verification.

## Overview

The VirBiCoin Explorer v0.4.0 provides comprehensive data synchronization and management tools built with Next.js 15+ (App Router), TypeScript, and MongoDB:

1. **Blockchain Sync** (`tools/sync.ts`) - Real-time synchronization of blocks and transaction data from the VirBiCoin blockchain
2. **Statistics Calculator** (`tools/stats.ts`) - Advanced network statistics and mining analytics
3. **Richlist Calculator** (`tools/richlist.ts`) - Account balance tracking and wealth distribution analysis
4. **Token Management** (`tools/tokens.ts`) - VRC-20, VRC-721, and VRC-1155 token tracking with metadata
5. **Price Tracking** (`tools/price.ts`) - Real-time VBC price updates from external APIs
6. **NFT Support** - Complete NFT ecosystem with metadata, image loading, and transfer tracking
7. **Contract Verification** - Smart contract source code verification and publication system

## Tech Stack

- **Backend**: Node.js 18+, TypeScript 5+, MongoDB 6.0+
- **Blockchain**: Web3.js v4, VirBiCoin RPC (port 8329)
- **Database**: MongoDB with Mongoose ODM
- **Tools**: ts-node, PM2 for process management
- **Environment**: MONGODB_URI environment variable for database connection

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
- `gasUsed`: Gas used by the block
- `gasLimit`: Gas limit of the block
- `uncleCount`: Number of uncle blocks
- `timestamp`: Block timestamp
- `miner`: Miner address

### Account
Stores account balance information (static):
- `address`: Account address
- `balance`: Account balance in wei
- `type`: Account type (contract/external)
- `blockNumber`: Last updated block number

### Token
Stores token information:
- `address`: Token contract address
- `name`: Token name
- `symbol`: Token symbol
- `decimals`: Token decimals
- `totalSupply`: Total supply
- `type`: Token type (VRC-20, VRC-721, VRC-1155)
- `verified`: Verification status
- `metadata`: Token metadata

### Contract
Stores verified contract information:
- `address`: Contract address
- `contractName`: Contract name
- `compilerVersion`: Solidity compiler version
- `optimization`: Optimization settings
- `sourceCode`: Verified source code
- `abi`: Contract ABI
- `byteCode`: Contract bytecode
- `verified`: Verification status
- `verifiedAt`: Verification timestamp

## Setup

### 1. Prerequisites and Dependencies

**System Requirements:**
- Node.js 18+ and npm
- MongoDB 6.0+ running on localhost:27017
- VirBiCoin node running on localhost:8329 (with RPC enabled)

**Install Dependencies:**
```bash
npm install
```

**Key Dependencies:**
- `web3`: v4.16.0 - VirBiCoin blockchain interaction
- `mongoose`: v8.16.3 - MongoDB ODM
- `next`: v15.3.5 - React framework with App Router
- `typescript`: v5.8.3 - Type safety
- `ts-node`: v10.9.2 - TypeScript execution for tools

### 2. Environment Configuration

Create `.env.local` file:
```bash
MONGODB_URI=mongodb://explorer:password@localhost:27017/explorerDB
NODE_ENV=production
PORT=3000
```

**MongoDB Authentication Setup:**
```bash
# Create MongoDB user for explorer
mongosh
use explorerDB
db.createUser({
  user: "explorer",
  pwd: "your_secure_password",
  roles: [
    { role: "readWrite", db: "explorerDB" }
  ]
})
```

### 3. VirBiCoin Node Configuration

Ensure your VirBiCoin node is running with RPC enabled:
```bash
# Check node connection
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8329
```

## Usage

### Management Script Usage

```bash
# Start all data services
./manage-data.sh start all

# Start individual services
./manage-data.sh start sync     # Blockchain sync only
./manage-data.sh start stats    # Statistics calculation only
./manage-data.sh start richlist # Richlist calculation only
./manage-data.sh start tokens   # Token tracking only

# Stop services
./manage-data.sh stop all
./manage-data.sh stop sync

# Check service status
./manage-data.sh status

# View logs
./manage-data.sh logs sync
./manage-data.sh logs stats
./manage-data.sh logs richlist
./manage-data.sh logs tokens

# Perform initial sync
./manage-data.sh initial-sync

# Rescan statistics
./manage-data.sh rescan-stats
```

### NPM Script Usage

```bash
# Data service management
npm run data:start
npm run data:stop
npm run data:status

# Initial synchronization
npm run data:sync

# Individual tool execution
npm run sync:virbicoin
npm run stats:virbicoin
npm run richlist:virbicoin
npm run tokens:virbicoin
```

### Direct Execution

```bash
# Blockchain synchronization
npx tsx tools/sync.ts

# Statistics calculation
npx tsx tools/stats.ts

# Richlist calculation
npx tsx tools/richlist.ts

# Token tracking
npx tsx tools/tokens.ts

# Environment variable configuration
RESCAN=100:10000 npx tsx tools/stats.ts  # Statistics rescan
SYNCALL=true npx tsx tools/sync.ts       # Full block sync
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

## Configuration Options

### config.json
```json
{
  "nodeAddr": "localhost",
  "port": 8329,
  "wsPort": 8330,
  "bulkSize": 100,
  "syncAll": false,
  "quiet": false,
  "useRichList": true,
  "maxRetries": 3,
  "retryDelay": 1000,
  "logLevel": "info",
  "priceUpdateInterval": 300000,
  "enableNFT": true,
  "enableContractVerification": true,
  "miners": {
    "0x6c0db3ea9eed7ed145f36da461d84a8d02596b08": "Main Pool",
    "0x950302976387b43e042aea242ae8dab8e5c204d1": "Solo Miner"
  }
}
```

### Environment Variables
```bash
# Database (Required)
MONGODB_URI=mongodb://explorer:password@localhost:27017/explorerDB

# Application
NODE_ENV=production
PORT=3000

# VirBiCoin Node
VBC_NODE_URL=http://localhost:8329
VBC_WS_URL=ws://localhost:8330

# Features (Optional)
ENABLE_NFT=true
ENABLE_CONTRACT_VERIFICATION=true
ENABLE_RICHLIST=true
ENABLE_PRICE_TRACKING=true

# External APIs
COINGECKO_API_KEY=your_api_key
COINMARKETCAP_API_KEY=your_api_key
```

## Logging and Monitoring

Log files are saved in the `logs/` directory:
- `logs/sync.log` - Blockchain synchronization logs
- `logs/stats.log` - Statistics calculation logs
- `logs/richlist.log` - Richlist calculation logs
- `logs/tokens.log` - Token tracking logs

## Troubleshooting

### 1. Cannot Connect to VirBiCoin Node
```bash
# Check node status
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8545
```

### 2. Cannot Connect to MongoDB
```bash
# Verify MongoDB connection
mongosh --eval "db.runCommand('ping')"
```

### 4. Database Connection Issues
```bash
# Check MongoDB authentication
mongosh -u explorer -p password --authenticationDatabase explorerDB

# Test connection from application
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/explorerDB')
  .then(() => console.log('✓ Connected'))
  .catch(err => console.error('✗ Failed:', err.message));
"
```

### 5. VirBiCoin Node Connection Issues
```bash
# Check node status and block height
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     http://localhost:8329

# Check node synchronization
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' \
     http://localhost:8329
```

### 6. Performance Issues
```bash
# Check MongoDB indexes
mongosh explorerDB
db.Block.getIndexes()
db.Transaction.getIndexes()

# Monitor memory usage
npm run data:status
htop
```

### 7. Data Synchronization Issues
```bash
# Force resync from specific block
SYNCALL=true npm run sync

# Rescan statistics
npm run data:rescan

# Check sync status
npm run data:logs:sync | tail -50
```

## Performance Optimization

1. **Adjust bulkSize**: Increase bulkSize for large data processing
2. **Indexes**: Create appropriate indexes in MongoDB
3. **Memory**: Ensure sufficient memory for large blockchains
4. **Network**: Ensure high-speed connection to VirBiCoin node
5. **Caching**: Implement Redis caching for frequently accessed data
6. **CDN**: Use CDN for static assets and images

## Security

1. Configure MongoDB access control
2. Properly restrict RPC access to VirBiCoin node
3. Set appropriate permissions for log files
4. Implement proper firewall settings in production
5. Validate contract verification inputs
6. Implement rate limiting for API endpoints

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
- Transfer history

### Contract Verification
Smart contract verification system:
- Source code compilation
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

### Health Monitoring
Built-in health monitoring endpoints:
- `GET /health/sync` - Sync service health
- `GET /health/stats` - Stats service health
- `GET /health/richlist` - Richlist service health
- `GET /health/tokens` - Token service health

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

### Environment Variables
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/vbc-explorer

# Blockchain
VBC_NODE_URL=http://localhost:329
VBC_WS_URL=ws://localhost:8330

# API
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_EXPLORER_URL=https://explorer.digitalregion.jp

# Features
ENABLE_NFT=true
ENABLE_CONTRACT_VERIFICATION=true
ENABLE_RICHLIST=true
```

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

These tools enable the VirBiCoin Explorer to track the latest blockchain data in real-time, manage NFT collections, verify smart contracts, and provide comprehensive statistical information for the VirBiCoin network.
