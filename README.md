# StorX Contracts

This repository contains smart contracts for StorX Token, its Proxy Contract & Staking Contract. The Proxy contract has been inspired from the USDC contract on ethereum blockchain.

# StorX - ERC20 Token
## Tokenomics

- Name: STORX
- Symbol: SRX
- Decimals: 18
- Total Supply: 500 Million

## Deployments

- StorX Token Implementation - [xdcdc34e983e8558651ebb1fd3d2f2cf303bf8fd00a](https://xdc.network/addr/xdcdc34e983e8558651ebb1fd3d2f2cf303bf8fd00a)
- StorX Token Proxy - [xdc5d5f074837f5d4618b3916ba74de1bf9662a3fed](https://xdc.network/addr/xdc5d5f074837f5d4618b3916ba74de1bf9662a3fed)

## Brief on Proxy

All the function calls are made to a proxy contract which delegates calls to the implementation. The context i.e. address where all data regarding the state of the contract is stored will be on Proxy contract and not on implementation contract.

This empowers us to change the contract functionality at a later stage after deployment. Storage collisions have been considered and the contract follows [EIP-1967: Standard Proxy Storage Slots](https://eips.ethereum.org/EIPS/eip-1967) for the same, so explorers can identify that the contract is a proxy.

## Testing

- Test Token Via Proxy `npm run test-proxy`
- Test Token Directly `npm run test-token`
- Test Both `npm run test-all`

## Audit

An internal audit has been done of the smart contract and its report can be found [here](/audit/report/StorXAudit.pdf)


# StorX - Staking


StorX provides its Farm Node owners a staking functionality where farm node owners with their storx staking / escrow wallet can choose to stake a certian amount of SRX and enjoy rewards in SRX available to consume in regular intervals.

Only those addresses which host a [StorX Farm Node](https://storx.tech/host-node.html) and maintain a reputation above a pre-decided threshold can stake & claim rewards.


## Staking

StorX farm node operators can stake an amount of SRX tokens and get rewards. The node operators are eligible to two types of rewards:

    1. Storage or Hosting infrastructure rewards
    2. Staking / Escrow rewards  

1. Storage or Hosting Compensation - **A**  
    StorX Node Operators will be compensated for their hosting costs by SRX tokens.  
    Its amount is regulated by the StorX Governance.

2. Staking / Escrow Reward - **B**  
    Staking rewards is simple Reward on the amount of initial stake by the StorX Staking Wallet.  
    Staking Reward present will be regulated by the StorX governance committee.  
      
    Eg: if staked/ Escrow token is 100000 SRX and Reward is 6 % per annum then the yearly rewards for staking will be 6000 SRX

A total of **A** + **B** SRX will be added in intervals to the StorX Staking Wallet automatically and can be consumed right away by StorX Node Operators/ Farmer.  
 
 
 
### Prerequisites To Stake

 - Farm node has been setup & user has access to the XDC wallet used in the StorX node setup
 - The farmer node is an active participant of the StorX network.
 - Farmer XDC wallet needs to approve & stake a valid amount i.e. between the aforementioned minimum & maximum SRX tokens on the site.

### Prerequisites To Claim Rewards

 - Rewards will only be given out if the farmer node has maintained a good reputation in that particular rewards period.
 - If a node fails to do so, the farmer node will not receive any rewards for that reward period and will be able to claim rewards from the next rewards period onwards only.


## Unstaking & Withdrawal

 - StorX Node Operators can unstake at any moment using their StorX Staking Wallet  
 - Post unstaking, the StorX Staking Wallet can withdraw all their tokens after a cooldown period as set by the StorX governance committee.  
 E.g: 7 days / 15 days.


## About Contract

The source code of the deployed contract can be found at [Staking](./flats/Staking.flat.sol) and [ReputationFeed](./flats/ReputationFeed.flat.sol).

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

Rewards are updated daily but will only be available to consume at regular intervals

## Contract Testing

A dedicated test suite has been created for testing of staking. Keeping in mind the time-dependent functionality nature of the contract, the block timestamp has been altered to test the contract at various points in time.

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

## Community Tools  

 - [General Contract Viewer](http://gcv.raavan.online/) - using this tool you can interact with any contract by adding the ABI & address, by default SRX token details are shown.  

## Troubleshooting


Public discussions on the technical issues, post articles and request for Enhancements and Technical Contributions.

- [Telegram](https://t.me/StorXNetwork)- Stay updated with all the Announcements.
- [Discord](https://discord.gg/ha4Jufj2Nm) - Join the community to find answers to all your questions.
- [Reddit](https://www.reddit.com/r/StorXNetwork) - Join the channel to have a healthy interaction with the community.
- [GitHub](https://github.com/StorXNetwork) - Join the developers community on GitHub


