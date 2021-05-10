async function assertRevert(promise) {
  try {
    await promise;
  } catch (error) {
    const revertFound = error.message.search('revert') >= 0;
    assert(revertFound, `Expected "revert", got ${error} instead`);
    return error.message;
  }
  assert.fail('Expected revert not received');
}

async function assertRevertWithMsg(promise, msg) {
  try {
    await promise;
  } catch (error) {
    const revertFound = error.message.search(msg) >= 0;
    assert(revertFound, `Expected "revert", got ${error} instead`);
    return error.message;
  }
  assert.fail('Expected revert not received');
}

module.exports = {
  assertRevert,
  assertRevertWithMsg
};
