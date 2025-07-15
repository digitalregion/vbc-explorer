import virBiCoinUnits from './etherUnits';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars
const RLP = require('rlp');

interface Transaction {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string | number;
  gas: number;
  timestamp: number;
  creates?: string;
}

interface TraceTransaction {
  type?: string;
  action: {
    address?: string;
    balance?: string | number;
    refundAddress?: string;
    to?: string;
    from: string;
    gas?: string | number;
    value: string | number;
  };
  result?: {
    gasUsed?: string | number;
    address?: string;
  };
}

/**
 * Filter an array of transactions for display
 */
function filterTX(txs: Transaction[]): unknown[] {
  return txs.map(tx => [
    tx.hash, 
    tx.blockNumber, 
    tx.from, 
    tx.to, 
    virBiCoinUnits.toVBC(tx.value.toString(), 'niku'), 
    tx.gas, 
    tx.timestamp, 
    tx.creates
  ]);
}

/**
 * Filter trace transactions for display
 */
function filterTrace(txs: TraceTransaction[]): unknown[] {
  return txs.map((tx) => {
    const t = { ...tx };
    if (t.type == 'suicide') {
      if (t.action.address) t.from = t.action.address;
      if (t.action.balance) t.value = virBiCoinUnits.toVBC(t.action.balance.toString(), 'niku');
      if (t.action.refundAddress) t.to = t.action.refundAddress;
    } else {
      if (t.action.to) t.to = t.action.to;
      t.from = t.action.from;
      if (t.action.gas) t.gas = Number(t.action.gas);
      if ((t.result) && (t.result.gasUsed)) t.gasUsed = Number(t.result.gasUsed);
      if ((t.result) && (t.result.address)) t.to = t.result.address;
      t.value = virBiCoinUnits.toVBC(t.action.value.toString(), 'niku');
    }
    return t;
  });
}

interface Block {
  number: number;
}

/**
 * Filter block data for display
 */
function filterBlocks(blocks: Block[], value?: number): Block[] {
  if (typeof value !== 'undefined') {
    return blocks.filter(block => block.number >= value);
  }
  return blocks;
}

/**
 * Filter internal transactions
 */
function filterInternalTx(txs: TraceTransaction[]): unknown[] {
  return txs.map((tx) => {
    const t = { ...tx };
    if (t.type == 'suicide') {
      if (t.action.address) t.from = t.action.address;
      if (t.action.balance) t.value = virBiCoinUnits.toVBC(t.action.balance.toString(), 'niku');
      if (t.action.refundAddress) t.to = t.action.refundAddress;
    } else {
      if (t.action.to) t.to = t.action.to;
      t.from = t.action.from;
      if (t.action.gas) t.gas = Number(t.action.gas);
      if ((t.result) && (t.result.gasUsed)) t.gasUsed = Number(t.result.gasUsed);
      if ((t.result) && (t.result.address)) t.to = t.result.address;
      t.value = virBiCoinUnits.toVBC(t.action.value.toString(), 'niku');
    }
    return t;
  });
}

/**
 * Helper function to format currency values
 */
function formatCurrency(value: string | number | bigint, unit: string = 'niku'): string {
  return virBiCoinUnits.toVBC(value, unit);
}

/**
 * Helper function to format Wei/Niku values to VBC
 */
function formatValue(value: string | number | bigint): string {
  return virBiCoinUnits.toVBC(value, 'niku');
}

/**
 * Helper function to format gas price
 */
function formatGasPrice(gasPrice: string | number | bigint): string {
  return virBiCoinUnits.toGwei(gasPrice, 'niku');
}

export {
  filterTX,
  filterTrace,
  filterBlocks,
  filterInternalTx,
  formatCurrency,
  formatValue,
  formatGasPrice
}; 