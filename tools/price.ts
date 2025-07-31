#!/usr/bin/env node
/*
Tool for fetching and updating cryptocurrency price data
*/

import { Market } from '../models/index';
import mongoose from 'mongoose';
import { connectDB } from '../models/index';

// Initialize database connection
const initDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('🔗 Database already connected');
      return;
    }

    await connectDB();
    console.log('🔗 Database connection initialized successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
};

// Memory monitoring function
const checkMemory = () => {
  const usage = process.memoryUsage();
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const limitMB = parseInt(process.env.MEMORY_LIMIT_MB || '512'); // Reduced from 1024MB to 512MB
  
  if (usedMB > limitMB) {
    console.log(`⚠️ Memory usage: ${usedMB}MB (limit: ${limitMB}MB)`);
    if (global.gc) {
      global.gc();
      console.log('🧹 Garbage collection executed');
    }
    return false;
  }
  return true;
};

// Interface definitions
interface Config {
  nodeAddr: string;
  port: number;
  quiet: boolean;
  priceUpdateInterval: number;
  currency?: {
    name: string;
    symbol: string;
    unit: string;
    decimals: number;
    gasUnit: string;
    priceApi?: {
      coingecko?: {
        enabled: boolean;
        id: string;
      };
      coinpaprika?: {
        enabled: boolean;
        id: string;
      };
    };
  };
}

interface PriceData {
  symbol: string;
  timestamp: number;
  quoteBTC: number;
  quoteUSD: number;
}

// Configuration
const config: Config = {
  nodeAddr: 'localhost',
  port: 8329,
  quiet: false,
  priceUpdateInterval: 30 * 60 * 1000, // 30 minutes (15分→30分に延長)
  currency: {
    name: 'VirBiCoin',
    symbol: 'VBC',
    unit: 'niku',
    decimals: 18,
    gasUnit: 'Gwei',
    priceApi: {
      coingecko: {
        enabled: true,
        id: 'virbicoin'
      },
      coinpaprika: {
        enabled: true,
        id: 'vbc-virbicoin'
      }
    }
  }
};

// Try to load config.json, fallback to config.example.json
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const local = require('../config.json');
  Object.assign(config, local);
  console.log('📄 config.json found.');
} catch (error) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const local = require('../config.example.json');
    Object.assign(config, local);
    console.log('📄 config.example.json found (fallback).');
  } catch (fallbackError) {
    console.log('📄 No config files found. Using default configuration...');
  }
}

// Initialize database connection after config is loaded
initDB();

if (config.quiet) {
  console.log('🔇 Quiet mode enabled');
}

/**
 * Fetch current cryptocurrency price from external API with retry mechanism
 */
const fetchCryptoPrice = async (): Promise<PriceData | null> => {
  try {
    const currency = config.currency;
    if (!currency) {
      console.error('❌ Currency configuration not found');
      return null;
    }

    const priceSources: string[] = [];

    // Add CoinGecko API if enabled
    if (currency.priceApi?.coingecko?.enabled) {
      priceSources.push(
        `https://api.coingecko.com/api/v3/simple/price?ids=${currency.priceApi.coingecko.id}&vs_currencies=btc,usd`
      );
    }

    // Add CoinPaprika API if enabled
    if (currency.priceApi?.coinpaprika?.enabled) {
      priceSources.push(
        `https://api.coinpaprika.com/v1/tickers/${currency.priceApi.coinpaprika.id}`
      );
    }

    // If no price APIs are configured, use fallback
    if (priceSources.length === 0) {
      console.log('⚠️ No price APIs configured, using fallback data');
      return {
        symbol: currency.symbol,
        timestamp: Date.now(),
        quoteBTC: 0.000001, // Mock BTC price
        quoteUSD: 0.05 // Mock USD price
      };
    }

    // Try each source with timeout and retry
    for (const source of priceSources) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(source, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'VirBiCoin-Explorer/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.log(`❌ API response not ok for ${source}: ${response.status}`);
          continue;
        }

        const data = await response.json() as any;

        // Parse different API formats
        let quoteBTC = 0;
        let quoteUSD = 0;

        if (source.includes('coingecko')) {
          const coinId = currency.priceApi?.coingecko?.id;
          if (data[coinId!]) {
            quoteBTC = data[coinId!].btc || 0;
            quoteUSD = data[coinId!].usd || 0;
          }
        } else if (source.includes('coinpaprika')) {
          quoteBTC = data.quotes?.BTC?.price || 0;
          quoteUSD = data.quotes?.USD?.price || 0;
        }

        if (quoteUSD > 0 || quoteBTC > 0) {
          return {
            symbol: currency.symbol,
            timestamp: Date.now(),
            quoteBTC,
            quoteUSD
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`❌ Failed to fetch from ${source}: ${errorMessage}`);
        continue;
      }
    }

    // Fallback: use mock data if no external API works
    console.log('🔄 Using fallback price data');
    return {
      symbol: currency.symbol,
      timestamp: Date.now(),
      quoteBTC: 0.000001, // Mock BTC price
      quoteUSD: 0.05 // Mock USD price
    };

  } catch (error) {
    console.error(`❌ Error fetching ${config.currency?.symbol || 'crypto'} price:`, error);
    return null;
  }
};

