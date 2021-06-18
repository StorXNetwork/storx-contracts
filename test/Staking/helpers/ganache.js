const ganache = require('ganache-core');
const Web3 = require('web3');

const MineBlock = (ts = 1000) => {
  return new Promise((resolve, reject) => {
    const web3 = new Web3(ganache.provider());
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

exports.MineBlock = MineBlock;
