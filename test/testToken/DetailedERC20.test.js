const { tokenParams } = require('../../config');

const Tokenomics = require('./Tokenomics.json');

const BigNumber = web3.BigNumber;

require('chai').use(require('chai-bignumber')(BigNumber)).should();

const DetailedERC20Mock = artifacts.require('StorxToken');

contract('DetailedERC20', (accounts) => {
  let detailedERC20 = null;

  beforeEach(async function () {
    detailedERC20 = await DetailedERC20Mock.new(...tokenParams);
    await detailedERC20.initialize(
      Tokenomics.name,
      Tokenomics.symbol,
      Tokenomics.decimals,
      Tokenomics.initialSupply
    );
  });

  it('has a name', async function () {
    const name = await detailedERC20.name();
    name.should.be.equal(Tokenomics.name);
  });

  it('has a symbol', async function () {
    const symbol = await detailedERC20.symbol();
    symbol.should.be.equal(Tokenomics.symbol);
  });

  it('has an amount of decimals', async function () {
    const decimals = await detailedERC20.decimals();
    decimals.toNumber() == Tokenomics.decimals;
  });
});
