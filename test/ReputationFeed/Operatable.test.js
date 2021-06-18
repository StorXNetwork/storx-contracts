const { accounts } = require('@openzeppelin/test-environment');
const { assert } = require('chai');
const { check } = require('prettier');
const { assertRevertWithMsg, assertRevert } = require('./helpers/assertRevert');
const ReputationFeed = artifacts.require('ReputationFeeds');

const NOT_OPERATOR = 'operator: caller is not the operator';

const MINT_AMOUNT = 1000;

contract('Ownable', function ([_, owner, newOwner]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    this.token = await ReputationFeed.new({ from: owner });
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

contract('Operator', function ([_, owner, newOperator, ...accounts]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    this.token = await ReputationFeed.new({ from: owner });
    await this.token.addStaker(accounts[0], 1000, { from: owner });
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
  beforeEach(async function () {
    this.token = await ReputationFeed.new({ from: owner });
    await this.token.addStaker(accounts[0], 1000, { from: owner });
  });

  describe('when not operator', function () {
    it('reverts on mint', async function () {
      await assertRevertWithMsg(
        this.token.setReputation(accounts[0], 10000, { from: anotherAccount }),
        NOT_OPERATOR
      );
    });
  });
});
