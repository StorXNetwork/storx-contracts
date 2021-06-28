const { assert } = require('chai');
const { PrepopulateStaker } = require('./helpers/reputation');
const { MintBalance, CalculateEarning } = require('./helpers/storx');
const { inLogs } = require('../testToken/helpers/expectEvent');
const Tokenomics = require('./Tokenomics.json');
const { GetLatestBlock, GetBlock, MineBlock, GetBalance } = require('./helpers/ganache');
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

  describe('setReputationThreshold', async function () {
    it('setReputationThreshold: success on owner', async function () {
      const prevValue = await this.staking.reputationThreshold();
      const data = await this.staking.setReputationThreshold(777, { from: owner });
      const event = await inLogs(data.logs, 'ReputationThresholdChanged');
      assert.equal(prevValue.toString(), event.args.prevValue.toString());
      assert.equal(777, event.args.newValue.toString());
    });

    it('setReputationThreshold: revert on non-owner', async function () {
      await assertRevertWithMsg(
        this.staking.setReputationThreshold(777, { from: STAKERS[0] }),
        'Ownable: sender not owner'
      );
    });
  });

  describe('setHostingCompensation', async function () {
    it('setHostingCompensation: success on owner', async function () {
      const prevValue = await this.staking.hostingCompensation();
      const data = await this.staking.setHostingCompensation(777, { from: owner });
      const event = await inLogs(data.logs, 'HostingCompensationChanged');
      assert.equal(prevValue.toString(), event.args.prevValue.toString());
      assert.equal(777, event.args.newValue.toString());
    });

    it('setHostingCompensation: revert on non-owner', async function () {
      await assertRevertWithMsg(
        this.staking.setHostingCompensation(777, { from: STAKERS[0] }),
        'Ownable: sender not owner'
      );
    });
  });

  describe('withdrawTokens', async function () {
    it('withdraws when amount > 0', async function () {
      const beforeBalance = await this.storx.balanceOf(owner);
      const contractBalanceBefore = await this.storx.balanceOf(this.staking.address);

      const data = await this.staking.withdrawTokens(owner, contractBalanceBefore, { from: owner });
      const event = await inLogs(data.logs, 'WithdrewTokens');

      const afterBalance = await this.storx.balanceOf(owner);
      const contractBalanceAfter = await this.storx.balanceOf(this.staking.address);
      assert.equal(
        contractBalanceBefore.sub(contractBalanceAfter).toString(),
        afterBalance.sub(beforeBalance).toString()
      );
      assert.equal(event.args.beneficiary, owner);
      assert.equal(event.args.amount, contractBalanceBefore.sub(contractBalanceAfter).toString());
    });

    it('reverts on non-owner', async function () {
      await assertRevertWithMsg(
        this.staking.withdrawTokens(owner, 1000, { from: STAKERS[0] }),
        'Ownable: sender not owner'
      );
    });

    it('reverts on 0 amount', async function () {
      await assertRevertWithMsg(
        this.staking.withdrawTokens(owner, 0, {
          from: owner,
        }),
        'StorX: token amount has to be greater than 0'
      );
    });
  });

  describe('setMaxEarningsCap', async function () {
    it('setMaxEarningsCap: success when owner', async function () {
      it('setMaxEarningsCap: success on owner', async function () {
        const prevValue = await this.staking.maxEarningsCap();
        const data = await this.staking.setMaxEarningsCap(777, { from: owner });
        const event = await inLogs(data.logs, 'MaxEarningCapChanged');
        assert.equal(prevValue.toString(), event.args.prevValue.toString());
        assert.equal(777, event.args.newValue.toString());
      });
    });

    it('setMaxEarningsCap: revert on non-owner', async function () {
      await assertRevertWithMsg(
        this.staking.setMaxEarningCap(1000, { from: STAKERS[0] }),
        'Ownable: sender not owner'
      );
    });
  });

  describe('setInterestPrecision', async function () {
    it('setInterestPrecision: revert when  not greater than 0', async function () {
      await assertRevertWithMsg(
        this.staking.setInterestPrecision(0, { from: owner }),
        'StorX: precision cannot be 0'
      );
    });

    it('setInterestPrecision: success when owner & greater than 0', async function () {
      const prevValue = await this.staking.interestPrecision();
      const data = await this.staking.setInterestPrecision(1000, { from: owner });
      const event = await inLogs(data.logs, 'InterestPrecisionChanged');
      assert.equal(prevValue.toString(), event.args.prevValue.toString());
      assert.equal(1000, event.args.newValue.toString());
    });

    it('setInterestPrecision: revert when not owner', async function () {
      await assertRevertWithMsg(
        this.staking.setInterestPrecision(1000, { from: STAKERS[0] }),
        'Ownable: sender not owner'
      );
    });
  });
});

contract('Ownable', function ([owner, newOwner, ...rst]) {
  const accounts = [owner, newOwner, ...rst];
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const INITIAL_BALANCE = 1000000000;
  const INTEREST = 600;

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
    await PrepopulateStaker(this.reputation, [...rst]);
    await MintBalance(this.storx, owner, accounts, INITIAL_BALANCE);
    this.staking = await Staking.new(this.storx.address, INTEREST, { from: owner });
  });

  describe('when not owner', function () {
    it('does not display owner', async function () {
      assert.notEqual(await this.staking.owner(), newOwner);
    });

    it('reverts on ownership change', async function () {
      await assertRevert(this.staking.transferOwnership(newOwner, { from: newOwner }));
    });

    it('reverts on renounce owner', async function () {
      await assertRevert(this.staking.renounceOwnership({ from: newOwner }));
    });
  });

  describe('when owner', function () {
    it('display owner', async function () {
      assert.equal(await this.staking.owner(), owner);
    });

    it('ownership changes', async function () {
      const { logs } = await this.staking.transferOwnership(newOwner, { from: owner });

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'OwnershipTransferred');
      assert.equal(logs[0].args.previousOwner, owner);
      assert.equal(logs[0].args.newOwner, newOwner);

      assert.equal(await this.staking.owner(), newOwner);
    });

    it('renounce owner', async function () {
      const { logs } = await this.staking.renounceOwnership({ from: owner });

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'OwnershipRenounced');
      assert.equal(logs[0].args.previousOwner, owner);

      assert.equal(await this.staking.owner(), ZERO_ADDRESS);
    });
  });
});
