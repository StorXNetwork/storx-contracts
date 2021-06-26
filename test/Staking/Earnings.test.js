const { assert } = require('chai');
const { PrepopulateStaker } = require('./helpers/reputation');
const { MintBalance, CalculateEarning } = require('./helpers/storx');
const { inLogs } = require('../testToken/helpers/expectEvent');
const Tokenomics = require('./Tokenomics.json');
const { GetLatestBlock, GetBlock, MineBlock } = require('./helpers/ganache');
const { assertRevertWithMsg, assertRevert } = require('./helpers/assertRevert');
const { shouldBehaveLikeStakingEarnings } = require('./behaviours/Staking.earnings.behaviour');

const StorXToken = artifacts.require('StorxToken');
const Reputation = artifacts.require('ReputationFeeds');
const Staking = artifacts.require('StorxStaking');

require('chai').use(require('chai-bignumber')(web3.BigNumber)).should();

contract('Staking: earnings', ([owner, ...accounts]) => {
  const BAD_STAKER = accounts[0];
  const STAKERS = accounts.slice(1, accounts.length - 1);
  const NON_STAKER = accounts[accounts.length - 1];
  const INITIAL_BALANCE = '1000000000';
  const ONE_DAY = 86400;

  const MIN_STAKE = 10;
  const MAX_STAKE = 1000000;
  const STAKE_AMOUNT = 100000;
  const INTEREST = 6;
  const REDEEM_INTERVAL = 15 * ONE_DAY; // IN SECONDS; 15 days
  const HOSTING_COMPENSATION = 3650;

  const TWO_YEAR = 730;

  const daysToCheck = 60;

  beforeEach(async function () {
    this.storx = await StorXToken.new();
    await this.storx.initialize(
      Tokenomics.name,
      Tokenomics.symbol,
      Tokenomics.decimals,
      Tokenomics.initialSupply,
      {
        from: owner,
      }
    );
    this.reputation = await Reputation.new();
    await PrepopulateStaker(this.reputation, [BAD_STAKER, ...STAKERS]);
    await MintBalance(this.storx, owner, accounts, INITIAL_BALANCE);
    this.staking = await Staking.new(this.storx.address, INTEREST);

    await this.staking.setMinStakeAmount(MIN_STAKE);
    await this.staking.setMaxStakeAmount(MAX_STAKE);
    await this.staking.setRedeemInterval(REDEEM_INTERVAL);
    await this.staking.setIRepF(this.reputation.address);
    await this.staking.setReputationThreshold(100);
    await this.staking.setHostingCompensation(HOSTING_COMPENSATION);

    await this.storx.transferOperator(this.staking.address);

    this.currentStaker = STAKERS[0];
    await this.storx.approve(this.staking.address, STAKE_AMOUNT, {
      from: this.currentStaker,
    });
    const data = await this.staking.stake(STAKE_AMOUNT, { from: this.currentStaker });
    this.tx = data.tx;
    this.receipt = data.receipt;
    this.block = await GetBlock(this.receipt);
    this.logs = data.logs;
  });

  shouldBehaveLikeStakingEarnings(accounts);

  it('cannot redeem before redeem day', async function () {
    const stake = await this.staking.stakes(this.currentStaker);
    const TIME_SKIP_TO = parseFloat(stake.lastRedeemedAt.toString()) + 1 * parseFloat(ONE_DAY);
    await MineBlock(TIME_SKIP_TO);
    const earnings = parseFloat((await this.staking.earned(this.currentStaker)).toString());
    assert.isTrue(earnings > 0);
    assertRevertWithMsg(
      this.staking.claimEarned(this.currentStaker),
      'StorX: cannot claim drip yet'
    );
  });

  it('cannot claim if not staked', async function () {
    assertRevertWithMsg(this.staking.claimEarned(STAKERS[1]), 'StorX: staker does not exist');
  });

  it('cannot claim if reputation threshold not met', async function () {
    await this.storx.approve(this.staking.address, await this.storx.balanceOf(BAD_STAKER), {
      from: BAD_STAKER,
    });
    await this.staking.stake(MIN_STAKE, {
      from: BAD_STAKER,
    });
    const stake = await this.staking.stakes(BAD_STAKER);
    const TIME_SKIP_TO = parseFloat(stake.lastRedeemedAt.toString()) + 30 * parseFloat(ONE_DAY);
    await MineBlock(TIME_SKIP_TO);
    const earnings = parseFloat((await this.staking.earned(BAD_STAKER)).toString());
    assert.isTrue(earnings > 0);
    const beforebalance = await this.storx.balanceOf(BAD_STAKER).toString();
    const data = await this.staking.claimEarned(BAD_STAKER);
    const event = await inLogs(data.logs, 'MissedRewards');
    const afterbalance = await this.storx.balanceOf(BAD_STAKER).toString();
    assert.equal(beforebalance, afterbalance);
    assert.equal(event.args.staker, BAD_STAKER);
    assert.equal(event.args.threshold.toString(), 100);
    assert.equal(event.args.reputation.toString(), 99);

    const updatedStake = await this.staking.stakes(BAD_STAKER);
    assert.equal(updatedStake.totalRedeemed, 0);
    assert.equal((await this.staking.earned(BAD_STAKER)).toString(), 0);
    assert.equal(
      updatedStake.lastRedeemedAt.toString(),
      (await GetBlock(data.receipt)).timestamp.toString()
    );
  });

  it('redeems after redeem interval', async function () {
    const stake = await this.staking.stakes(this.currentStaker);
    const TIME_SKIP_TO = parseFloat(stake.lastRedeemedAt.toString()) + 20 * parseFloat(ONE_DAY);
    await MineBlock(TIME_SKIP_TO);
    const beforebalance_staker = parseFloat(
      (await this.storx.balanceOf(this.currentStaker)).toString()
    );
    const beforeearnings = parseFloat((await this.staking.earned(this.currentStaker)).toString());
    const beforebalance_staking = parseFloat(
      (await this.storx.balanceOf(this.staking.address)).toString()
    );

    const data = await this.staking.claimEarned(this.currentStaker, { from: NON_STAKER });
    const event = await inLogs(data.logs, 'ClaimedRewards');

    const afterbalance_staker = parseFloat(
      (await this.storx.balanceOf(this.currentStaker)).toString()
    );
    const afterearnings = parseFloat((await this.staking.earned(this.currentStaker)).toString());
    const afterbalance_staking = parseFloat(
      (await this.storx.balanceOf(this.staking.address)).toString()
    );

    assert.equal(afterbalance_staker, beforebalance_staker + beforeearnings);
    assert.equal(afterearnings, 0);
    assert.equal(beforebalance_staking, afterbalance_staking);

    assert.equal(event.args.staker, this.currentStaker);
    assert.equal(event.args.amount.toString(), beforeearnings);
  });

  it('can claim upto max if earnings exceed MaxEarningsCap', async function () {
    await this.staking.setMaxEarningCap(10, { from: owner });
    const stake = await this.staking.stakes(this.currentStaker);
    const TIME_SKIP_TO = parseFloat(stake.lastRedeemedAt.toString()) + 20 * parseFloat(ONE_DAY);
    await MineBlock(TIME_SKIP_TO);
    const earnings = await this.staking.earned(this.currentStaker);
    const data = await this.staking.claimEarned(this.currentStaker, { from: NON_STAKER });
    const event_earning = await inLogs(data.logs, 'MaxEarningsCapReached');
    const event_claim = await inLogs(data.logs, 'ClaimedRewards');

    assert.equal(event_earning.args.staker, this.currentStaker);
    assert.equal(event_earning.args.cap.toString(), 10);
    assert.equal(event_earning.args.earnings.toString(), earnings.toString());

    assert.equal(event_claim.args.staker, this.currentStaker);
    assert.equal(event_claim.args.amount.toString(), 10);
  });

  it('cannot claim after unstake', async function () {
    const stake = await this.staking.stakes(this.currentStaker);
    const TIME_SKIP_TO = parseFloat(stake.lastRedeemedAt.toString()) + 20 * parseFloat(ONE_DAY);
    await MineBlock(TIME_SKIP_TO);
    await this.staking.unstake({ from: this.currentStaker });
    assert.equal((await this.staking.earned(this.currentStaker)).toString(), 0);
    await assertRevertWithMsg(this.staking.claimEarned(this.currentStaker), 'StorX: not staked');
  });

  it('after unstake earnings reflected in leftover balance', async function () {
    const stake = await this.staking.stakes(this.currentStaker);
    const TIME_SKIP_TO = parseFloat(stake.lastRedeemedAt.toString()) + 20 * parseFloat(ONE_DAY);
    const calculatedEarnings = CalculateEarning({
      interest: INTEREST,
      hostingComp: HOSTING_COMPENSATION,
      days: 20,
      amount: STAKE_AMOUNT,
    });
    await MineBlock(TIME_SKIP_TO);
    await this.staking.unstake({ from: this.currentStaker });
    const stakeAfter = await this.staking.stakes(this.currentStaker);
    const earnedAfter = await this.staking.earned(this.currentStaker);
    assert.equal(stakeAfter.balance.toString(), calculatedEarnings);
    assert.equal(earnedAfter.toString(), 0);
  });
});
