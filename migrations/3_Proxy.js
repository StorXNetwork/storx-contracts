const { tokenParams } = require('../config');

const StorxToken = artifacts.require('StorxToken');
const ProxyToken = artifacts.require('StorXTokenProxy');

module.exports = function (deployer) {
  deployer.deploy(ProxyToken, StorxToken.address);
};
