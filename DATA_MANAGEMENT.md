# VirBiCoin Explorer Data Management

This document describes the data management functionality for the VirBiCoin Explorer, including real-time blockchain synchronization, statistical calculations, richlist management, NFT tracking, and contract verification.

## Overview

The VirBiCoin Explorer provides several data synchronization and management tools:

1. **Blockchain Sync** (`tools/sync.ts`) - Real-time synchronization of blocks and transaction data from the blockchain
2. **Statistics Calculator** (`tools/stats.ts`) - Calculation and storage of block statistics
3. **Richlist Calculator** (`tools/richlist.ts`) - Calculation and updating of account balance information
4. **Token Management** (`tools/tokens.ts`) - Token tracking and metadata management
5. **NFT Support** - VRC-721 and VRC-1155 token tracking with metadata
6. **Contract Verification** - Smart contract source code verification and publication

## Database Models

### Block
Stores block information (real-time):
- `number`: Block number
- `hash`: Block hash
- `parentHash`: Parent block hash
- `miner`: Miner address
- `timestamp`: Block timestamp
- `difficulty`: Block difficulty
- `gasUsed`: Gas used by the block
- `gasLimit`: Gas limit of the block
- `transactions`: Array of transaction hashes

### Transaction
Stores transaction information (real-time):
- `hash`: Transaction hash
- `from`: Sender address
- `to`: Recipient address
- `value`: Transaction value in wei
- `blockNumber`: Block number containing the transaction
- `gasUsed`: Gas used by the transaction
- `gasPrice`: Gas price
- `timestamp`: Transaction timestamp
- `status`: Transaction status (success/failed)

### BlockStat
Stores block statistics (static):
- `blockTime`: Time between blocks
- `txCount`: Number of transactions in the block
- `difficulty`: Block difficulty
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

### 1. Install Required Dependencies

```bash
npm install web3 mongoose ethers
```

### 2. Start VirBiCoin Node

Ensure the VirBiCoin node is running on localhost:8545.

### 3. Start MongoDB

```bash
# Verify MongoDB is running
mongosh --eval "db.runCommand('ping')"
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

### Enhanced Statistics API
`GET /api/stats-enhanced`

Provides enhanced statistical information:
- `latestBlock`: Latest block number
- `avgBlockTime`: Average block time
- `networkHashrate`: Network hashrate
- `networkDifficulty`: Network difficulty
- `totalTransactions`: Total transaction count
- `avgGasPrice`: Average gas price
- `activeMiners`: Number of active miners
- `isConnected`: Node connection status
- `lastBlockTimestamp`: Last block timestamp

### Richlist API
`GET /api/richlist?page=1&limit=50`

Provides richlist information:
- `richlist`: Account list sorted by balance
- `pagination`: Pagination information
- `statistics`: Total supply, account statistics

### Token APIs
- `GET /api/tokens` - List all tokens
- `GET /api/tokens/[address]` - Token details
- `GET /api/nft/[address]` - NFT collection details
- `GET /api/nft/[address]/metadata/[tokenId]` - NFT metadata

### Contract APIs
- `GET /api/contract/status/[address]` - Contract verification status
- `POST /api/contract/verify` - Verify contract source code
- `POST /api/contract/interact` - Interact with smart contracts

## Configuration Options

### config.json
```json
{
  "nodeAddr": "localhost",
  "port": 8545,
  "wsPort": 8546,
  "bulkSize": 100,
  "syncAll": false,
  "quiet": false,
  "useRichList": true,
  "maxRetries": 3,
  "retryDelay": 1000,
  "logLevel": "info",
  "miners": {
    "0x123...": "Miner Pool 1",
    "0x456...": "Miner Pool 2"
  }
}
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

### 3. Services Stop Unexpectedly
```bash
# Check logs
./manage-data.sh logs sync
./manage-data.sh logs stats
./manage-data.sh logs richlist
./manage-data.sh logs tokens
```

### 4. Data Not Updating
```bash
# Check service status
./manage-data.sh status

# Restart services
./manage-data.sh restart all
```

### 5. NFT Metadata Issues
```bash
# Check token metadata
curl http://localhost:3000/api/nft/[address]/metadata/[tokenId]

# Verify contract verification
curl http://localhost:3000/api/contract/status/[address]
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
