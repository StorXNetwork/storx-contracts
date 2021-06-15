pragma solidity ^0.4.24;

import '../AddressUtils.sol';

/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * See https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
    function totalSupply() public view returns (uint256);

    function balanceOf(address _who) public view returns (uint256);

    function transfer(address _to, uint256 _value) public returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
}

/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
    function allowance(address _owner, address _spender) public view returns (uint256);

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public returns (bool);

    function approve(address _spender, uint256 _value) public returns (bool);

    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {
    /**
     * @dev Multiplies two numbers, throws on overflow.
     */
    function mul(uint256 _a, uint256 _b) internal pure returns (uint256 c) {
        // Gas optimization: this is cheaper than asserting 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
        if (_a == 0) {
            return 0;
        }

        c = _a * _b;
        assert(c / _a == _b);
        return c;
    }

    /**
     * @dev Integer division of two numbers, truncating the quotient.
     */
    function div(uint256 _a, uint256 _b) internal pure returns (uint256) {
        // assert(_b > 0); // Solidity automatically throws when dividing by 0
        // uint256 c = _a / _b;
        // assert(_a == _b * c + _a % _b); // There is no case in which this doesn't hold
        return _a / _b;
    }

    /**
     * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
     */
    function sub(uint256 _a, uint256 _b) internal pure returns (uint256) {
        assert(_b <= _a);
        return _a - _b;
    }

    /**
     * @dev Adds two numbers, throws on overflow.
     */
    function add(uint256 _a, uint256 _b) internal pure returns (uint256 c) {
        c = _a + _b;
        assert(c >= _a);
        return c;
    }
}

