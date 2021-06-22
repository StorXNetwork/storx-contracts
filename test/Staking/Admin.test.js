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
    this.reputation = await Reputation.new({ from: owner });
    await PrepopulateStaker(this.reputation, [BAD_STAKER, ...STAKERS]);
    await MintBalance(this.storx, owner, accounts, INITIAL_BALANCE);
    this.staking = await Staking.new(this.storx.address, INTEREST, { from: owner });

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

  describe('setMinStakeAmount', async function () {
    it('setMinStakeAmount: success on owner', async function () {
      const prevValue = await this.staking.minStakeAmount();
      const data = await this.staking.setMinStakeAmount(1000, { from: owner });
      const event = await inLogs(data.logs, 'MinStakeAmountChanged');
      assert.equal(prevValue.toString(), event.args.prevValue.toString());
      assert.equal(1000, event.args.newValue.toString());
    });

    it('setMinStakeAmount: revert on non-owner', async function () {
      await assertRevertWithMsg(
        this.staking.setMinStakeAmount(1000, { from: STAKERS[0] }),
        'Ownable: sender not owner'
      );
    });
  });

  describe('setMaxStakeAmount', async function () {
    it('setMaxStakeAmount: success on owner', async function () {
      const prevValue = await this.staking.maxStakeAmount();
      const data = await this.staking.setMaxStakeAmount(1000, { from: owner });
      const event = await inLogs(data.logs, 'MaxStakeAmountChanged');
      assert.equal(prevValue.toString(), event.args.prevValue.toString());
      assert.equal(1000, event.args.newValue.toString());
    });

    it('setMaxStakeAmount: revert on non-owner', async function () {
      await assertRevertWithMsg(
        this.staking.setMaxStakeAmount(1000, { from: STAKERS[0] }),
        'Ownable: sender not owner'
      );
    });
  });

  describe('setRate', async function () {
    it('setRate: success on owner', async function () {
      const prevValue = await this.staking.interest();
      const data = await this.staking.setRate(6, { from: owner });
      const event = await inLogs(data.logs, 'RateChanged');
      assert.equal(prevValue.toString(), event.args.prevValue.toString());
      assert.equal(6, event.args.newValue.toString());
    });

    it('setRate: revert on non-owner', async function () {
      await assertRevertWithMsg(
        this.staking.setRate(6, { from: STAKERS[0] }),
        'Ownable: sender not owner'
      );
    });
  });

  describe('setCoolOff', async function () {
    it('setCoolOff: success on owner', async function () {
      const prevValue = await this.staking.coolOff();
      const data = await this.staking.setCoolOff(6, { from: owner });
      const event = await inLogs(data.logs, 'CoolOffChanged');
      assert.equal(prevValue.toString(), event.args.prevValue.toString());
      assert.equal(6, event.args.newValue.toString());
    });

    it('setCoolOff: revert on non-owner', async function () {
      await assertRevertWithMsg(
        this.staking.setCoolOff(6, { from: STAKERS[0] }),
        'Ownable: sender not owner'
      );
    });
  });

  describe('setRedeemInterval', async function () {
    it('setRedeemInterval: success on owner', async function () {
      const prevValue = await this.staking.redeemInterval();
      const data = await this.staking.setRedeemInterval(REDEEM_INTERVAL * 2, { from: owner });
      const event = await inLogs(data.logs, 'RedeemIntervalChanged');
      assert.equal(prevValue.toString(), event.args.prevValue.toString());
      assert.equal(REDEEM_INTERVAL * 2, event.args.newValue.toString());
    });

    it('setRedeemInterval: revert on non-owner', async function () {
      await assertRevertWithMsg(
        this.staking.setRedeemInterval(6, { from: STAKERS[0] }),
        'Ownable: sender not owner'
      );
    });
  });

  describe('setIRepF', async function () {
    it('setIRepF: success on owner', async function () {
      const prevValue = await this.staking.iRepF();
      const data = await this.staking.setIRepF(this.reputation.address, { from: owner });
      const event = await inLogs(data.logs, 'ReputationFeedChanged');
      assert.equal(prevValue.toString(), event.args.prevValue.toString());
      assert.equal(this.reputation.address, event.args.newValue.toString());
    });

    it('setIRepF: revert on non-owner', async function () {
      await assertRevertWithMsg(
        this.staking.setIRepF(this.reputation.address, { from: STAKERS[0] }),
        'Ownable: sender not owner'
      );
    });
  });

  // describe('setReputationThreshold', async function () {});

  // describe('setHostingCompensation', async function () {});

  // describe('withdrawTokens', async function () {});

  // describe('withdrawXdc', async function () {});

  // describe('transferOwnership', async function () {});

  // describe('setMaxEarningsCap', async function () {});
});
