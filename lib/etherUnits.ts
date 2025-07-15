// VirBiCoin units converter using native BigInt
// Supports VirBiCoin-specific unit naming conventions

interface UnitMap {
  [key: string]: string;
}

interface VirBiCoinUnits {
  unitMap: UnitMap;
  getValueOfUnit(unit: string): bigint;
  toVBC(number: string | number | bigint, unit?: string): string;
  toGwei(number: string | number | bigint, unit?: string): string;
  toNiku(number: string | number | bigint, unit?: string): string;
  // Legacy compatibility methods
  toEther(number: string | number | bigint, unit?: string): string;
  toWei(number: string | number | bigint, unit?: string): string;
}

const virBiCoinUnits: VirBiCoinUnits = {
  unitMap: {
    // VirBiCoin specific naming (niku instead of wei)
    'niku': '1',
    'kniku': '1000',
    'mniku': '1000000',
    'gniku': '1000000000',
    'vbc': '1000000000000000000',

    // Legacy Ethereum-compatible names for compatibility
    'wei': '1',
    'kwei': '1000',
    'ada': '1000',
    'femtoether': '1000',
    'mwei': '1000000',
    'babbage': '1000000',
    'picoether': '1000000',
    'gwei': '1000000000',
    'shannon': '1000000000',
    'nanoether': '1000000000',
    'nano': '1000000000',
    'szabo': '1000000000000',
    'microether': '1000000000000',
    'micro': '1000000000000',
    'finney': '1000000000000000',
    'milliether': '1000000000000000',
    'milli': '1000000000000000',
    'ether': '1000000000000000000',
    'kether': '1000000000000000000000',
    'grand': '1000000000000000000000',
    'einstein': '1000000000000000000000',
    'mether': '1000000000000000000000000',
    'gether': '1000000000000000000000000000',
    'tether': '1000000000000000000000000000000',
  },

  getValueOfUnit(unit: string): bigint {
    unit = unit ? unit.toLowerCase() : 'vbc';
    const unitValue = this.unitMap[unit];
    if (unitValue === undefined) {
      throw new Error('Invalid unit: ' + unit + '. Supported units: ' + JSON.stringify(this.unitMap, null, 2));
    }
    return BigInt(unitValue);
  },

  toVBC(number: string | number | bigint, unit?: string): string {
    const nikuValue = BigInt(this.toNiku(number, unit));
    const vbcValue = nikuValue * 1000000000000000000n / this.getValueOfUnit('vbc');
    return (Number(vbcValue) / 1000000000000000000).toString();
  },

  toGwei(number: string | number | bigint, unit?: string): string {
    const nikuValue = BigInt(this.toNiku(number, unit));
    const gweiValue = nikuValue / this.getValueOfUnit('gwei');
    return gweiValue.toString();
  },

  toNiku(number: string | number | bigint, unit?: string): string {
    const inputValue = BigInt(String(number));
    const multiplier = this.getValueOfUnit(unit || 'vbc');
    const result = inputValue * multiplier;
    return result.toString();
  },

  // Legacy compatibility methods
  toEther(number: string | number | bigint, unit?: string): string {
    return this.toVBC(number, unit);
  },

  toWei(number: string | number | bigint, unit?: string): string {
    return this.toNiku(number, unit);
  }
};

export default virBiCoinUnits;
