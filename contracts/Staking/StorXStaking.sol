pragma solidity ^0.4.24;

import '../AddressUtils.sol';
import './SafeMath.sol';
import './Ownable.sol';
import './IREF.sol';
import './IERC20.sol';

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
    event ClaimRewardRepNotMet(address staked_holder, uint256 threshold, uint256 reputation);

    // Parameter Change Events
    event MinStakeAmountChanged(uint256 prevValue, uint256 newValue);
    event MaxStakeAmountChanged(uint256 prevValue, uint256 newValue);
    event RateChanged(uint256 prevValue, uint256 newValue);
    event CoolOffChanged(uint256 prevValue, uint256 newValue);
    event RedeemIntervalChanged(uint256 prevValue, uint256 newValue);
    event ReputationFeedChanged(address prevValue, address newValue);
    event ReputationThresholdChanged(uint256 prevValue, uint256 newValue);
    event HostingCompensationChanged(uint256 prevValue, uint256 newValue);

    event WithdrewTokens(address beneficiary_, uint256 amount_);
    event WithdrewXdc(address beneficiary_, uint256 amount_);

    IERC20 public token;
    IRepF public iRepF;
    uint256 public reputationThreshold;
    uint256 public hostingCompensation = 750 * 12 * 10**18;
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

    function canWithdrawStake(address staker) public view returns (bool) {
        require(stakes[staker].exists, 'StorX: stakeholder does not exists');
        require(stakes[staker].staked == false, 'StorX: stakeholder still has stake');
        uint256 unstakeTenure = block.timestamp - stakes[staker].unstakedTime;
        return coolOff < unstakeTenure;
    }

    constructor(IERC20 token_, uint256 interest_) public {
        token = token_;
        interest = interest_;
    }

    function stake(uint256 amount_) public whenNotStaked {
        require(amount_ >= minStakeAmount, 'StorX: invalid amount');
        require(amount_ <= maxStakeAmount, 'StorX: invalid amount');
        require(iRepF.isStaker(msg.sender), 'StorX: sender not staker');

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

        _totalStaked = _totalStaked.add(amount_);

        token.safeTransferFrom(msg.sender, address(this), amount_);

        emit Staked(msg.sender, amount_);
    }

    function unstake() public whenStaked {
        stakes[msg.sender].unstakedTime = block.timestamp;
        stakes[msg.sender].staked = false;

        _totalStaked = _totalStaked.sub(stakes[msg.sender].stakedAmount);

        emit Unstaked(msg.sender);
    }

    function _earned(address beneficiary_) internal view returns (uint256 earned) {
        require(stakes[beneficiary_].staked, 'StorX: need to stake for earnings');
        uint256 tenure = (block.timestamp - stakes[beneficiary_].lastRedeemedAt);
        uint256 earnedStake =
            tenure.mul(stakes[beneficiary_].stakedAmount).mul(interest).div(100).div(365);
        uint256 earnedHost = tenure.mul(hostingCompensation).mul(interest).div(100).div(365);
        earned = earnedStake.add(earnedHost);
    }

    function earned(address staker) public view returns (uint256 earnings) {
        earnings = _earned(staker);
    }

    function claimEarned(address claimAddress) public canRedeemDrip {
        require(stakes[claimAddress].staked == true, 'StorX: not staked');
        uint256 claimerReputation = iRepF.getReputation(claimAddress);
        if (claimerReputation < reputationThreshold) {
            // mark as redeemed and exit early
            stakes[claimAddress].lastRedeemedAt = block.timestamp;
            emit ClaimRewardRepNotMet(claimAddress, reputationThreshold, claimerReputation);
            return;
        }

        uint256 earnings = _earned(claimAddress);
        require(earnings > 0, 'StorX: no earnings');
        token.mint(claimAddress, earnings);

        stakes[claimAddress].totalRedeemed += earnings;
        stakes[claimAddress].lastRedeemedAt = block.timestamp;

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

    function canWithdrawStakeIn(address staker) public view returns (uint256) {
        require(stakes[staker].exists, 'StorX: stakeholder does not exists');
        require(stakes[staker].staked == false, 'StorX: stakeholder still has stake');
        uint256 unstakeTenure = block.timestamp - stakes[staker].unstakedTime;
        if (coolOff < unstakeTenure) return 0;
        return coolOff - unstakeTenure;
    }

    function thresholdMet(address staker) public view returns (bool) {
        return iRepF.getReputation(staker) > reputationThreshold;
    }

    /**
    
    Owner Functionality Starts

     */

    function setMinStakeAmount(uint256 minStakeAmount_) public onlyOwner {
        require(minStakeAmount_ > 0, 'StorX: minimum stake amount should be greater than 0');
        uint256 prevValue = minStakeAmount;
        minStakeAmount = minStakeAmount_;
        emit MinStakeAmountChanged(prevValue, minStakeAmount);
    }

    function setMaxStakeAmount(uint256 maxStakeAmount_) public onlyOwner {
        require(maxStakeAmount_ > 0, 'StorX: maximum stake amount should be greater than 0');
        uint256 prevValue = maxStakeAmount;
        maxStakeAmount = maxStakeAmount_;
        emit MaxStakeAmountChanged(prevValue, maxStakeAmount);
    }

    function setRate(uint256 interest_) public onlyOwner {
        uint256 prevValue = interest;
        interest = interest_;
        emit RateChanged(prevValue, interest);
    }

    function setCoolOff(uint256 coolOff_) public onlyOwner {
        uint256 prevValue = coolOff;
        coolOff = coolOff_;
        emit CoolOffChanged(prevValue, coolOff);
    }

    function setRedeemInterval(uint256 redeemInterval_) public onlyOwner {
        uint256 prevValue = redeemInterval;
        redeemInterval = redeemInterval_;
        emit RedeemIntervalChanged(prevValue, redeemInterval);
    }

    function setIRepF(IRepF repAddr_) public onlyOwner {
        address prevValue = address(iRepF);
        iRepF = repAddr_;
        emit ReputationFeedChanged(prevValue, address(iRepF));
    }

    function setReputationThreshold(uint256 threshold) public onlyOwner {
        uint256 prevValue = reputationThreshold;
        reputationThreshold = threshold;
        emit ReputationThresholdChanged(prevValue, reputationThreshold);
    }

    function setHostingCompensation(uint256 hostingCompensation_) public onlyOwner {
        uint256 prevValue = hostingCompensation;
        hostingCompensation = hostingCompensation_;
        emit HostingCompensationChanged(prevValue, hostingCompensation);
    }

    function withdrawTokens(address beneficiary_, uint256 amount_) public onlyOwner {
        require(amount_ > 0, 'StorX: token amount has to be greater than 0');
        token.safeTransfer(beneficiary_, amount_);
        emit WithdrewTokens(beneficiary_, amount_);
    }

    function withdrawXdc(address beneficiary_, uint256 amount_) public onlyOwner {
        require(amount_ > 0, 'StorX: xdc amount has to be greater than 0');
        beneficiary_.transfer(amount_);
        emit WithdrewXdc(beneficiary_, amount_);
    }
}
