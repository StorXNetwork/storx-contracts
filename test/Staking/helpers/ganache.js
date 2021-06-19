const Web3 = require('web3');

const LOCAL = 'http://localhost:8545';

const MineBlock = (ts = 1000) => {
  return new Promise((resolve, reject) => {
    const web3 = new Web3(new Web3.providers.HttpProvider(LOCAL));
    web3.currentProvider.sendAsync(
      {
        jsonrpc: '2.0',
        method: 'evm_mine',
        params: [ts],
      },
      async (err, resp) => {
        if (err) reject(err);
        web3.eth
          .getBlock('latest')
          .then(({ timestamp }) => {
            resolve(timestamp);
          })
          .catch((e) => {
            reject(e);
          });
      }
    );
  });
};

const GetBlock = async ({ blockNumber, blockHash, ...rst }) => {
  const web3 = new Web3(new Web3.providers.HttpProvider(LOCAL));
  const block = await web3.eth.getBlock(blockNumber, true);
  return block;
};

const GetLatestBlock = () => {
  const web3 = new Web3(new Web3.providers.HttpProvider(LOCAL));
  return web3.eth.getBlock('latest');
};

exports.MineBlock = MineBlock;
exports.GetLatestBlock = GetLatestBlock;
exports.GetBlock = GetBlock;
