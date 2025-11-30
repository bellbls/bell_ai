// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VaultForwarder
 * @dev Secure vault that automatically forwards deposits to cold wallet
 * 
 * Features:
 * - Automatic fund splitting: 2.5% hot wallet, 97.5% cold wallet
 * - Owner-only withdrawals
 * - Pausable deposits
 * - Low balance alerts
 * - Emergency withdraw
 * - Reentrancy protection
 * 
 * Security:
 * - Based on OpenZeppelin audited contracts
 * - Minimal attack surface
 * - Only 2.5% of funds at risk
 * 
 * Configuration:
 * - Cold Wallet: 0x074828a9a07f800d1da5836fe3140c6701d41b11
 * - Hot Wallet: 0xDe9555F5b9BfeCF7f97954bFcb41c550b47b89fc
 * - Hot Wallet %: 2.5%
 */
contract VaultForwarder is Ownable, Pausable, ReentrancyGuard {
    // USDT token contract
    IERC20 public immutable usdt;
    
    // Cold wallet address (receives 97.5% of deposits)
    address public immutable coldWallet;
    
    // Hot wallet percentage (2.5% = 250 basis points)
    uint256 public constant HOT_WALLET_BPS = 250;  // 2.5%
    uint256 public constant BASIS_POINTS = 10000;   // 100%
    
    // Low balance threshold for alerts ($500 in USDT with 6 decimals)
    uint256 public lowBalanceThreshold = 500 * 10**6;
    
    // Events
    event DepositMade(
        address indexed user,
        uint256 amount,
        uint256 toHotWallet,
        uint256 toColdWallet
    );
    
    event WithdrawalMade(
        address indexed user,
        uint256 amount
    );
    
    event FundsForwarded(
        address indexed to,
        uint256 amount
    );
    
    event LowBalanceAlert(
        uint256 currentBalance,
        uint256 threshold
    );
    
    event EmergencyWithdrawal(
        address indexed to,
        uint256 amount
    );
    
    event LowBalanceThresholdUpdated(
        uint256 oldThreshold,
        uint256 newThreshold
    );
    
    event DepositsPaused(address indexed by);
    event DepositsResumed(address indexed by);
    
    /**
     * @dev Constructor
     * @param _usdt USDT token contract address
     * @param _coldWallet Cold wallet address (receives 97.5%)
     * @param _owner Contract owner address (hot wallet)
     */
    constructor(
        address _usdt,
        address _coldWallet,
        address _owner
    ) Ownable(_owner) {
        require(_usdt != address(0), "Invalid USDT address");
        require(_coldWallet != address(0), "Invalid cold wallet address");
        require(_owner != address(0), "Invalid owner address");
        
        usdt = IERC20(_usdt);
        coldWallet = _coldWallet;
    }
    
    /**
     * @dev Deposit USDT into vault
     * Automatically forwards 97.5% to cold wallet, keeps 2.5% in contract
     * @param amount Amount of USDT to deposit (in USDT's smallest unit)
     */
    function deposit(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer USDT from user to this contract
        bool success = usdt.transferFrom(msg.sender, address(this), amount);
        require(success, "USDT transfer failed");
        
        // Calculate split
        uint256 toHotWallet = (amount * HOT_WALLET_BPS) / BASIS_POINTS;
        uint256 toColdWallet = amount - toHotWallet;
        
        // Forward to cold wallet
        if (toColdWallet > 0) {
            success = usdt.transfer(coldWallet, toColdWallet);
            require(success, "Cold wallet transfer failed");
            emit FundsForwarded(coldWallet, toColdWallet);
        }
        
        // Hot wallet amount stays in contract
        // Check if balance is low
        _checkLowBalance();
        
        emit DepositMade(msg.sender, amount, toHotWallet, toColdWallet);
    }
    
    /**
     * @dev Withdraw USDT to user (owner only)
     * Called by backend withdrawal executer
     * @param user User address to send USDT to
     * @param amount Amount of USDT to withdraw
     */
    function withdraw(address user, uint256 amount) external onlyOwner nonReentrant {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 balance = usdt.balanceOf(address(this));
        require(balance >= amount, "Insufficient contract balance");
        
        bool success = usdt.transfer(user, amount);
        require(success, "USDT transfer failed");
        
        // Check if balance is low after withdrawal
        _checkLowBalance();
        
        emit WithdrawalMade(user, amount);
    }
    
    /**
     * @dev Pause deposits (owner only)
     * Used in emergency situations
     */
    /**
     * @dev Pause deposits (owner only)
     * Used in emergency situations
     */
    function pauseDeposits() external onlyOwner {
        _pause();
        emit DepositsPaused(msg.sender);
    }
    
    /**
     * @dev Resume deposits (owner only)
     */
    function resumeDeposits() external onlyOwner {
        _unpause();
        emit DepositsResumed(msg.sender);
    }
    
    /**
     * @dev Emergency withdraw all funds to cold wallet (owner only)
     * Use only in case of contract vulnerability
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdt.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");
        
        bool success = usdt.transfer(coldWallet, balance);
        require(success, "Emergency withdrawal failed");
        
        emit EmergencyWithdrawal(coldWallet, balance);
    }
    
    /**
     * @dev Update low balance threshold (owner only)
     * @param newThreshold New threshold in USDT (with 6 decimals)
     */
    function setLowBalanceThreshold(uint256 newThreshold) external onlyOwner {
        uint256 oldThreshold = lowBalanceThreshold;
        lowBalanceThreshold = newThreshold;
        emit LowBalanceThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /**
     * @dev Get current contract balance
     * @return Current USDT balance in contract
     */
    function getBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }
    
    /**
     * @dev Check if contract balance is below threshold
     * Emits LowBalanceAlert if true
     */
    function _checkLowBalance() internal {
        uint256 balance = usdt.balanceOf(address(this));
        if (balance < lowBalanceThreshold) {
            emit LowBalanceAlert(balance, lowBalanceThreshold);
        }
    }
    
    /**
     * @dev Manual balance check (anyone can call)
     * Useful for monitoring
     */
    function checkBalance() external {
        _checkLowBalance();
    }
}
