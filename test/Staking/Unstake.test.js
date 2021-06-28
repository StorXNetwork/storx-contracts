const { assert } = require('chai');
const { PrepopulateStaker } = require('./helpers/reputation');
const { MintBalance, CalculateEarning } = require('./helpers/storx');
const { inLogs } = require('../testToken/helpers/expectEvent');
const Tokenomics = require('./Tokenomics.json');
const { GetLatestBlock, GetBlock, MineBlock } = require('./helpers/ganache');
const { assertRevertWithMsg } = require('./helpers/assertRevert');

const StorXToken = artifacts.require('StorxToken');
const Reputation = artifacts.require('ReputationFeeds');
const Staking = artifacts.require('StorxStaking');

require('chai').use(require('chai-bignumber')(web3.BigNumber)).should();

contract('Staking: unstake', ([owner, ...accounts]) => {
  const BAD_STAKER = accounts[0];
  const STAKERS = accounts.slice(1, accounts.length - 1);
  const NON_STAKER = accounts[accounts.length - 1];
  const INITIAL_BALANCE = '1000000000';
  const ONE_DAY = 86400;

  const MIN_STAKE = 10;
  const MAX_STAKE = 1000000;
  const STAKE_AMOUNT = 100000;
  const INTEREST = 600;
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

  it('cannot unstake if not staked', async function () {
    await assertRevertWithMsg(this.staking.unstake({ from: BAD_STAKER }), 'StorX: not staked');
  });

  it('can unstake right away', async function () {
    const oldStakeHolders = await this.staking.getAllStakeHolder();
    assert.isTrue(oldStakeHolders.includes(this.currentStaker));
    const balanceStakerBefore = parseFloat(
      (await this.storx.balanceOf(this.currentStaker)).toString()
    );
    const balanceContractBefore = parseFloat(
      (await this.storx.balanceOf(this.staking.address)).toString()
    );

    const stakeBefore = await this.staking.stakes(this.currentStaker);
    assert.equal(
      (await this.storx.balanceOf(this.staking.address)).toString(),
      stakeBefore.stakedAmount.toString()
    );
    const data = await this.staking.unstake({ from: this.currentStaker });
    const event = await inLogs(data.logs, 'Unstaked');
    const stakeAfter = await this.staking.stakes(this.currentStaker);
    assert.isFalse(stakeAfter.staked);
    assert.equal(event.args.staker, this.currentStaker);
    assert.equal(event.args.amount.toString(), STAKE_AMOUNT);
    assert.isTrue(stakeAfter.unstaked);

    await assertRevertWithMsg(
      this.staking.withdrawStake({ from: this.currentStaker }),
      'StorX: cannot withdraw yet'
    );

    const TIME_SKIP_TO =
      parseFloat(stakeBefore.lastRedeemedAt.toString()) + 8 * parseFloat(ONE_DAY);

    await MineBlock(TIME_SKIP_TO);

    const newStakeHolders = await this.staking.getAllStakeHolder();
    assert.isFalse(newStakeHolders.includes(this.currentStaker));

    const data2 = await this.staking.withdrawStake({ from: this.currentStaker });
    const stakesLast = await this.staking.stakes(this.currentStaker);


    const balanceStakerAfter = parseFloat(
      (await this.storx.balanceOf(this.currentStaker)).toString()
    );
    const balanceContractAfter = parseFloat(
      (await this.storx.balanceOf(this.staking.address)).toString()
    );
    assert.equal(balanceStakerAfter - balanceStakerBefore, STAKE_AMOUNT);
    assert.equal(balanceContractBefore - balanceContractAfter, STAKE_AMOUNT);

    const event2 = await inLogs(data2.logs, 'WithdrewStake');
    assert.equal(event2.args.staker, this.currentStaker);
    assert.equal(event2.args.principal.toString(), STAKE_AMOUNT);
    assert.equal(event2.args.earnings.toString(), 0);
    assert.isFalse(stakesLast.unstaked);
  });

  it('unstakes properly with rewards', async function () {
    const TIME_SKIP_TO_1 =
      parseFloat((await this.staking.stakes(this.currentStaker)).lastRedeemedAt.toString()) +
      60 * parseFloat(ONE_DAY);

    await MineBlock(TIME_SKIP_TO_1);

    const balanceStakerBefore = parseFloat(
      (await this.storx.balanceOf(this.currentStaker)).toString()
    );
    const balanceContractBefore = parseFloat(
      (await this.storx.balanceOf(this.staking.address)).toString()
    );

    const stakeBefore = await this.staking.stakes(this.currentStaker);
    assert.equal(
      (await this.storx.balanceOf(this.staking.address)).toString(),
      stakeBefore.stakedAmount.toString()
    );
    const data = await this.staking.unstake({ from: this.currentStaker });
    const event = await inLogs(data.logs, 'Unstaked');
    const stakeAfter = await this.staking.stakes(this.currentStaker);
    const leftoverEarnings = parseFloat(stakeAfter.balance.toString());
    assert.isFalse(stakeAfter.staked);
    assert.equal(event.args.staker, this.currentStaker);
    assert.equal(event.args.amount.toString(), STAKE_AMOUNT);

    await assertRevertWithMsg(
      this.staking.withdrawStake({ from: this.currentStaker }),
      'StorX: cannot withdraw yet'
    );

    const TIME_SKIP_TO = TIME_SKIP_TO_1 + 8 * parseFloat(ONE_DAY);

    await MineBlock(TIME_SKIP_TO);

    const data2 = await this.staking.withdrawStake({ from: this.currentStaker });

    const balanceStakerAfter = parseFloat(
      (await this.storx.balanceOf(this.currentStaker)).toString()
    );
    const balanceContractAfter = parseFloat(
      (await this.storx.balanceOf(this.staking.address)).toString()
    );
    assert.equal(balanceStakerAfter - balanceStakerBefore, STAKE_AMOUNT + leftoverEarnings);
    assert.equal(balanceContractBefore - balanceContractAfter, STAKE_AMOUNT);

    const event2 = await inLogs(data2.logs, 'WithdrewStake');
    assert.equal(event2.args.staker, this.currentStaker);
    assert.equal(event2.args.principal.toString(), STAKE_AMOUNT);
    assert.equal(event2.args.earnings.toString(), leftoverEarnings);
  });
});
