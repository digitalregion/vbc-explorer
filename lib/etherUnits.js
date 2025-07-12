/**
 * Ethereum unit conversion utilities
 */

var unitMap = {
    'wei': '1',
    'kwei': '1000',
    'babbage': '1000',
    'femtoether': '1000',
    'mwei': '1000000',
    'lovelace': '1000000',
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
    'tether': '1000000000000000000000000000000'
};

var getValueOfUnit = function (unit) {
    unit = unit ? unit.toLowerCase() : 'ether';
    var unitValue = unitMap[unit];
    return unitValue !== undefined ? unitValue : unitMap['ether'];
};

var convertToEther = function (number, unit) {
    unit = unit ? unit.toLowerCase() : 'ether';
    var unitValue = getValueOfUnit(unit);
    return number / parseFloat(unitValue);
};

var convertFromEther = function (number, unit) {
    unit = unit ? unit.toLowerCase() : 'ether';
    var unitValue = getValueOfUnit(unit);
    return number * parseFloat(unitValue);
};

module.exports = {
    unitMap: unitMap,
    getValueOfUnit: getValueOfUnit,
    convertToEther: convertToEther,
    convertFromEther: convertFromEther
};
