const { assert } = require('chai');
const { PrepopulateStaker } = require('./helpers/reputation');
const { MintBalance } = require('./helpers/storx');
const { inLogs } = require('../testToken/helpers/expectEvent');
const Tokenomics = require('./Tokenomics.json');
const { GetLatestBlock, GetBlock, MineBlock } = require('./helpers/ganache');
const { assertRevertWithMsg, assertRevert } = require('./helpers/assertRevert');

const StorXToken = artifacts.require('StorxToken');
const Reputation = artifacts.require('ReputationFeeds');
const Staking = artifacts.require('StorxStaking');

require('chai').use(require('chai-bignumber')(web3.BigNumber)).should();

contract('Staking: stake', ([owner, ...accounts]) => {
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

  before(async function () {
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

  // it('initial setup complete', async function () {
  //   const balance = await this.storx.balanceOf(STAKERS[0]);
  //   const goodRep = await this.reputation.getReputation(STAKERS[0]);
  //   const badRep = await this.reputation.getReputation(BAD_STAKER);

  //   assert.equal(balance.toString(), INITIAL_BALANCE);
  //   assert.equal(goodRep.toString(), 100);
  //   assert.equal(badRep.toString(), 99);
  //   assert.isFalse(await this.reputation.isStaker(NON_STAKER));
  // });

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

contract('Staking: -ve test', ([owner, ...accounts]) => {
  const BAD_STAKER = accounts[0];
  const STAKERS = accounts.slice(1, accounts.length - 1);
  const NON_STAKER = accounts[accounts.length - 1];
  const INITIAL_BALANCE = '1000000000';
  const ONE_DAY = 86400;
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const DEAD = '0x000000000000000000000000000000000000DEAD';

  const MIN_STAKE = 10;
  const MAX_STAKE = 1000000;
  const STAKE_AMOUNT = 100000;
  const INTEREST = 6;
  const REDEEM_INTERVAL = 15 * ONE_DAY; // IN SECONDS; 15 days

  beforeEach(async function () {
    try {
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

      this.currentStaker = STAKERS[0];
      await this.storx.approve(this.staking.address, STAKE_AMOUNT, {
        from: this.currentStaker,
      });
      const data = await this.staking.stake(STAKE_AMOUNT, { from: this.currentStaker });
      this.tx = data.tx;
      this.receipt = data.receipt;
      this.block = await GetBlock(this.receipt);
      this.logs = data.logs;
    } catch (e) {
      console.log(e);
    }
  });

  it('reverts if SRX not approved', async function () {
    assertRevert(this.staking.stake(MIN_STAKE, { from: STAKERS[1] }));
  });

  it('reverts if not enough balance', async function () {
    await this.storx.approve(this.staking.address, MIN_STAKE, { from: STAKERS[1] });
    await this.storx.transfer(DEAD, await this.storx.balanceOf(STAKERS[1]), {
      from: STAKERS[1],
    });
    assertRevert(this.staking.stake(MIN_STAKE, { from: STAKERS[1] }));
  });

  it('reverts if amount less than min.', async function () {
    await this.storx.approve(this.staking.address, MIN_STAKE, { from: STAKERS[1] });
    assertRevertWithMsg(
      this.staking.stake(MIN_STAKE - 1, { from: STAKERS[1] }),
      'StorX: invalid amount'
    );
  });

  it('reverts if amount greater than max.', async function () {
    await this.storx.approve(this.staking.address, await this.storx.balanceOf(STAKERS[1]), {
      from: STAKERS[1],
    });
    assertRevertWithMsg(
      this.staking.stake(MAX_STAKE + 1, { from: STAKERS[1] }),
      'StorX: invalid amount'
    );
  });

  it('reverts if not a staker', async function () {
    await this.storx.approve(this.staking.address, await this.storx.balanceOf(NON_STAKER), {
      from: NON_STAKER,
    });
    assertRevertWithMsg(
      this.staking.stake(MAX_STAKE, { from: NON_STAKER }),
      'StorX: sender not staker'
    );
  });

  it('reverts if already staked', async function () {
    await this.storx.approve(this.staking.address, await this.storx.balanceOf(STAKERS[1]), {
      from: STAKERS[1],
    });
    await this.staking.stake(MIN_STAKE, { from: STAKERS[1] });
    assertRevertWithMsg(this.staking.stake(MIN_STAKE, { from: STAKERS[1] }));
  });
});
