const { assert } = require('chai');
const { PrepopulateStaker } = require('./helpers/reputation');
const { MintBalance, CalculateEarning } = require('./helpers/storx');
const { inLogs } = require('../testToken/helpers/expectEvent');
const Tokenomics = require('./Tokenomics.json');
const { GetLatestBlock, GetBlock, MineBlock } = require('./helpers/ganache');
const { assertRevertWithMsg, assertRevert } = require('./helpers/assertRevert');

const StorXToken = artifacts.require('StorxToken');
const Reputation = artifacts.require('ReputationFeeds');
const Staking = artifacts.require('StorxStaking');

require('chai').use(require('chai-bignumber')(web3.BigNumber)).should();

contract('Staking: general', ([owner, ...accounts]) => {
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

  const daysToCheck = TWO_YEAR;

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

  it('successfully reflects earnings', async function () {
    const stake = await this.staking.stakes(this.currentStaker);
    const TIME_SKIP_TO = parseFloat(stake.lastRedeemedAt.toString()) + 30 * parseFloat(ONE_DAY);
    await MineBlock(TIME_SKIP_TO);
    const earnings = (await this.staking.earned(this.currentStaker)).toString();
    assert.equal(
      earnings,
      CalculateEarning({
        interest: INTEREST,
        hostingComp: HOSTING_COMPENSATION,
        days: 30,
        amount: STAKE_AMOUNT,
      })
    );
  });

  // !earnings will be 0
  // it('reverts on when non-staker', async function () {
  //   const stake = await this.staking.stakes(this.currentStaker);
  //   const TIME_SKIP_TO = parseFloat(stake.lastRedeemedAt.toString()) + 30 * parseFloat(ONE_DAY);
  //   await MineBlock(TIME_SKIP_TO);
  //   await assertRevertWithMsg(this.staking.earned(NON_STAKER), 'StorX: need to stake for earnings');
  // });

  it('returns proper drip time', async function () {
    const stake = await this.staking.stakes(this.currentStaker);
    const nextDripAt = (await this.staking.nextDripAt(this.currentStaker)).toString();
    const redeemTime = parseFloat(stake.lastRedeemedAt.toString()) + REDEEM_INTERVAL;
    assert.equal(redeemTime, nextDripAt);
  });

  it('reverts on non-staker drip', async function () {
    await assertRevertWithMsg(this.staking.nextDripAt(STAKERS[1]), 'StorX: address has not staked');
  });

  it('canWithdrawStakeIn returns proper time', async function () {
    const data = await this.staking.unstake({ from: this.currentStaker });
    const stake = await this.staking.stakes(this.currentStaker);
    const { timestamp } = await GetBlock(data.receipt);
    const coolOff = parseFloat((await this.staking.coolOff()).toString());
    const withdrawIn = (await this.staking.canWithdrawStakeIn(this.currentStaker)).toString();

    assert.equal(
      Math.floor(
        (coolOff + parseFloat(stake.unstakedTime.toString()) - parseFloat(timestamp.toString())) /
          10
      ),
      Math.floor(withdrawIn / 10)
    );
    assert.equal(7 * ONE_DAY, withdrawIn);
  });

  it('reverts on canWithdrawStakeIn', async function () {
    await assertRevertWithMsg(
      this.staking.canWithdrawStakeIn(STAKERS[1]),
      'StorX: stakeholder does not exists'
    );
  });

  it('threshold met +ve test', async function () {
    assert.isTrue(await this.staking.thresholdMet(this.currentStaker));
  });

  it('threshold met -ve test', async function () {
    assert.isFalse(await this.staking.thresholdMet(BAD_STAKER));
  });

  it('canWithdrawStake ', async function () {
    const data = await this.staking.unstake({ from: this.currentStaker });
    const stake = await this.staking.stakes(this.currentStaker);

    assert.isFalse(await this.staking.canWithdrawStake(this.currentStaker));

    const TIME_SKIP_TO = parseFloat(stake.lastRedeemedAt.toString()) + 30 * parseFloat(ONE_DAY);
    await MineBlock(TIME_SKIP_TO);

    assert.isTrue(await this.staking.canWithdrawStake(this.currentStaker));
  });
});