/**
 * Update price data in database with memory management
 */
const updatePriceData = async (priceData: PriceData): Promise<void> => {
  try {
    // Memory check before database operation
    if (!checkMemory()) {
      console.log('💾 Memory limit reached, waiting before database update');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const market = new Market(priceData);
    await market.save();

    if (!config.quiet) {
      console.log(`💰 Price data updated: ${priceData.symbol} = $${priceData.quoteUSD} (${priceData.quoteBTC} BTC)`);
    }
  } catch (error) {
    console.error('❌ Error updating price data:', error);
  }
};

/**
 * Get latest price from database
 */
const getLatestPrice = async (): Promise<PriceData | null> => {
  try {
    const latestPrice = await Market.findOne().sort({ timestamp: -1 });
    return latestPrice;
  } catch (error) {
    console.error('❌ Error getting latest price:', error);
    return null;
  }
};

/**
 * Check if price data needs updating
 */
const shouldUpdatePrice = async (): Promise<boolean> => {
  try {
    const latestPrice = await getLatestPrice();
    if (!latestPrice) return true;

    const timeSinceLastUpdate = Date.now() - latestPrice.timestamp;
    return timeSinceLastUpdate > config.priceUpdateInterval;
  } catch (error) {
    console.error('❌ Error checking price update status:', error);
    return true;
  }
};

/**
 * Main price update function with error handling and memory management
 */
const updatePrice = async (): Promise<void> => {
  try {
    // Memory check before processing
    if (!checkMemory()) {
      console.log('💾 Memory limit reached, skipping price update');
      return;
    }

    if (!(await shouldUpdatePrice())) {
      if (!config.quiet) {
        console.log('✅ Price data is up to date');
      }
      return;
    }

    const priceData = await fetchCryptoPrice();
    if (priceData) {
      await updatePriceData(priceData);
    } else {
      console.error('❌ Failed to fetch price data');
    }
  } catch (error) {
    console.error('❌ Error in price update:', error);
  }
};

/**
 * Continuous price monitoring with improved error handling
 */
const startPriceMonitoring = async (): Promise<void> => {
  const currencySymbol = config.currency?.symbol || 'CRYPTO';
  console.log(`💰 Starting ${currencySymbol} price monitoring...`);
  console.log(`⏰ Update interval: ${config.priceUpdateInterval / 1000} seconds`);

  // Initial update
  await updatePrice();

  // Set up periodic updates with error handling
  setInterval(async () => {
    try {
      await updatePrice();
    } catch (error) {
      console.error('❌ Error in periodic price update:', error);
    }
  }, config.priceUpdateInterval);
};

/**
 * One-time price update
 */
const runOnce = async (): Promise<void> => {
  console.log('🔄 Running one-time price update...');
  await updatePrice();
  process.exit(0);
};

/**
 * Show current price
 */
const showCurrentPrice = async (): Promise<void> => {
  const latestPrice = await getLatestPrice();
  if (latestPrice) {
    console.log(`💰 Current ${latestPrice.symbol} price: $${latestPrice.quoteUSD} (${latestPrice.quoteBTC} BTC)`);
    console.log(`🕐 Last updated: ${new Date(latestPrice.timestamp).toLocaleString()}`);
  } else {
    console.log('❌ No price data available');
  }
  process.exit(0);
};

// Main execution
const main = async (): Promise<void> => {
  try {
    // Initialize database connection first
    await initDB();

    const args = process.argv.slice(2);

    if (args.includes('--once') || args.includes('-o')) {
      await runOnce();
    } else if (args.includes('--show') || args.includes('-s')) {
      await showCurrentPrice();
    } else if (args.includes('--help') || args.includes('-h')) {
      const currencySymbol = config.currency?.symbol || 'CRYPTO';
      console.log(`
💰 ${currencySymbol} Price Tool

Usage:
  npm run price                    # Start continuous monitoring
  npm run price -- --once         # Run one-time update
  npm run price -- --show         # Show current price
  npm run price -- --help         # Show this help

Options:
  --once, -o    Run one-time price update
  --show, -s    Show current price from database
  --help, -h    Show this help message
    `);
      process.exit(0);
    } else {
      await startPriceMonitoring();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`💥 Fatal error: ${errorMessage}`);
    process.exit(1);
  }
};

export { main };

if (require.main === module) {
  main();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Price monitoring stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Price monitoring stopped');
  process.exit(0);
});