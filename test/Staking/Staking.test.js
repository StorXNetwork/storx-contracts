const { assert } = require('chai');
const { PrepopulateStaker } = require('./helpers/reputation');
const { MintBalance } = require('./helpers/storx');
const { inLogs } = require('../testToken/helpers/expectEvent');
const Tokenomics = require('./Tokenomics.json');
const { GetLatestBlock, GetBlock, MineBlock } = require('./helpers/ganache');
const { assertRevertWithMsg, assertRevert } = require('./helpers/assertRevert');
const { shouldBehaveLikeStakingStake } = require('./behaviours/Staking.stake.behaviour');
const { shouldBehaveLikeStakingEarnings } = require('./behaviours/Staking.earnings.behaviour');

const StorXToken = artifacts.require('StorxToken');
const Reputation = artifacts.require('ReputationFeeds');
const Staking = artifacts.require('StorxStaking');

require('chai').use(require('chai-bignumber')(web3.BigNumber)).should();

contract('Staking: direct stake', ([owner, ...accounts]) => {
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
    this.staking = await Staking.new(this.storx.address, INTEREST, this.reputation.address);

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

  shouldBehaveLikeStakingStake([owner, ...accounts]);
});

contract('Staking: can stake after withdrawal', ([owner, ...accounts]) => {
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
    this.staking = await Staking.new(this.storx.address, INTEREST, this.reputation.address);

    await this.staking.setMinStakeAmount(MIN_STAKE);
    await this.staking.setMaxStakeAmount(MAX_STAKE);
    await this.staking.setRedeemInterval(REDEEM_INTERVAL);
    await this.staking.setIRepF(this.reputation.address);
    await this.storx.transferOperator(this.staking.address);

    this.currentStaker = STAKERS[0];
    await this.storx.approve(this.staking.address, STAKE_AMOUNT, {
      from: this.currentStaker,
    });
    let data = await this.staking.stake(STAKE_AMOUNT, { from: this.currentStaker });
    this.tx = data.tx;
    this.receipt = data.receipt;
    this.block = await GetBlock(this.receipt);
    this.logs = data.logs;

    await this.staking.unstake({ from: this.currentStaker });
    await MineBlock(this.block.timestamp + 8 * ONE_DAY);
    await this.staking.withdrawStake({ from: this.currentStaker });

    await this.storx.approve(this.staking.address, STAKE_AMOUNT, {
      from: this.currentStaker,
    });
    data = await this.staking.stake(STAKE_AMOUNT, { from: this.currentStaker });
    this.tx = data.tx;
    this.receipt = data.receipt;
    this.block = await GetBlock(this.receipt);
    this.logs = data.logs;
  });

  shouldBehaveLikeStakingStake([owner, ...accounts]);
});

contract('Staking: proper earnings after withdrawal', ([owner, ...accounts]) => {
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
    this.staking = await Staking.new(this.storx.address, INTEREST, this.reputation.address);

    await this.staking.setMinStakeAmount(MIN_STAKE);
    await this.staking.setMaxStakeAmount(MAX_STAKE);
    await this.staking.setRedeemInterval(REDEEM_INTERVAL);
    await this.staking.setIRepF(this.reputation.address);
    await this.storx.transferOperator(this.staking.address);
    await this.staking.setHostingCompensation(HOSTING_COMPENSATION);
    await this.staking.setReputationThreshold(100);


    this.currentStaker = STAKERS[0];
    await this.storx.approve(this.staking.address, STAKE_AMOUNT, {
      from: this.currentStaker,
    });
    let data = await this.staking.stake(STAKE_AMOUNT, { from: this.currentStaker });
    this.tx = data.tx;
    this.receipt = data.receipt;
    this.block = await GetBlock(this.receipt);
    this.logs = data.logs;

    await this.staking.unstake({ from: this.currentStaker });
    await MineBlock(this.block.timestamp + 8 * ONE_DAY);
    await this.staking.withdrawStake({ from: this.currentStaker });

    await this.storx.approve(this.staking.address, STAKE_AMOUNT, {
      from: this.currentStaker,
    });
    data = await this.staking.stake(STAKE_AMOUNT, { from: this.currentStaker });
    this.tx = data.tx;
    this.receipt = data.receipt;
    this.block = await GetBlock(this.receipt);
    this.logs = data.logs;
  });

  shouldBehaveLikeStakingEarnings([owner, ...accounts]);
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
  const INTEREST = 600;
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
      this.staking = await Staking.new(this.storx.address, INTEREST, this.reputation.address);

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
    await assertRevert(this.staking.stake(MIN_STAKE, { from: STAKERS[1] }));
  });

  it('reverts if not enough balance', async function () {
    await this.storx.approve(this.staking.address, MIN_STAKE, { from: STAKERS[1] });
    await this.storx.transfer(DEAD, await this.storx.balanceOf(STAKERS[1]), {
      from: STAKERS[1],
    });
    await assertRevert(this.staking.stake(MIN_STAKE, { from: STAKERS[1] }));
  });

  it('reverts if amount less than min.', async function () {
    await this.storx.approve(this.staking.address, MIN_STAKE, { from: STAKERS[1] });
    await assertRevertWithMsg(
      this.staking.stake(MIN_STAKE - 1, { from: STAKERS[1] }),
      'StorX: invalid amount'
    );
  });

  it('reverts if amount greater than max.', async function () {
    await this.storx.approve(this.staking.address, await this.storx.balanceOf(STAKERS[1]), {
      from: STAKERS[1],
    });
    await assertRevertWithMsg(
      this.staking.stake(MAX_STAKE + 1, { from: STAKERS[1] }),
      'StorX: invalid amount'
    );
  });

  it('reverts if not a staker', async function () {
    await this.storx.approve(this.staking.address, await this.storx.balanceOf(NON_STAKER), {
      from: NON_STAKER,
    });
    await assertRevertWithMsg(
      this.staking.stake(MAX_STAKE, { from: NON_STAKER }),
      'StorX: sender not staker'
    );
  });

  it('reverts if already staked', async function () {
    await this.storx.approve(this.staking.address, await this.storx.balanceOf(STAKERS[1]), {
      from: STAKERS[1],
    });
    await this.staking.stake(MIN_STAKE, { from: STAKERS[1] });
    await assertRevertWithMsg(this.staking.stake(MIN_STAKE, { from: STAKERS[1] }));
  });

  it('cannot stake after unstake & withdrawal', async function () {
    await this.staking.unstake({ from: this.currentStaker });
    await this.storx.approve(this.staking.address, STAKE_AMOUNT, {
      from: this.currentStaker,
    });
    await assertRevertWithMsg(
      this.staking.stake(STAKE_AMOUNT, { from: this.currentStaker }),
      'StorX: in unstake period'
    );
  });
});
