/*
  Stuff to deal with verified contracts in DB
*/

require('../db.js');
const mongoose = require('mongoose');

const Contract = mongoose.model('Contract');

exports.addContract = function (contract) {
  Contract.update(
    { address: contract.address },
    { $setOnInsert: contract },
    { upsert: true },
    (err, data) => {
      console.log(data);
    },
  );
};

exports.findContract = async function (address, res) {
  try {
    const doc = await Contract.findOne({ address }).lean(true);
    if (!doc || !doc.sourceCode) {
      res.write(JSON.stringify({ 'valid': false }));
    } else {
      const data = doc;
      data.valid = true;
      res.write(JSON.stringify(data));
    }
  } catch (err) {
    console.error(`ContractFind error: ${err}`);
    console.error(`bad address: ${address}`);
    res.write(JSON.stringify({ 'error': true, 'valid': false }));
  }
  res.end();
};
