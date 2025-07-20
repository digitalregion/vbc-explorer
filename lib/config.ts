import fs from 'fs';
import path from 'path';

// Configuration interface
export interface Config {
  nodeAddr: string;
  port: number;
  wsPort: number;
  bulkSize: number;
  syncAll: boolean;
  quiet: boolean;
  useRichList: boolean;
  startBlock: number;
  endBlock: number | null;
  maxRetries: number;
  retryDelay: number;
  logLevel: string;
  enableNFT: boolean;
  enableContractVerification: boolean;
  enableTokenTracking: boolean;
  apiRateLimit: number;
  webSocketEnabled: boolean;
  web3Provider: {
    url: string;
  };
  performance: {
    memoryLimitMB: number;
    nodeOptions: string;
  };
  caching: {
    enabled: boolean;
    duration: number;
  };
  miners: Record<string, string>;
  features: {
    nft: {
      enabled: boolean;
      metadataProviders: string[];
      imageFallback: boolean;
      cacheEnabled: boolean;
    };
    contractVerification: {
      enabled: boolean;
      compilerVersions: string[];
      optimizationEnabled: boolean;
      maxSourceSize: number;
    };
    richlist: {
      enabled: boolean;
      updateInterval: number;
      minBalance: string;
    };
    statistics: {
      enabled: boolean;
      updateInterval: number;
      blockRange: number;
    };
  };
  api: {
    rateLimit: {
      windowMs: number;
      max: number;
    };
    cors: {
      origin: string[];
      credentials: boolean;
    };
  };
  database: {
    uri: string;
    options: {
      maxPoolSize: number;
      serverSelectionTimeoutMS: number;
      socketTimeoutMS: number;
      connectTimeoutMS: number;
      bufferCommands: boolean;
      autoIndex: boolean;
      autoCreate: boolean;
    };
  };
  logging: {
    level: string;
    file: {
      enabled: boolean;
      maxSize: string;
      maxFiles: number;
    };
    console: {
      enabled: boolean;
      colorize: boolean;
    };
  };
  explorer: {
    name: string;
    description: string;
    version: string;
    url: string;
    apiUrl: string;
  };
  currency: {
    name: string;
    symbol: string;
    unit: string;
    decimals: number;
    gasUnit?: string;
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

// Load configuration from file
export function loadConfig(): Config {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const exampleConfigPath = path.join(process.cwd(), 'config.example.json');
    
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else if (fs.existsSync(exampleConfigPath)) {
      return JSON.parse(fs.readFileSync(exampleConfigPath, 'utf8'));
    } else {
      throw new Error('Neither config.json nor config.example.json found');
    }
  } catch (error) {
    console.error('Error loading config:', error);
    throw new Error('Failed to load configuration');
  }
}

// Get gas unit from config (server-side)
export function getGasUnitServer(): string {
  try {
    const config = loadConfig();
    return config.currency?.gasUnit || 'Gwei';
  } catch (error) {
    console.error('Error loading gas unit from config:', error);
    return 'Gwei';
  }
}

// Cache for dynamic config
let configCache: Config | null = null;
let configPromise: Promise<Config> | null = null;

// No fallback config - always use config.json or config.example.json

// Load config from API (for client-side)
async function loadConfigFromAPI(): Promise<Config> {
  try {
    const response = await fetch('/api/config/client');
    if (response.ok) {
      const config = await response.json();
      return config;
    } else {
      console.warn(`API config request failed with status: ${response.status}`);
    }
  } catch (error) {
    console.warn('Error loading config from API:', error);
  }
  
  // Load from config.example.json as fallback
  console.log('Using config.example.json as fallback');
  return loadConfig();
}

// Get cached config or load from API
async function getConfig(): Promise<Config> {
  if (configCache) {
    return configCache;
  }
  
  if (configPromise) {
    return configPromise;
  }
  
  try {
    configPromise = loadConfigFromAPI();
    configCache = await configPromise;
    configPromise = null; // Reset promise after successful load
    return configCache;
  } catch (error) {
    console.error('Failed to load config, using config.example.json:', error);
    configPromise = null; // Reset promise on error
    configCache = loadConfig();
    return configCache;
  }
}

// Get currency configuration
export async function getCurrencyConfig() {
  try {
    const config = await getConfig();
    return config.currency;
  } catch (error) {
    console.warn('Error getting currency config:', error);
    const fallbackConfig = loadConfig();
    return fallbackConfig.currency;
  }
}

// Get explorer configuration
export async function getExplorerConfig() {
  try {
    const config = await getConfig();
    return config.explorer;
  } catch (error) {
    console.warn('Error getting explorer config:', error);
    const fallbackConfig = loadConfig();
    return fallbackConfig.explorer;
  }
}

// Get full app configuration
export async function getAppConfig() {
  try {
    const config = await getConfig();
    return {
      currency: config.currency,
      explorer: config.explorer
    };
  } catch (error) {
    console.warn('Error getting app config:', error);
    const fallbackConfig = loadConfig();
    return {
      currency: fallbackConfig.currency,
      explorer: fallbackConfig.explorer
    };
  }
}

// Get currency name
export async function getCurrencyName(): Promise<string> {
  try {
    const config = await getConfig();
    return config.currency.name;
  } catch (error) {
    console.warn('Error getting currency name:', error);
    const fallbackConfig = loadConfig();
    return fallbackConfig.currency.name;
  }
}

// Get currency symbol
export async function getCurrencySymbol(): Promise<string> {
  try {
    const config = await getConfig();
    return config.currency.symbol;
  } catch (error) {
    console.warn('Error getting currency symbol:', error);
    const fallbackConfig = loadConfig();
    return fallbackConfig.currency.symbol;
  }
}

// Get currency unit
export async function getCurrencyUnit(): Promise<string> {
  try {
    const config = await getConfig();
    return config.currency.unit;
  } catch (error) {
    console.warn('Error getting currency unit:', error);
    const fallbackConfig = loadConfig();
    return fallbackConfig.currency.unit;
  }
}

// Get currency decimals
export async function getCurrencyDecimals(): Promise<number> {
  try {
    const config = await getConfig();
    return config.currency.decimals;
  } catch (error) {
    console.warn('Error getting currency decimals:', error);
    const fallbackConfig = loadConfig();
    return fallbackConfig.currency.decimals;
  }
}

// Get explorer name
export async function getExplorerName(): Promise<string> {
  try {
    const config = await getConfig();
    return config.explorer.name;
  } catch (error) {
    console.warn('Error getting explorer name:', error);
    const fallbackConfig = loadConfig();
    return fallbackConfig.explorer.name;
  }
}

// Get explorer description
export async function getExplorerDescription(): Promise<string> {
  try {
    const config = await getConfig();
    return config.explorer.description;
  } catch (error) {
    console.warn('Error getting explorer description:', error);
    const fallbackConfig = loadConfig();
    return fallbackConfig.explorer.description;
  }
}

// Get miners configuration
export async function getMinersConfig() {
  try {
    const config = await getConfig();
    return config.miners;
  } catch (error) {
    console.warn('Error getting miners config:', error);
    const fallbackConfig = loadConfig();
    return fallbackConfig.miners;
  }
}

// Get gas unit from config (client-side)
export async function getGasUnit(): Promise<string> {
  try {
    const config = await getConfig();
    return config.currency?.gasUnit || 'Gwei';
  } catch (error) {
    console.warn('Error getting gas unit:', error);
    const fallbackConfig = loadConfig();
    return fallbackConfig.currency.gasUnit || 'Gwei';
  }
}
// Note: Synchronous functions are removed to ensure config.json is always used
// Use async functions instead: getCurrencySymbol(), getCurrencyName(), getGasUnit(), etc. 
