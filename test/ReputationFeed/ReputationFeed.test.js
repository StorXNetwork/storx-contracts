const { assert } = require('chai');
const _ = require('lodash');
const { assertRevert, assertRevertWithMsg } = require('../testToken/helpers/assertRevert');
const { inLogs } = require('../testToken/helpers/expectEvent');

const ReputationFeedMock = artifacts.require('ReputationFeeds');

contract('ReputationFeeds', ([owner, ...accounts]) => {
  beforeEach(async function () {
    this.token = await ReputationFeedMock.new({ from: owner });
  });

  describe('when initiated', () => {
    it('initial array is empty', async function () {
      const stakers = await this.token.getAllStaker();
      assert(_.isEmpty(stakers));
    });
  });

  describe('when operator', async function () {
    it('properly adds', async function () {
      shoudlBehaveAdd(this.token, owner, accounts);
    });

    it('properly removes', async function () {
      shoudlBehaveRemove(this.token, owner, accounts);
    });

    it('properly updates reputation', async function () {
      await this.token.addStaker(accounts[0], 1000, { from: owner });
      await this.token.setReputation(accounts[0], 2000, { from: owner });
      const newRep = await this.token.getReputation(accounts[0]);
      assert.equal(newRep, 2000);
    });
  });

  describe('when not operator revert', async function () {
    it('adding new staker reverts', async function () {
      assertRevertWithMsg(
        this.token.addStaker(accounts[0], 1000, { from: accounts[0] }),
        'operator: caller is not the operator'
      );
    });

    it('adding new staker reverts', async function () {
      await this.token.addStaker(accounts[0], 100, { from: owner });
      assertRevertWithMsg(
        this.token.removeStaker(accounts[0], { from: accounts[0] }),
        'operator: caller is not the operator'
      );
    });

    it('updating reputation', async function () {
      await this.token.addStaker(accounts[0], 100, { from: owner });
      assertRevertWithMsg(
        this.token.setReputation(accounts[0], 1000, { from: accounts[0] }),
        'operator: caller is not the operator'
      );
    });
  });
});

function shoudlBehaveAdd(token, owner, accounts) {
  describe('when adding new staker', async function () {
    const staker = accounts[0],
      reputation = 1000;

    before(async function () {
      const data = await token.addStaker(staker, reputation, { from: owner });
      this.logs = data.logs;
    });

    it('added to stakers array', async function () {
      const stakers = await token.getAllStaker();
      assert(_.isEqual(stakers, [staker]));
    });

    it('emits a proper log event', async function () {
      const event = await inLogs(this.logs, 'AddedStaker');
      assert.equal(event.args.staker, staker);
      assert.equal(event.args.reputation, reputation);
    });

    it('isStaker reflected', async function () {
      assert(await token.isStaker(staker));
    });

    it('reputation reflected', async function () {
      assert.equal(await token.getReputation(staker), reputation);
      assert.equal(await token.reputations(staker), reputation);
    });

    it('reverts on duplicate staker addition', async function () {
      assertRevertWithMsg(
        token.addStaker(staker, reputation),
        'ReputationFeeds: staker already exists'
      );
    });
  });
}

function shoudlBehaveRemove(token, owner, accounts) {
  const staker = accounts[0],
    reputation = 1000,
    nonStaker = accounts[1];

  describe('when removing staker', async function () {
    before(async function () {
      await token.addStaker(staker, reputation, { from: owner });
      ({ logs: this.logs } = await token.removeStaker(staker, { from: owner }));
    });

    it('removed the staker from array', async function () {
      assert.isTrue(_.isEmpty(await token.getAllStaker()));
      assert.isFalse(await token.isStaker(staker));
    });

    it('resets reputation', async function () {
      assert.equal(await token.reputations(staker), 0);
    });

    it('emits proper event log', async function () {
      const event = await inLogs(this.logs, 'RemovedStaker');
      assert.equal(event.args.staker, staker);
    });

    it('reverts when not staker', async function () {
      assertRevertWithMsg(token.removeStaker(staker), 'ReputationFeeds: staker does not exists');
    });
  });
}
