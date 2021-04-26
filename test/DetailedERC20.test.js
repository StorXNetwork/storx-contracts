const { tokenParams } = require('../config');

const BigNumber = web3.BigNumber;

require('chai').use(require('chai-bignumber')(BigNumber)).should();

const DetailedERC20Mock = artifacts.require('StorxToken');

contract('DetailedERC20', (accounts) => {
  let detailedERC20 = null;

  const _name = 'Storx';
  const _symbol = 'Storx';
  const _decimals = 18;

  beforeEach(async function () {
    detailedERC20 = await DetailedERC20Mock.new(...tokenParams);
  });

  it('has a name', async function () {
    const name = await detailedERC20.name();
    name.should.be.equal(_name);
  });

  it('has a symbol', async function () {
    const symbol = await detailedERC20.symbol();
    symbol.should.be.equal(_symbol);
  });

  it('has an amount of decimals', async function () {
    const decimals = await detailedERC20.decimals();
    decimals.toNumber()==(_decimals);
  });
});
