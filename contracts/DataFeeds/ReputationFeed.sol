pragma solidity 0.4.24;

import './Operatable.sol';

interface IReputationFeeds {
    function setReputation(address staker, uint256 reputation) external;

    function getReputation() external returns (uint256);
}

contract ReputationFeeds is Operatable {
    mapping(address => uint256) public reputations;

    function setReputation(address staker, uint256 reputation) public onlyOperator {
        reputations[staker] = reputation;
    }

    function getReputation(address staker) public view returns (uint256) {
        return reputations[staker];
    }
}
