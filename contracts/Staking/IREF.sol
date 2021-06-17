pragma solidity ^0.4.24;

interface IRepF {
    function reputations(address staker) external view returns (uint256);

    function stakers(uint256 index) external view returns (address);

    function getReputation(address staker) external view returns (uint256);

    function isStaker(address staker) external view returns (bool);

    function getStakerIndex(address staker) external view returns (bool, uint256);
}
