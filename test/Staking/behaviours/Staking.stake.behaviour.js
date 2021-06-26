const { assert } = require('chai');
const { PrepopulateStaker } = require('../helpers/reputation');
const { MintBalance } = require('../helpers/storx');
const { inLogs } = require('../../testToken/helpers/expectEvent');
const Tokenomics = require('../Tokenomics.json');
const { GetLatestBlock, GetBlock, MineBlock } = require('../helpers/ganache');
const { assertRevertWithMsg, assertRevert } = require('../helpers/assertRevert');

const StorXToken = artifacts.require('StorxToken');
const Reputation = artifacts.require('ReputationFeeds');
const Staking = artifacts.require('StorxStaking');

require('chai').use(require('chai-bignumber')(web3.BigNumber)).should();

function shouldBehaveLikeStakingStake([owner, ...accounts]) {
  const INITIAL_BALANCE = '1000000000';
  const ONE_DAY = 86400;

  const STAKE_AMOUNT = 100000;
  const REDEEM_INTERVAL = 15 * ONE_DAY; // IN SECONDS; 15 days

  describe('stakes properly', async function () {

    it('balances reflected', async function () {
      const contractBalance = await this.storx.balanceOf(this.staking.address);
      const userBalance = await this.storx.balanceOf(this.currentStaker);
      assert.equal(contractBalance.toString(), STAKE_AMOUNT);
      assert.equal(userBalance.toString(), parseFloat(INITIAL_BALANCE) - parseFloat(STAKE_AMOUNT));
    });

    it('emits an event', async function () {
      const event = await inLogs(this.logs, 'Staked');
      assert.equal(event.args.staker, this.currentStaker);
      assert.equal(event.args.amount.toString(), STAKE_AMOUNT);
    });

    describe('stake object set properly', function () {
      it('stakes properly', async function () {
        const stake = await this.staking.stakes(this.currentStaker);
        assert.equal(stake.stakedAmount.toString(), STAKE_AMOUNT);
      });

      it('redeemed date properly set', async function () {
        const stake = await this.staking.stakes(this.currentStaker);
        const { timestamp } = this.block;
        assert.equal(stake.lastRedeemedAt.toString(), timestamp);
      });

      it('stake date properly set', async function () {
        const stake = await this.staking.stakes(this.currentStaker);
        const { timestamp } = this.block;
        assert.equal(stake.lastRedeemedAt.toString(), timestamp);
      });

      it('totalRedeemed properly set', async function () {
        const stake = await this.staking.stakes(this.currentStaker);
        assert.equal(stake.totalRedeemed.toString(), 0);
      });
    });

    it('initial earnings are zero', async function () {
      assert.equal((await this.staking.earned(this.currentStaker)).toString(), 0);
    });

    it('reflected in stakeholders array', async function () {
      const stakeholders = await this.staking.getAllStakeHolder();
      assert.isTrue(stakeholders.includes(this.currentStaker));
    });

    it('amount reflected in totalStaked', async function () {
      const totalStaked = await this.staking.totalStaked();
      assert.equal(await totalStaked.toString(), STAKE_AMOUNT);
    });

    it('next drip set', async function () {
      const stake = await this.staking.stakes(this.currentStaker);

      const nextDripAt = await this.staking.nextDripAt(this.currentStaker);
      assert.equal(
        parseFloat(nextDripAt.toString()),
        parseFloat(stake.lastRedeemedAt.toString()) + parseFloat(REDEEM_INTERVAL)
      );
    });
  });
}

module.exports = {
  shouldBehaveLikeStakingStake,
};
