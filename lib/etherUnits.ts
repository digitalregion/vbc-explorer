import BigNumber from 'bignumber.js';

interface UnitMap {
  [key: string]: string;
}

interface EtherUnits {
  unitMap: UnitMap;
  getValueOfUnit(unit: string): BigNumber;
  toEther(number: string | number, unit?: string): string;
  toGwei(number: string | number, unit?: string): string;
  toWei(number: string | number, unit?: string): string;
}

const etherUnits: EtherUnits = {
  unitMap: {
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

  getValueOfUnit(unit: string): BigNumber {
    unit = unit ? unit.toLowerCase() : 'ether';
    const unitValue = this.unitMap[unit];
    if (unitValue === undefined) {
      throw new Error('Invalid unit: ' + unit + '. Supported units: ' + JSON.stringify(this.unitMap, null, 2));
    }
    return new BigNumber(unitValue, 10);
  },

  toEther(number: string | number, unit?: string): string {
    const returnValue = new BigNumber(this.toWei(number, unit)).div(this.getValueOfUnit('ether'));
    return returnValue.toString(10);
  },

  toGwei(number: string | number, unit?: string): string {
    const returnValue = new BigNumber(this.toWei(number, unit)).div(this.getValueOfUnit('gwei'));
    return returnValue.toString(10);
  },

  toWei(number: string | number, unit?: string): string {
    const returnValue = new BigNumber(String(number)).times(this.getValueOfUnit(unit || 'ether'));
    return returnValue.toString(10);
  }
};

export default etherUnits;
