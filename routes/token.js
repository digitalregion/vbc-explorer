#!/usr/bin/env node

/*
    Endpoint for client interface with ERC-20 tokens
*/

const { eth } = require('./web3relay');

const BigNumber = require('bignumber.js');

const etherUnits = require(`${__lib}etherUnits.js`);

const fs = require('fs');
const path = require('path');
const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/tokens.json')));

module.exports = async (req, res) => {
  console.log(req.body);

  const contractAddress = req.body.address;
  // tokens.jsonから該当アドレスの情報を取得
  const tokenMeta = tokens.find(t => t.address.toLowerCase() === contractAddress.toLowerCase());
  if (!tokenMeta) return res.status(404).send();

  const ABI = tokenMeta.abi;
  const Token = new eth.Contract(ABI, contractAddress);

  if (!('action' in req.body)) res.status(400).send();
  else if (req.body.action == 'info') {
    try {
      let tokenData = {
        'name': await Token.methods.name().call(),
        'symbol': await Token.methods.symbol().call(),
        'bytecode': await eth.getCode(contractAddress),
        'type': tokenMeta.type // ←typeを必ず含める
      };
      if (tokenMeta.type === 'ERC20' || !tokenMeta.type) {
        // ERC20用
        tokenData.balance = etherUnits.toEther(await eth.getBalance(contractAddress), 'wei');
        tokenData.total_supply = await Token.methods.totalSupply().call();
        tokenData.decimals = await Token.methods.decimals().call();
        tokenData.count = await eth.getTransactionCount(contractAddress);
      }
      // Contract Creator取得
      let creator = null;
      try {
        // コントラクト作成トランザクションを探す
        // 1. 最新ブロックから遡ってコントラクト作成Txを検索
        // 2. もしくはweb3.eth.getTransactionReceiptでcontractAddress一致Txを探す
        // ここでは簡易的にDBから検索（Transactionコレクション）
        const mongoose = require('mongoose');
        const Transaction = mongoose.model('Transaction');
        const creationTx = await Transaction.findOne({ creates: contractAddress.toLowerCase() }).lean(true);
        if (creationTx && creationTx.from) {
          creator = creationTx.from;
        } else {
          // DBに無い場合はweb3で全ブロック走査（重いので省略）
          creator = null;
        }
      } catch (e) {
        console.error('creator search error', e);
      }
      tokenData.creator = creator;
      // ERC721の場合はtotalSupplyやdecimalsを呼ばない
      res.write(JSON.stringify(tokenData));
      res.end();
    } catch (e) {
      console.error(e);
      res.status(500).send();
    }
  } else if (req.body.action == 'balanceOf') {
    const addr = req.body.user.toLowerCase();
    try {
      const tokens = await Token.methods.balanceOf(addr).call();
      res.write(JSON.stringify({ 'tokens': tokens }));
      res.end();
    } catch (e) {
      console.error(e);
    }
  }

};
