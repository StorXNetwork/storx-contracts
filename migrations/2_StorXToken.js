const StorxToken = artifacts.require('StorxToken');

module.exports = function (deployer) {
  deployer.deploy(StorxToken);
};
