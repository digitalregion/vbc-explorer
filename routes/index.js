const mongoose = require('mongoose');

const Block = mongoose.model('Block');
const Transaction = mongoose.model('Transaction');
const Account = mongoose.model('Account');
const async = require('async');
const filters = require('./filters');
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/tokens.json')));

module.exports = function (app) {
  const web3relay = require('./web3relay');

  const Token = require('./token');

  const compile = require('./compiler');
  const stats = require('./stats');
  const richList = require('./richlist');

  /*
    Local DB: data request format
    { "address": "0x1234blah", "txin": true }
    { "tx": "0x1234blah" }
    { "block": "1234" }
  */
  app.post('/richlist', richList);
  app.post('/addr', getAddr);
  app.post('/addr_count', getAddrCounter);
  app.post('/tx', getTx);
  app.post('/block', getBlock);
  app.post('/data', getData);
  app.get('/total', getTotal);
  app.get('/api/account/:address/erc721', async (req, res) => {
    const userAddress = req.params.address.toLowerCase();
    // tokens.jsonからtype: "ERC721"のアドレスを抽出
    const contractAddresses = tokens
      .filter(t => t.type && t.type.toUpperCase() === 'ERC721')
      .map(t => t.address);
    const ERC721_ABI = [
      { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "type": "function" },
      { "constant": true, "inputs": [ { "name": "_owner", "type": "address" }, { "name": "_index", "type": "uint256" } ], "name": "tokenOfOwnerByIndex", "outputs": [{ "name": "tokenId", "type": "uint256" }], "type": "function" }
    ];
    const web3 = new Web3(process.env.WEB3_PROVIDER || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY');
    const results = [];
    for (const contractAddress of contractAddresses) {
      try {
        const contract = new web3.eth.Contract(ERC721_ABI, contractAddress);
        const balance = await contract.methods.balanceOf(userAddress).call();
        const tokenIds = [];
        for (let i = 0; i < balance; i++) {
          const tokenId = await contract.methods.tokenOfOwnerByIndex(userAddress, i).call();
          tokenIds.push(tokenId);
        }
        if (tokenIds.length > 0) {
          results.push({ contract: contractAddress, tokenIds });
        }
      } catch (e) {
        console.error('ERC721取得エラー', contractAddress, e);
      }
    }
    res.json(results);
  });

  app.post('/tokenrelay', Token);
  app.post('/web3relay', web3relay.data);
  app.post('/compile', compile);

  app.post('/stats', stats);
};

const getAddr = async (req, res) => {
  // TODO: validate addr and tx
  const addr = req.body.addr.toLowerCase();
  const count = parseInt(req.body.count);

  const limit = parseInt(req.body.length);
  const start = parseInt(req.body.start);

  const data = {
    draw: parseInt(req.body.draw), recordsFiltered: count, recordsTotal: count, mined: 0,
  };

  const addrFind = Transaction.find({ $or: [{ 'to': addr }, { 'from': addr }] });

  let sortOrder = '-blockNumber';
  if (req.body.order && req.body.order[0] && req.body.order[0].column) {
    // date or blockNumber column
    if (req.body.order[0].column == 1 || req.body.order[0].column == 6) {
      if (req.body.order[0].dir == 'asc') {
        sortOrder = 'blockNumber';
      }
    }
  }

  try {
    const docs = await addrFind.lean(true).sort(sortOrder).skip(start).limit(limit);
    if (docs) data.data = filters.filterTX(docs, addr);
    else data.data = [];
    res.write(JSON.stringify(data));
    res.end();
  } catch (err) {
    console.error('Error fetching address data:', err);
    data.data = [];
    res.write(JSON.stringify(data));
    res.end();
  }
};
var getAddrCounter = async function (req, res) {
  const addr = req.body.addr.toLowerCase();
  const count = parseInt(req.body.count);
  const data = { recordsFiltered: count, recordsTotal: count, mined: 0 };

  try {
    // Count transactions
    const txCount = await Transaction.countDocuments({ $or: [{ 'to': addr }, { 'from': addr }] });
    if (txCount) {
      data.recordsTotal = txCount;
      data.recordsFiltered = txCount;
    }

    // Count mined blocks
    const minedCount = await Block.countDocuments({ 'miner': addr });
    if (minedCount) {
      data.mined = minedCount;
    }

    res.write(JSON.stringify(data));
    res.end();
  } catch (err) {
    console.error('Error counting address data:', err);
    res.write(JSON.stringify(data));
    res.end();
  }
};
var getBlock = async function (req, res) {
  // TODO: support queries for block hash
  const txQuery = 'number';
  const number = parseInt(req.body.block);

  try {
    const doc = await Block.findOne({ number }).lean(true);
    if (!doc) {
      console.error(`Block not found: ${number}`);
      console.error(req.body);
      res.write(JSON.stringify({ 'error': true }));
    } else {
      const block = filters.filterBlocks([doc]);
      res.write(JSON.stringify(block[0]));
    }
    res.end();
  } catch (err) {
    console.error(`BlockFind error: ${err}`);
    console.error(req.body);
    res.write(JSON.stringify({ 'error': true }));
    res.end();
  }
};
var getTx = async function (req, res) {
  const tx = req.body.tx.toLowerCase();
  
  try {
    const doc = await Block.findOne({ 'transactions.hash': tx }, 'transactions timestamp').lean(true);
    if (!doc) {
      console.log(`missing: ${tx}`);
      res.write(JSON.stringify({}));
      res.end();
    } else {
      // filter transactions
      const txDocs = filters.filterBlock(doc, 'hash', tx);
      res.write(JSON.stringify(txDocs));
      res.end();
    }
  } catch (err) {
    console.error(`Transaction find error: ${err}`);
    res.write(JSON.stringify({}));
    res.end();
  }
};
/*
  Fetch data from DB
*/
var getData = function (req, res) {
  // TODO: error handling for invalid calls
  const action = req.body.action.toLowerCase();
  const { limit } = req.body;

  if (action in DATA_ACTIONS) {
    if (isNaN(limit)) var lim = MAX_ENTRIES;
    else var lim = parseInt(limit);
    DATA_ACTIONS[action](lim, res);
  } else {
    console.error(`Invalid Request: ${action}`);
    res.status(400).send();
  }
};

/*
  Total supply API code
*/
var getTotal = async function (req, res) {
  try {
    const docs = await Account.aggregate([
      { $group: { _id: null, totalSupply: { $sum: '$balance' } } },
    ]);
    if (docs && docs.length > 0) {
      res.write(docs[0].totalSupply.toString());
    } else {
      res.write('0');
    }
    res.end();
  } catch (err) {
    console.error('Error getting total supply:', err);
    res.write('Error getting total supply');
    res.end();
  }
};

/*
  temporary blockstats here
*/
const latestBlock = async function (req, res) {
  try {
    const doc = await Block.findOne({}, 'totalDifficulty').lean(true).sort('-number');
    res.write(JSON.stringify(doc));
    res.end();
  } catch (err) {
    console.error('Error getting latest block:', err);
    res.write(JSON.stringify({ error: true }));
    res.end();
  }
};

const getLatest = async function (lim, res, callback) {
  try {
    const docs = await Block.find({}, 'number transactions timestamp miner extraData')
      .lean(true).sort('-number').limit(lim);
    callback(docs, res);
  } catch (err) {
    console.error('Error getting latest blocks:', err);
    callback([], res);
  }
};

/* get blocks from db */
const sendBlocks = async function (lim, res) {
  try {
    const docs = await Block.find({}, 'number timestamp miner extraData')
      .lean(true).sort('-number').limit(lim);
    
    if (docs && docs.length > 0) {
      const blockNumber = docs[docs.length - 1].number;
      // aggregate transaction counters
      const results = await Transaction.aggregate([
        { $match: { blockNumber: { $gte: blockNumber } } },
        { $group: { _id: '$blockNumber', count: { $sum: 1 } } },
      ]);
      
      const txns = {};
      if (results) {
        // set transaction counters
        results.forEach((txn) => {
          txns[txn._id] = txn.count;
        });
        docs.forEach((doc) => {
          doc.txn = txns[doc.number] || 0;
        });
      }
      res.write(JSON.stringify({ 'blocks': filters.filterBlocks(docs) }));
      res.end();
    } else {
      res.write(JSON.stringify({ 'blocks': [] }));
      res.end();
    }
  } catch (err) {
    console.log(`sendBlocks error: ${err}`);
    res.write(JSON.stringify({ 'error': true }));
    res.end();
  }
};

const sendTxs = async function (lim, res) {
  try {
    const txs = await Transaction.find({}).lean(true).sort('-blockNumber').limit(lim);
    res.write(JSON.stringify({ 'txs': txs }));
    res.end();
  } catch (err) {
    console.error('Error getting transactions:', err);
    res.write(JSON.stringify({ 'txs': [] }));
    res.end();
  }
};

const MAX_ENTRIES = 10;

const DATA_ACTIONS = {
  'latest_blocks': sendBlocks,
  'latest_txs': sendTxs,
};
