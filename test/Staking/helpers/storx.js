exports.MintBalance = (token, operator, accounts, amount) => {
  return new Promise(async (resolve, reject) => {
    try {
      for (let account of accounts) {
        await token.mint(account, amount, { from: operator });
      }
      resolve(true);
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};

exports.TransferBalance = (token, operator, accounts, amount) => {
  return new Promise(async (resolve, reject) => {
    try {
      for (let account of accounts) {
        await token.transfer(account, amount, { from: operator });
      }
      resolve(true);
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};

exports.CalculateEarning = ({ interest, hostingComp, days, amount, precision=100 }) => {
  return Math.floor(
    (parseFloat(amount) * parseFloat(days) * parseFloat(interest / precision)) / 36500 +
      (parseFloat(hostingComp) * parseFloat(days)) / 365
  );
};
