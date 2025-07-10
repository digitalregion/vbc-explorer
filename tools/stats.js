/*
  Tool for calculating block stats
*/

const _ = require('lodash');
const Web3 = require('web3');

const mongoose = require('mongoose');
const { BlockStat } = require('../db.js');

// load config.json
const config = { nodeAddr: 'localhost', wsPort: 8546, bulkSize: 100 };
try {
  var local = require('../config.json');
  _.extend(config, local);
  console.log('config.json found.');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    var local = require('../config.example.json');
    _.extend(config, local);
    console.log('No config file found. Using default configuration... (config.example.json)');
  } else {
    throw error;
    process.exit(1);
  }
}

console.log(`Connecting ${config.nodeAddr}:${config.wsPort}...`);
// Sets address for RPC WEB3 to connect to, usually your node IP address defaults ot localhost
const web3 = new Web3(new Web3.providers.WebsocketProvider(`ws://${config.nodeAddr}:${config.wsPort.toString()}`));
if ('quiet' in config && config.quiet === true) {
  console.log('Quiet mode enabled');
}

const updateStats = async (range, interval, rescan) => {
  let latestBlock = await web3.eth.getBlockNumber();

  interval = Math.abs(parseInt(interval));
  if (!range) {
    range = 1000;
  }
  range *= interval;
  if (interval >= 10) {
    latestBlock -= latestBlock % interval;
  }
  await getStats(web3, latestBlock, null, latestBlock - range, interval, rescan);
};

// getStatsのコールバックをasync/awaitに対応
var getStats = async function (web3, blockNumber, nextBlock, endNumber, interval, rescan) {
  if (endNumber < 0) endNumber = 0;
  if (blockNumber <= endNumber) {
    if (rescan) {
      process.exit(9);
    }
    return;
  }

  if (await web3.eth.net.isListening()) {
    try {
      const blockData = await web3.eth.getBlock(blockNumber, true);
      if (!blockData) {
        console.log(`Warning: null block data received from the block with hash/number: ${blockNumber}`);
      } else {
        if (nextBlock) await checkBlockDBExistsThenWrite(web3, blockData, nextBlock, endNumber, interval, rescan);
        else await checkBlockDBExistsThenWrite(web3, blockData, null, endNumber, interval, rescan);
      }
    } catch (error) {
      console.log(`Warning: error on getting block with hash/number: ${blockNumber}: ${error}`);
    }
  } else {
    console.log(`${'Error: Aborted due to web3 is not connected when trying to ' + 'get block '}${blockNumber}`);
    process.exit(9);
  }
};

// checkBlockDBExistsThenWriteをasync/await化
var checkBlockDBExistsThenWrite = async function (web3, blockData, nextBlock, endNumber, interval, rescan) {
  try {
    const b = await BlockStat.find({ number: blockData.number });
    if (!b.length && nextBlock) {
      // calc hashrate, txCount, blocktime, uncleCount
      const stat = {
        'number': blockData.number,
        'timestamp': blockData.timestamp,
        'difficulty': blockData.difficulty,
        'txCount': blockData.transactions.length,
        'gasUsed': blockData.gasUsed,
        'gasLimit': blockData.gasLimit,
        'miner': blockData.miner,
        'blockTime': (nextBlock.timestamp - blockData.timestamp) / (nextBlock.number - blockData.number),
        'uncleCount': blockData.uncles.length,
      };
      const s = await new BlockStat(stat).save();
      if (!('quiet' in config && config.quiet === true)) {
        console.log(s);
      }
      if (!s) {
        console.log(`${'Error: Aborted due to error on ' + 'block number '}${blockData.number.toString()}`);
        process.exit(9);
      } else {
        if (!('quiet' in config && config.quiet === true)) {
          console.log(`DB successfully written for block number ${blockData.number.toString()}`);
        }
        await getStats(web3, blockData.number - interval, blockData, endNumber, interval, rescan);
      }
    } else {
      if (rescan || !nextBlock) {
        await getStats(web3, blockData.number - interval, blockData, endNumber, interval, rescan);
        if (nextBlock) {
          if (!('quiet' in config && config.quiet === true)) {
            console.log(`WARN: block number: ${blockData.number.toString()} already exists in DB.`);
          }
        }
      } else {
        if (!('quiet' in config && config.quiet === true)) {
          console.error(`Aborting because block number: ${blockData.number.toString()} already exists in DB.`);
        }
      }
    }
  } catch (err) {
    console.log(err);
    process.exit(9);
  }
};

const minutes = 1;
statInterval = minutes * 60 * 1000;

let rescan = false; /* rescan: true - rescan range */
let range = 1000;
let interval = 100;

/**
 * RESCAN=1000:100000 means interval;range
 *
 * Usage:
 *   RESCAN=1000:100000 node tools/stats.js
 */
if (process.env.RESCAN) {
  const tmp = process.env.RESCAN.split(/:/);
  if (tmp.length > 1) {
    interval = Math.abs(parseInt(tmp[0]));
    if (tmp[1]) {
      range = Math.abs(parseInt(tmp[1]));
    }
  }
  let i = interval;
  var j = 0;
  for (var j = 0; i >= 10; j++) {
    i = parseInt(i / 10);
  }
  interval = Math.pow(10, j);
  console.log(`Selected interval = ${interval}`);

  rescan = true;
}

// run
updateStats(range, interval, rescan);

if (!rescan) {
  setInterval(() => {
    updateStats(range, interval);
  }, statInterval);
}

