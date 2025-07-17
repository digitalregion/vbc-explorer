#!/usr/bin/env node
/*
Tool for fetching and updating VirBiCoin price data
*/

import { Market } from '../models/index';
import { connectDB } from '../models/index';

// Initialize database connection
const initDB = async () => {
  try {
    await connectDB();
    console.log('Database connection initialized successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
};

// Interface definitions
interface Config {
  nodeAddr: string;
  port: number;
  quiet: boolean;
  priceUpdateInterval: number;
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
  priceUpdateInterval: 15 * 60 * 1000 // 15 minutes (5分→15分に延長)
};

// Try to load config.json
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const local = require('../config.json');
  Object.assign(config, local);
  console.log('config.json found.');
} catch (error) {
  console.log('No config file found. Using default configuration...');
}

// Initialize database connection after config is loaded
initDB();

if (config.quiet) {
  console.log('Quiet mode enabled');
}

/**
 * Fetch current VBC price from external API
 */
const fetchVBCPrice = async (): Promise<PriceData | null> => {
  try {
    // Try multiple price sources
    const priceSources = [
      'https://api.coingecko.com/api/v3/simple/price?ids=virbicoin&vs_currencies=btc,usd',
      'https://api.coinpaprika.com/v1/tickers/vbc-virbicoin',
      // Add more price sources as needed
    ];

    for (const source of priceSources) {
      try {
        const response = await fetch(source);
        if (!response.ok) continue;

        const data = await response.json() as any;
        
        // Parse different API formats
        let quoteBTC = 0;
        let quoteUSD = 0;

        if (source.includes('coingecko')) {
          if (data.virbicoin) {
            quoteBTC = data.virbicoin.btc || 0;
            quoteUSD = data.virbicoin.usd || 0;
          }
        } else if (source.includes('coinpaprika')) {
          quoteBTC = data.quotes?.BTC?.price || 0;
          quoteUSD = data.quotes?.USD?.price || 0;
        }

        if (quoteUSD > 0 || quoteBTC > 0) {
          return {
            symbol: 'VBC',
            timestamp: Date.now(),
            quoteBTC,
            quoteUSD
          };
        }
      } catch (error) {
        console.log(`Failed to fetch from ${source}: ${error}`);
        continue;
      }
    }

    // Fallback: use mock data if no external API works
    console.log('Using fallback price data');
    return {
      symbol: 'VBC',
      timestamp: Date.now(),
      quoteBTC: 0.000001, // Mock BTC price
      quoteUSD: 0.05 // Mock USD price
    };

  } catch (error) {
    console.error('Error fetching VBC price:', error);
    return null;
  }
};

/**
 * Update price data in database
 */
const updatePriceData = async (priceData: PriceData): Promise<void> => {
  try {
    const market = new Market(priceData);
    await market.save();

    if (!config.quiet) {
      console.log(`Price data updated: VBC = $${priceData.quoteUSD} (${priceData.quoteBTC} BTC)`);
    }
  } catch (error) {
    console.error('Error updating price data:', error);
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
    console.error('Error getting latest price:', error);
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
    console.error('Error checking price update status:', error);
    return true;
  }
};

/**
 * Main price update function
 */
const updatePrice = async (): Promise<void> => {
  try {
    if (!(await shouldUpdatePrice())) {
      if (!config.quiet) {
        console.log('Price data is up to date');
      }
      return;
    }

    const priceData = await fetchVBCPrice();
    if (priceData) {
      await updatePriceData(priceData);
    } else {
      console.error('Failed to fetch price data');
    }
  } catch (error) {
    console.error('Error in price update:', error);
  }
};

/**
 * Continuous price monitoring
 */
const startPriceMonitoring = async (): Promise<void> => {
  console.log('Starting VBC price monitoring...');
  console.log(`Update interval: ${config.priceUpdateInterval / 1000} seconds`);
  
  // Initial update
  await updatePrice();
  
  // Set up periodic updates
  setInterval(async () => {
    await updatePrice();
  }, config.priceUpdateInterval);
};

/**
 * One-time price update
 */
const runOnce = async (): Promise<void> => {
  console.log('Running one-time price update...');
  await updatePrice();
  process.exit(0);
};

/**
 * Show current price
 */
const showCurrentPrice = async (): Promise<void> => {
  const latestPrice = await getLatestPrice();
  if (latestPrice) {
    console.log(`Current VBC price: $${latestPrice.quoteUSD} (${latestPrice.quoteBTC} BTC)`);
    console.log(`Last updated: ${new Date(latestPrice.timestamp).toLocaleString()}`);
  } else {
    console.log('No price data available');
  }
  process.exit(0);
};

// Main execution
const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  
  if (args.includes('--once') || args.includes('-o')) {
    await runOnce();
  } else if (args.includes('--show') || args.includes('-s')) {
    await showCurrentPrice();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
VBC Price Tool

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
};

export { main };

if (require.main === module) {
  main();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nPrice monitoring stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nPrice monitoring stopped');
  process.exit(0);
}); 