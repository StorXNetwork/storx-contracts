exports.PrepopulateStaker = (token, [badRep, ...stakers], threshold = 100) => {
  return new Promise(async (resolve, reject) => {
    try {
      for (let staker of stakers) {
        await token.addStaker(staker, threshold);
      }
      await token.addStaker(badRep, threshold - 1);
      resolve(true);
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
};
