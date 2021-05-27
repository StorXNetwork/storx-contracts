const { assert } = require('chai');
const { check } = require('prettier');
const { tokenParams } = require('../../config');
const { assertRevertWithMsg, assertRevert } = require('./helpers/assertRevert');
const StorxToken = artifacts.require('StorxToken');
const Tokenomics = require('./Tokenomics.json');

const NOT_OPERATOR = 'operator: caller is not the operator';

const MINT_AMOUNT = 1000;

contract('Ownable', function ([_, owner, newOwner]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    this.token = await StorxToken.new(...tokenParams, { from: owner });
    await this.token.initialize(
      Tokenomics.name,
      Tokenomics.symbol,
      Tokenomics.decimals,
      Tokenomics.initialSupply,
      { from: owner }
    );
  });

  describe('when not owner', function () {
    it('does not display owner', async function () {
      assert.notEqual(await this.token.owner(), newOwner);
    });

    it('reverts on ownership change', async function () {
      await assertRevert(this.token.transferOwnership(newOwner, { from: newOwner }));
    });

    it('reverts on renounce owner', async function () {
      await assertRevert(this.token.renounceOwnership({ from: newOwner }));
    });
  });

  describe('when owner', function () {
    it('display owner', async function () {
      assert.equal(await this.token.owner(), owner);
    });

    it('ownership changes', async function () {
      const { logs } = await this.token.transferOwnership(newOwner, { from: owner });

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'OwnershipTransferred');
      assert.equal(logs[0].args.previousOwner, owner);
      assert.equal(logs[0].args.newOwner, newOwner);

      assert.equal(await this.token.owner(), newOwner);
    });

    it('renounce owner', async function () {
      const { logs } = await this.token.renounceOwnership({ from: owner });

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'OwnershipRenounced');
      assert.equal(logs[0].args.previousOwner, owner);

      assert.equal(await this.token.owner(), ZERO_ADDRESS);
    });
  });
});

contract('Operator', function ([_, owner, newOperator]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    this.token = await StorxToken.new(...tokenParams, { from: owner });
    await this.token.initialize(
      Tokenomics.name,
      Tokenomics.symbol,
      Tokenomics.decimals,
      Tokenomics.initialSupply,
      { from: owner }
    );
  });

  describe('when not owner', function () {
    it('reverts on ownership change', async function () {
      await assertRevert(this.token.transferOperator(newOperator, { from: newOperator }));
    });
  });

  describe('when owner', function () {
    it('operator changes', async function () {
      const { logs } = await this.token.transferOperator(newOperator, { from: owner });
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'OperatorTransferred');
      assert.equal(logs[0].args.previousOperator, ZERO_ADDRESS);
      assert.equal(logs[0].args.newOperator, newOperator);

      assert.isTrue(await this.token.isOperator({ from: newOperator }));
    });
  });
});

contract('OperatableMint', function ([_, owner, recipient, anotherAccount]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    this.token = await StorxToken.new(...tokenParams, { from: owner });
    await this.token.initialize(
      Tokenomics.name,
      Tokenomics.symbol,
      Tokenomics.decimals,
      Tokenomics.initialSupply,
      { from: owner }
    );
  });

  describe('when not operator', function () {
    it('reverts on mint', async function () {
      await assertRevertWithMsg(
        this.token.mint(recipient, MINT_AMOUNT, { from: anotherAccount }),
        NOT_OPERATOR
      );
    });
  });

  describe('when operator', function () {
    this.beforeAll(async function () {
      this.beforeBalance = await this.token.balanceOf(recipient);
      this.beforeTotalSupply = await this.token.totalSupply();
      this.log = await this.token.mint(recipient, MINT_AMOUNT, { from: owner });
      this.afterBalance = await this.token.balanceOf(recipient);
      this.afterTotalSupply = await this.token.totalSupply();
    });

    it('adds balance to recipient corrrectly', async function () {
      assert.equal(this.afterBalance.toNumber() - this.beforeBalance.toNumber(), MINT_AMOUNT);
    });

    it('increases total supply corrrectly', async function () {
      assert.equal(
        this.afterTotalSupply.toNumber() - this.beforeTotalSupply.toNumber(),
        MINT_AMOUNT
      );
    });

    it('mint log emitted corrrectly', async function () {
      const { logs } = this.log;

      assert.equal(logs.length, 2);
      // ASSERT MINT
      assert.equal(logs[0].event, 'Mint');
      assert.equal(logs[0].args.to, recipient);
      assert.equal(logs[0].args.amount, MINT_AMOUNT);

      // ASSERT TRANSFER
      assert.equal(logs[1].event, 'Transfer');
      assert.equal(logs[1].args.from, ZERO_ADDRESS);
      assert.equal(logs[1].args.to, recipient);
      assert.equal(logs[1].args.value, MINT_AMOUNT);
    });
  });
});
