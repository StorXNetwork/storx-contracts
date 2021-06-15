// File: contracts/DataFeeds/Ownable.sol

pragma solidity 0.4.24;

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
    address public owner;

    event OwnershipRenounced(address indexed previousOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev The Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    constructor() public {
        owner = msg.sender;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /**
     * @dev Allows the current owner to relinquish control of the contract.
     * @notice Renouncing to ownership will leave the contract without an owner.
     * It will not be possible to call the functions with the `onlyOwner`
     * modifier anymore.
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipRenounced(owner);
        owner = address(0);
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param _newOwner The address to transfer ownership to.
     */
    function transferOwnership(address _newOwner) public onlyOwner {
        _transferOwnership(_newOwner);
    }

    /**
     * @dev Transfers control of the contract to a newOwner.
     * @param _newOwner The address to transfer ownership to.
     */
    function _transferOwnership(address _newOwner) internal {
        require(_newOwner != address(0));
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}

// File: contracts/DataFeeds/Operatable.sol

pragma solidity 0.4.24;


contract Operatable is Ownable {
    address private _operator;

    event OperatorTransferred(address indexed previousOperator, address indexed newOperator);

    constructor() public {
        _operator = msg.sender;
        emit OperatorTransferred(address(0), _operator);
    }

    function operator() public view returns (address) {
        return _operator;
    }

    modifier onlyOperator() {
        require(_operator == msg.sender, 'operator: caller is not the operator');
        _;
    }

    function isOperator() public view returns (bool) {
        return msg.sender == _operator;
    }

    function transferOperator(address newOperator_) public onlyOwner {
        _transferOperator(newOperator_);
    }

    function _transferOperator(address newOperator_) internal {
        require(newOperator_ != address(0), 'operator: zero address given for new operator');
        emit OperatorTransferred(address(0), newOperator_);
        _operator = newOperator_;
    }
}

// File: contracts/DataFeeds/ReputationFeed.sol

pragma solidity 0.4.24;


interface IReputationFeeds {
        function setReputation(address staker, uint256 reputation) external;
        function getReputation() external returns(uint256);
}

contract ReputationFeed is Operatable {
    
    mapping(address => uint256) public reputations;
    
    function setReputation(address staker, uint256 reputation) public onlyOperator {
        reputations[staker]=reputation;
    }
    
    function getReputation(address staker) public view returns (uint256) {
        return reputations[staker];
    }
    
}