/**
 * @title SafeERC20
 * @dev Wrappers around ERC20 operations that throw on failure.
 * To use this library you can add a `using SafeERC20 for ERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    function safeTransfer(
        IERC20 _token,
        address _to,
        uint256 _value
    ) internal {
        require(_token.transfer(_to, _value));
    }

    function safeTransferFrom(
        IERC20 _token,
        address _from,
        address _to,
        uint256 _value
    ) internal {
        require(_token.transferFrom(_from, _to, _value));
    }

    function safeApprove(
        IERC20 _token,
        address _spender,
        uint256 _value
    ) internal {
        require(_token.approve(_spender, _value));
    }
}

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

/**
 * @title IERC20
 * @dev Interface to ERC20 token
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function mint(address to, uint256 amount) external;

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

interface IRepF {
    function setReputation(address staker, uint256 reputation) external;

    function getReputation() external returns (uint256);
}

contract StroxStaking is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using AddressUtils for address;

    uint256 private ONE_DAY = 86400;
    uint256 private ONE_YEAR_TO_DAY = 365;

    struct Stake {
        address stakerHolder;
        uint256 stakedAmount;
        bool staked;
        bool exists;
        uint256 stakedTime;
        uint256 unstakedTime;
        uint256 totalRedeemed;
        uint256 lastRedeemedAt;
        uint256 balance; // ? required
    }

    mapping(address => Stake) public stakes;
    address[] public stakeHolders;

    event Staked(address stake_holder, uint256 amount);

    event Unstaked(address staked_holder);
    event WithdrewStake(address staked_holder, uint256 amount);
    event ClaimedRewards(address staked_holder, uint256 amount);

    IERC20 public token;
    IRepF public iRepF;
    uint256 public reputationThreshold;
    uint256 public hostingCompensation = 750 * 10**18;
    uint256 internal _totalStaked;
    uint256 public minStakeAmount;
    uint256 public maxStakeAmount;
    uint256 private coolOff = ONE_DAY * 7;
    uint256 public interest;
    uint256 private dripInterval = 30 * ONE_DAY;
    uint256 private lastDripAt = 0;
    uint256 private totalRedeemed = 0;
    uint256 private redeemInterval;

    modifier whenStaked() {
        require(stakes[msg.sender].staked == true, 'StorX: not staked');
        _;
    }

    modifier whenNotStaked() {
        require(stakes[msg.sender].staked == false, 'StorX: already staked');
        _;
    }

    modifier whenUnStaked() {
        require(
            stakes[msg.sender].exists == true &&
                stakes[msg.sender].staked == false &&
                stakes[msg.sender].stakedAmount > 0,
            'StorX: not un-staked'
        );
        _;
    }

    modifier canRedeemDrip() {
        require(lastDripAt + dripInterval < block.timestamp, 'StorX: cannot claim drip yet');
        _;
    }

    function canWithdrawStake() public view returns (bool) {
        require(stakes[msg.sender].exists, 'StorX: stakeholder does not exists');
        require(stakes[msg.sender].staked == false, 'StorX: stakeholder still has stake');
        uint256 unstakeTenure = block.timestamp - stakes[msg.sender].unstakedTime;
        return coolOff < unstakeTenure;
    }

    constructor(IERC20 token_, uint256 interest_) public {
        token = token_;
        interest = interest_;
    }

    function stake(uint256 amount_) public whenNotStaked {
        require(amount_ >= minStakeAmount, 'StorX: invalid amount');
        require(amount_ <= maxStakeAmount, 'StorX: invalid amount');

        stakes[msg.sender].staked = true;
        if (stakes[msg.sender].exists == false) {
            stakes[msg.sender].exists = true;
            stakes[msg.sender].stakerHolder = msg.sender;

            stakeHolders.push(msg.sender);
        }

        stakes[msg.sender].stakedTime = block.timestamp;
        stakes[msg.sender].totalRedeemed = 0;
        stakes[msg.sender].lastRedeemedAt = 0;
        stakes[msg.sender].stakedAmount = amount_;
        stakes[msg.sender].balance = 0;

        token.safeTransferFrom(msg.sender, address(this), amount_);

        emit Staked(msg.sender, amount_);
    }

    function unstake() public whenStaked {
        stakes[msg.sender].unstakedTime = block.timestamp;
        stakes[msg.sender].staked = false;

        emit Unstaked(msg.sender);
    }

    function _earned(address beneficiary_) internal view returns (uint256 earned) {
        require(stakes[beneficiary_].staked, 'StorX: need to stake for earnings');
        uint256 tenure = (block.timestamp - stakes[beneficiary_].lastRedeemedAt);
        earned = tenure.mul(stakes[beneficiary_].stakedAmount).mul(interest).div(100).div(365);
    }

    function earned() public view returns (uint256 earnings) {
        earnings = _earned(msg.sender);
    }

    function claimEarned(address claimAddress) public canRedeemDrip {
        require(stakes[claimAddress].staked == true, 'StorX: not staked');
        uint256 claimerThreshold = iRepF.getReputation(claimAddress);
        require(claimerThreshold > 0, 'StorX: reputation threshold not met');
        uint256 earnings = _earned(claimAddress);
        require(earnings > 0, 'StorX: no earnings');
        token.mint(claimAddress, earnings);

        stakes[claimAddress].totalRedeemed += earnings;
        stakes[claimAddress].lastRedeemedAt += block.timestamp;

        totalRedeemed += earnings;

        emit ClaimedRewards(claimAddress, earnings);
    }

    function withdrawStake() public whenUnStaked {
        uint256 withdrawAmount = stakes[msg.sender].stakedAmount;
        token.transfer(msg.sender, withdrawAmount);
        stakes[msg.sender].stakedAmount = 0;
        emit WithdrewStake(msg.sender, withdrawAmount);
    }

    function nextDripAt() public view returns (uint256) {
        return lastDripAt + dripInterval;
    }

    function canWithdrawStakeIn() public view returns (uint256) {
        require(stakes[msg.sender].exists, 'StorX: stakeholder does not exists');
        require(stakes[msg.sender].staked == false, 'StorX: stakeholder still has stake');
        uint256 unstakeTenure = block.timestamp - stakes[msg.sender].unstakedTime;
        if (coolOff < unstakeTenure) return 0;
        return coolOff - unstakeTenure;
    }

    /**
    
    Owner Functionality Starts

     */

    function setMinStakeAmount(uint256 minStakeAmount_) public onlyOwner {
        require(minStakeAmount_ > 0, 'StorX: minimum stake amount should be greater than 0');
        minStakeAmount = minStakeAmount_;
    }

    function setMaxStakeAmount(uint256 maxStakeAmount_) public onlyOwner {
        require(maxStakeAmount_ > 0, 'StorX: maximum stake amount should be greater than 0');
        maxStakeAmount = maxStakeAmount_;
    }

    function setRate(uint256 interest_) public onlyOwner {
        interest = interest_;
    }

    function setCoolOff(uint256 coolOff_) public onlyOwner {
        coolOff = coolOff_;
    }

    function setRedeemInterval(uint256 redeemInterval_) public onlyOwner {
        redeemInterval = redeemInterval_;
    }

    function withdrawTokens(address beneficiary_, uint256 amount_) public onlyOwner {
        require(amount_ > 0, 'StorX: token amount has to be greater than 0');
        token.safeTransfer(beneficiary_, amount_);
    }

    function withdrawXdc(address beneficiary_, uint256 amount_) public onlyOwner {
        require(amount_ > 0, 'StorX: xdc amount has to be greater than 0');
        beneficiary_.transfer(amount_);
    }

    function setIRepF(IRepF repAddr_) public onlyOwner {
        iRepF = repAddr_;
    }

    function setReputationThreshold(uint256 threshold) public onlyOwner {
        reputationThreshold = threshold;
    }

    function setHostingCompensation(uint256 hostingCompensation_) public onlyOwner {
        hostingCompensation = hostingCompensation_;
    }
}
