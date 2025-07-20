/**
 * Utility functions for BigInt operations and currency conversions
 */

// Default conversion factors (will be overridden by config)
let BASE_TO_CURRENCY = 1000000000000000000n; // 10^18
let BASE_TO_GAS_UNIT = 1000000000n; // 10^9
let CURRENCY_UNIT = 'ETH';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let BASE_UNIT = 'wei';
let GAS_UNIT = 'Gwei';

/**
 * Initialize conversion factors from config
 */
export async function initializeCurrency() {
  try {
    const response = await fetch('/api/config/client');
    if (response.ok) {
      const config = await response.json();
      const decimals = config.currency?.decimals || 18;
      const unit = config.currency?.unit || 'wei';
      const symbol = config.currency?.symbol || 'ETH';
      const gasUnit = config.currency?.gasUnit || 'Gwei';
      
      BASE_TO_CURRENCY = BigInt(10) ** BigInt(decimals);
      BASE_TO_GAS_UNIT = BigInt(10) ** BigInt(9);
      CURRENCY_UNIT = symbol;
      BASE_UNIT = unit;
      GAS_UNIT = gasUnit;
    }
  } catch (error) {
    console.error('Error loading currency config:', error);
  }
}

/**
 * Convert base unit to currency using BigInt
 */
export function baseToCurrency(base: string | bigint): string {
  try {
    const baseBigInt = typeof base === 'string' ? BigInt(base) : base;

    if (baseBigInt === 0n) return '0';

    const currency = baseBigInt / BASE_TO_CURRENCY;
    const remainder = baseBigInt % BASE_TO_CURRENCY;

    if (remainder === 0n) {
      return currency.toString();
    }

    // Handle decimal places
    const decimalPlaces = Number(BASE_TO_CURRENCY.toString().length - 1);
    const factor = 10n ** BigInt(decimalPlaces);
    const scaled = (baseBigInt * factor) / BASE_TO_CURRENCY;

    let result = scaled.toString();

    // Add decimal point
    if (result.length <= decimalPlaces) {
      result = '0.' + '0'.repeat(decimalPlaces - result.length) + result;
    } else {
      const integerPart = result.slice(0, result.length - decimalPlaces);
      const decimalPart = result.slice(result.length - decimalPlaces);
      result = integerPart + '.' + decimalPart;
    }

    // Remove trailing zeros
    result = result.replace(/\.?0+$/, '');

    return result;
  } catch {
    return '0';
  }
}

/**
 * Convert base unit to gas unit using BigInt
 */
export function baseToGasUnit(base: string | bigint): string {
  try {
    const baseBigInt = typeof base === 'string' ? BigInt(base) : base;

    if (baseBigInt === 0n) return '0';

    const gasUnit = baseBigInt / BASE_TO_GAS_UNIT;
    const remainder = baseBigInt % BASE_TO_GAS_UNIT;

    if (remainder === 0n) {
      return gasUnit.toString();
    }

    // Handle decimal places for gas unit (up to 9 decimal places)
    const decimalPlaces = 9;
    const factor = 10n ** BigInt(decimalPlaces);
    const scaled = (baseBigInt * factor) / BASE_TO_GAS_UNIT;

    let result = scaled.toString();

    // Add decimal point
    if (result.length <= decimalPlaces) {
      result = '0.' + '0'.repeat(decimalPlaces - result.length) + result;
    } else {
      const integerPart = result.slice(0, result.length - decimalPlaces);
      const decimalPart = result.slice(result.length - decimalPlaces);
      result = integerPart + '.' + decimalPart;
    }

    // Remove trailing zeros
    result = result.replace(/\.?0+$/, '');

    return result;
  } catch {
    return '0';
  }
}

/**
 * Format currency value for display
 */
export function formatCurrency(value: string): string {
  try {
    const numValue = parseFloat(value);

    if (numValue === 0) return `0 ${CURRENCY_UNIT}`;

    // For very small values
    if (numValue < 0.000001) {
      return `${value} ${CURRENCY_UNIT}`;
    }

    // For values less than 1
    if (numValue < 1) {
      return `${parseFloat(value).toFixed(6).replace(/\.?0+$/, '')} ${CURRENCY_UNIT}`;
    }

    // For values less than 1000
    if (numValue < 1000) {
      return `${parseFloat(value).toFixed(4).replace(/\.?0+$/, '')} ${CURRENCY_UNIT}`;
    }

    // For larger values
    return `${parseFloat(value).toFixed(2).replace(/\.?0+$/, '')} ${CURRENCY_UNIT}`;
  } catch {
    return `0 ${CURRENCY_UNIT}`;
  }
}

/**
 * Format gas unit value for display
 */
export function formatGasUnit(value: string): string {
  try {
    const numValue = parseFloat(value);
    return `${Math.floor(numValue)} ${GAS_UNIT}`;
  } catch {
    return 'N/A';
  }
}

// Backward compatibility functions
export function weiToVBC(wei: string | bigint): string {
  return baseToCurrency(wei);
}

export function weiToGwei(wei: string | bigint): string {
  return baseToGasUnit(wei);
}

export function formatVBC(value: string): string {
  return formatCurrency(value);
}

export function formatGwei(value: string): string {
  return formatGasUnit(value);
}

export function baseToGwei(base: string | bigint): string {
  return baseToGasUnit(base);
}
