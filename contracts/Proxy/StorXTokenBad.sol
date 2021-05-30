pragma solidity ^0.4.24;

import '../Token/Operator.sol';
import '../Token/StandardToken.sol';

contract StorxTokenBad is StandardToken, Operator {
    string public name;
    string public symbol;
    uint8 public decimals;

    function initialize(
        string _name,
        string _symbol,
        uint8 _decimals,
        uint256 _totalSupply
    ) public initializer {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        balances[msg.sender] = _totalSupply;
        totalSupply_ = _totalSupply;

        _initializeOwner();
        _initializeOperator();
    }

    /**
     * calls internal function _mint()
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
