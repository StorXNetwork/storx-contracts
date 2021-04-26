const { tokenParams } = require('../config');

const StorxToken = artifacts.require('StorxToken');

module.exports = function (deployer) {
  deployer.deploy(StorxToken, ...tokenParams);
};
