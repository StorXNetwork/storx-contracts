pragma solidity ^0.4.24;

interface IRepF {
    function setReputation(address staker, uint256 reputation) external;

    function getReputation() external returns (uint256);
}
