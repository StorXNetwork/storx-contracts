# StorX - Staking

StorX provides it Farm Node owners a staking functionality where farm node owners with their storx staking / escrow wallet can choose to stake a certain amount of SRX and enjoy rewards in SRX available to consume in regular intervals.

Only those addresses which host a [StorX Farm Node](https://storx.tech/host-node.html) and maintain a reputation above a pre-decided threshold can stake & claim rewards.


## Staking

StorX farm node operators can stake an amount of SRX tokens and get rewards. The node operators are eligible to two types of rewards:

    1. Storage or Hosting infrastructure rewards
    2. Staking / Escrow rewards  

1. Storage or Hosting Compensation - **A**  
    StorX Node Operators will be compensated for their hosting costs by a SRX tokens.  
    Its amount is regulated by the StorX Governance.

2. Staking / Escrow Reward - **B**  
    Staking rewards is simple Reward on the amount of initial stake by the StorX Staking Wallet.  
    Staking Reward present will be regulated by the StorX governance committee.  
      
    Eg: if staked/ Escrow token is 100000 SRX and Reward is 6 % per annum then the yearly rewards for staking will be 6000 SRX

A total of **A** + **B** SRX will be added in intervals to the StorX Staking Wallet automatically and can be consumed right away by StorX Node Operators/ Farmer.  
  
  
  
### Pre-requisites To Stake

 - Farm node has been setup & user has access to the XDC wallet used in the StorX node setup 
 - The farmer node is an active participant of the StorX network. 
 - Farmer XDC wallet needs to approve & stake a valid amount i.e. between the aforementioned minimum & maximum SRX tokens on the site.

### Pre-requisites To Claim Rewards

 - Rewards will only be given out if the farmer node has maintained a good reputation in that particular rewards period.
 - If a node fails to do so, the farmer node will not receive any rewards for that reward period and will be able to claim rewards from next rewards period onwards only.


## Unstaking & Withdrawal

 - StorX Node Operators can unstake at any moment using their StorX Staking Wallet  
 - Post unstaking, the StorX Staking Wallet can withdraw all their tokens after a cooldown period as set by the StorX governance committee.  
 E.g: 7 days / 15 days.


## About Contract

The source code of the deployed contract an be found at [Staking](./flats/Staking.flat.sol) and [ReputationFeed](./flats/ReputationFeed.flat.sol).

The crux of the contract is the rewards calculation formula function shown below

```
    function _earned(address beneficiary_) internal view returns (uint256 earned) {
        if (stakes[beneficiary_].staked == false) return 0;
        uint256 tenure = (block.timestamp - stakes[beneficiary_].lastRedeemedAt);
        uint256 earnedStake =
            tenure
                .div(ONE_DAY)
                .mul(stakes[beneficiary_].stakedAmount)
                .mul(interest.div(interestPrecision))
                .div(100)
                .div(365);
        uint256 earnedHost = tenure.div(ONE_DAY).mul(hostingCompensation).div(365);
        earned = earnedStake.add(earnedHost);
    }
```

Rewards are udpated daily but will only be available to consume at regular intervals

## Contract Testing

A dedicated test suite has been created for testing of staking, keeping in mine the time-dependent functionality nature of the contract, the block timestamp has been altered to test contract in various points in time.

Command to run the test suite:

1. Run your local blockchain or test blockchain like ganache or truffle develop  
e.g: for ganache
```
ganache-cli
```
2. Run the staking test suite using
```
npm run test-staking
```
The test results at the the time of deployment can be found [here](./test-result/staking-test.log)  
Staking test suite can be found [here](./test/Staking) 

## Troubleshooting


Public discussions on the technical issues, post articles and request for Enhancements and Technical Contributions. 

- [Telegram](https://t.me/StorXNetwork)- Stay updated with all the Announcements.
- [Discord](https://discord.gg/ha4Jufj2Nm) - Join the community to find answers to all your questions.
- [Reddit](https://www.reddit.com/r/StorXNetwork) - Join the channel to have a healthy interaction with the community.
- [GitHub](https://github.com/StorXNetwork) - Join the developers community on GitHub
