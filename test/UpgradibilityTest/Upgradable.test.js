const StorxTokenBad = artifacts.require('StorxTokenBad');
const StorTokenGood = artifacts.require('StorxToken');
const Proxy_Mock = artifacts.require('StorXTokenProxy');
const { assert } = require('chai');
const { assertRevertWithMsg, assertRevert } = require('./helpers/assertRevert');

const Tokenomics = require('./Tokenomics.json');
const NOT_OPERATOR = 'operator: caller is not the operator';

contract('DetailedERC20', ([_, proxyAdmin, notProxyAdmin, owner, notowner, recipient]) => {
  beforeEach(async () => {
    const implementationOld = await StorxTokenBad.new({ from: proxyAdmin });
    const implementationNew = await StorTokenGood.new({ from: proxyAdmin });
    const proxyAddress = await Proxy_Mock.new(implementationOld.address, { from: proxyAdmin });
    const proxy = await StorxTokenBad.at(proxyAddress.address);

    this.implementationOld = implementationOld;
    this.implementationNew = implementationNew;
    this.proxyAddress = proxyAddress;
    this.proxy = proxy;

    await proxy.initialize(
      Tokenomics.name,
      Tokenomics.symbol,
      Tokenomics.decimals,
      Tokenomics.initialSupply,
      { from: owner }
    );
  });

  it('upgradable only by admin', async () => {
    await assertRevert(
      this.proxyAddress.upgradeTo(this.implementationNew.address, { from: notProxyAdmin })
    );
    assert.equal(
      await this.proxyAddress.implementation({ from: proxyAdmin }),
      this.implementationOld.address
    );

    await this.proxyAddress.upgradeTo(this.implementationNew.address, { from: proxyAdmin });
    assert.equal(
      await this.proxyAddress.implementation({ from: proxyAdmin }),
      this.implementationNew.address
    );
  });

  it('updgrades properly', async () => {
    const MintAmount = 10000;

    const beforeBalance = await this.proxy.balanceOf(recipient);
    assert.equal(beforeBalance, 0);

    await this.proxy.mint(recipient, MintAmount, { from: notowner });

    const afterBalance = await this.proxy.balanceOf(recipient);
    assert.equal(afterBalance, MintAmount);

    assert.equal(
      await this.proxyAddress.implementation({ from: proxyAdmin }),
      this.implementationOld.address
    );
    await this.proxyAddress.upgradeTo(this.implementationNew.address, { from: proxyAdmin });
    assert.equal(
      await this.proxyAddress.implementation({ from: proxyAdmin }),
      this.implementationNew.address
    );

    const postUpgrade = await this.proxy.balanceOf(recipient);
    assert.equal(postUpgrade, MintAmount);

    await assertRevertWithMsg(
      this.proxy.mint(recipient, MintAmount, { from: notowner }),
      NOT_OPERATOR
    );

    this.proxy.mint(recipient, MintAmount, { from: owner });

    const postUpgradeMint = await this.proxy.balanceOf(recipient);
    assert.equal(postUpgradeMint, MintAmount * 2);
  });
});
