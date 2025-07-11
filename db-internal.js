/******
  DEPRECATED -- DO NOT USE
*******/
var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var InternalTransaction = new Schema(
{
    "type": String,
    "action": {
      "from": String,  // for call
      "to": String,
      "value": String,
      "gas": Number,
      "input":String,
      "callType":String,
      "init": String, // for create
      "address": String, // for suicide
      "refundAddress": String,
      "balance": String
    },
    "result": {
      "gasUsed":Number,
      "output":String,
      "code": String,
      "address": String
    },
    "error": String,
    "traceAddress":[String],
    "subtraces":Number,
    "transactionPosition":Number,
    "transactionHash": {type: String, index: {unique: false}}, // parent transaction
    "blockNumber":{type: Number, index: {unique: false}},
    "timestamp": Number,
    "blockHash":String
});

// BlockStat model for storing block statistics
var BlockStat = new Schema(
{
    "number": {type: Number, index: {unique: true}},
    "timestamp": Number,
    "difficulty": String,
    "txCount": Number,
    "gasUsed": Number,
    "gasLimit": Number,
    "miner": {type: String, index: true},
    "blockTime": Number,
    "uncleCount": Number
});

// Account model for storing account information and balances
var Account = new Schema(
{
    "address": {type: String, index: {unique: true}},
    "balance": Number,
    "blockNumber": Number,
    "type": {type: Number, default: 0}, // 0: normal, 1: contract
});

mongoose.model('InternalTransaction', InternalTransaction);
mongoose.model('BlockStat', BlockStat);
mongoose.model('Account', Account);

module.exports.InternalTransaction = mongoose.model('InternalTransaction');
module.exports.BlockStat = mongoose.model('BlockStat');
module.exports.Account = mongoose.model('Account');