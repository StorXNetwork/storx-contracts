pragma solidity ^0.4.24;

import './Operator.sol';
import './StandardToken.sol';

contract StorxToken is StandardToken, Operator {
    string public name;
    string public symbol;
    uint8 public decimals;

    constructor(
        string _name,
        string _symbol,
        uint8 _decimals,
        uint256 _totalSupply
    ) public {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        balances[msg.sender] = _totalSupply;
        totalSupply_ = _totalSupply;
    }

    /**
     * calls internal function _mint()
     */
    function mint(address to, uint256 amount) public onlyOperator {
        _mint(to, amount);
    }
}
