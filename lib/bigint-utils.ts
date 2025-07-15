/**
 * Utility functions for BigInt operations and Wei/VBC conversions
 */

const WEI_TO_VBC = 1000000000000000000n; // 10^18
const WEI_TO_GWEI = 1000000000n; // 10^9

/**
 * Convert Wei to VBC using BigInt
 */
export function weiToVBC(wei: string | bigint): string {
  try {
    const weiBigInt = typeof wei === 'string' ? BigInt(wei) : wei;

    if (weiBigInt === 0n) return '0';

    const vbc = weiBigInt / WEI_TO_VBC;
    const remainder = weiBigInt % WEI_TO_VBC;

    if (remainder === 0n) {
      return vbc.toString();
    }

    // Handle decimal places
    const decimalPlaces = 18;
    const factor = 10n ** BigInt(decimalPlaces);
    const scaled = (weiBigInt * factor) / WEI_TO_VBC;

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
 * Convert Wei to Gwei using BigInt
 */
export function weiToGwei(wei: string | bigint): string {
  try {
    const weiBigInt = typeof wei === 'string' ? BigInt(wei) : wei;

    if (weiBigInt === 0n) return '0';

    const gwei = weiBigInt / WEI_TO_GWEI;
    const remainder = weiBigInt % WEI_TO_GWEI;

    if (remainder === 0n) {
      return gwei.toString();
    }

    // Handle decimal places for Gwei (up to 9 decimal places)
    const decimalPlaces = 9;
    const factor = 10n ** BigInt(decimalPlaces);
    const scaled = (weiBigInt * factor) / WEI_TO_GWEI;

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
 * Format VBC value for display
 */
export function formatVBC(value: string): string {
  try {
    const numValue = parseFloat(value);

    if (numValue === 0) return '0 VBC';

    // For very small values
    if (numValue < 0.000001) {
      return `${value} VBC`;
    }

    // For values less than 1
    if (numValue < 1) {
      return `${parseFloat(value).toFixed(6).replace(/\.?0+$/, '')} VBC`;
    }

    // For values less than 1000
    if (numValue < 1000) {
      return `${parseFloat(value).toFixed(4).replace(/\.?0+$/, '')} VBC`;
    }

    // For larger values
    return `${parseFloat(value).toFixed(2).replace(/\.?0+$/, '')} VBC`;
  } catch {
    return '0 VBC';
  }
}

/**
 * Format Gwei value for display
 */
export function formatGwei(value: string): string {
  try {
    const numValue = parseFloat(value);
    return `${numValue.toFixed(2)} Gwei`;
  } catch {
    return 'N/A';
  }
}
