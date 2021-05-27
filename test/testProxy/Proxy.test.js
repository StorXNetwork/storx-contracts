const { tokenParams } = require('../../config');

const Tokenomics = require('./Tokenomics.json');
const BigNumber = require('bignumber.js');

require('chai').use(require('chai-bignumber')(BigNumber)).should();

const DetailedERC20Mock = artifacts.require('StorxToken');
const Proxy_Mock = artifacts.require('StorXTokenProxy');

contract('DetailedERC20', ([_, proxyAdmin, other]) => {
  let detailedERC20 = null;

  beforeEach(async function () {
    let implementation = await DetailedERC20Mock.new(...tokenParams, { from: proxyAdmin });
    let proxyAddress = await Proxy_Mock.new(implementation.address, { from: proxyAdmin });
    detailedERC20 = await DetailedERC20Mock.at(proxyAddress.address);
    await detailedERC20.initialize(
      Tokenomics.name,
      Tokenomics.symbol,
      Tokenomics.decimals,
      Tokenomics.initialSupply,
      { from: other }
    );
  });

  it('has a name', async function () {
    const name = await detailedERC20.name({ from: other });
    name.should.be.equal(Tokenomics.name);
  });

  it('has a symbol', async function () {
    const symbol = await detailedERC20.symbol({ from: other });
    symbol.should.be.equal(Tokenomics.symbol);
  });

  it('has an amount of decimals', async function () {
    const decimals = await detailedERC20.decimals({ from: other });
    decimals.toString().should.be.equal(`${Tokenomics.decimals}`);
  });

  it('has an initial supply as total supply', async function () {
    const totalSupply = await detailedERC20.totalSupply({ from: other });
    totalSupply.toString().should.be.equal(`${Tokenomics.initialSupply}`);
  });
});
