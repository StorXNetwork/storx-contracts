const { assert } = require('chai');
const { PrepopulateStaker } = require('../helpers/reputation');
const { MintBalance, CalculateEarning } = require('../helpers/storx');
const { inLogs } = require('../../testToken/helpers/expectEvent');
const Tokenomics = require('../Tokenomics.json');
const { GetLatestBlock, GetBlock, MineBlock } = require('../helpers/ganache');
const { assertRevertWithMsg, assertRevert } = require('../helpers/assertRevert');

const StorXToken = artifacts.require('StorxToken');
const Reputation = artifacts.require('ReputationFeeds');
const Staking = artifacts.require('StorxStaking');

require('chai').use(require('chai-bignumber')(web3.BigNumber)).should();

function shouldBehaveLikeStakingEarnings(accounts) {
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

  it(`earnings reflected after ${daysToCheck} day`, async function () {
    for (let i = 1; i <= daysToCheck; i++) {
      const dayCount = i;
      const stake = await this.staking.stakes(this.currentStaker);
      const TIME_SKIP_TO =
        parseFloat(stake.lastRedeemedAt.toString()) + dayCount * parseFloat(ONE_DAY);
      const skippedTs = await MineBlock(TIME_SKIP_TO);
      const earnings = (await this.staking.earned(this.currentStaker)).toString();
      const calculated = CalculateEarning({
        interest: INTEREST,
        hostingComp: HOSTING_COMPENSATION,
        days: dayCount,
        amount: STAKE_AMOUNT,
      });
      assert.equal(earnings, calculated);
    }

    // const finalEarnings = (await this.staking.earned(this.currentStaker)).toString();

    // console.log(finalEarnings);
  }).timeout(1000000000);
}

module.exports = {
  shouldBehaveLikeStakingEarnings,
};
