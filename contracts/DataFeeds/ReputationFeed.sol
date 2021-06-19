pragma solidity 0.4.24;

import './Operatable.sol';

interface IReputationFeeds {
    function setReputation(address staker, uint256 reputation) external;

    function getReputation() external returns (uint256);

    function addStaker(address staker, uint256 reputation) external;

    function removeStaker(address staker) external;
}

contract ReputationFeeds is Operatable {
    mapping(address => uint256) public reputations;
    mapping(address => bool) public isStaker;
    address[] public stakers;

    event AddedStaker(address staker, uint256 reputation);
    event RemovedStaker(address staker);

    function setReputation(address staker, uint256 reputation) public onlyOperator {
        reputations[staker] = reputation;
    }

    function getReputation(address staker) public view returns (uint256) {
        return reputations[staker];
    }

    function getAllStaker() public view returns (address[]) {
        return stakers;
    }

    function addStaker(address staker, uint256 reputation) public onlyOperator {
        (bool exists, ) = getStakerIndex(staker);
        require(exists == false, 'ReputationFeeds: staker already exists');
        stakers.push(staker);
        isStaker[staker] = true;
        reputations[staker] = reputation;
        emit AddedStaker(staker, reputation);
    }

    function removeStaker(address staker) public onlyOperator {
        (bool exists, uint256 index) = getStakerIndex(staker);
        require(exists == true, 'ReputationFeeds: staker does not exists');
        stakers[index] = stakers[stakers.length - 1];
        delete stakers[stakers.length - 1];
        stakers.length--;
        isStaker[staker] = false;
        reputations[staker] = 0;
        emit RemovedStaker(staker);
    }

    function getStakerIndex(address staker) public view returns (bool, uint256) {
        for (uint256 i = 0; i < stakers.length; i++) {
            if (stakers[i] == staker) return (true, i);
        }
        return (false, 0);
    }
}
