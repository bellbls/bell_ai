"use client";

import { useState, useCallback } from "react";
import { Contract, parseUnits, formatUnits } from "ethers";
import { BrowserProvider, JsonRpcSigner } from "ethers";

// USDT Token ABI (minimal - only what we need)
const USDT_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
];

// VaultForwarder Contract ABI (minimal)
const VAULT_ABI = [
    "function deposit(uint256 amount) external",
    "function paused() external view returns (bool)",
];

export interface NetworkContractConfig {
    vaultAddress: string;
    usdtAddress: string;
    decimals: number;
}

// Contract addresses for each network
export const NETWORK_CONTRACTS: Record<string, NetworkContractConfig> = {
    polygon: {
        vaultAddress: "0x0000000000000000000000000000000000000000", // TODO: Update after deployment
        usdtAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT on Polygon
        decimals: 6,
    },
    bsc: {
        vaultAddress: "0x0000000000000000000000000000000000000000", // TODO: Update after deployment
        usdtAddress: "0x55d398326f99059fF775485246999027B3197955", // USDT on BSC
        decimals: 18,
    },
    arbitrum: {
        vaultAddress: "0x0000000000000000000000000000000000000000", // TODO: Update after deployment
        usdtAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT on Arbitrum
        decimals: 6,
    },
};

export function useDepositContract(
    provider: BrowserProvider | null,
    signer: JsonRpcSigner | null,
    network: string | null
) {
    const [isApproving, setIsApproving] = useState(false);
    const [isDepositing, setIsDepositing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get contract configuration for current network
    const getNetworkConfig = useCallback((): NetworkContractConfig | null => {
        if (!network) return null;
        return NETWORK_CONTRACTS[network] || null;
    }, [network]);

    // Check USDT balance
    const checkBalance = useCallback(async (userAddress: string): Promise<string> => {
        if (!provider || !network) {
            // Return 0 instead of throwing - wallet not connected yet
            return "0";
        }

        const config = getNetworkConfig();
        if (!config) {
            throw new Error("Unsupported network");
        }

        try {
            const usdtContract = new Contract(config.usdtAddress, USDT_ABI, provider);
            const balance = await usdtContract.balanceOf(userAddress);
            return formatUnits(balance, config.decimals);
        } catch (err: any) {
            console.error("Error checking balance:", err);
            return "0"; // Return 0 on error instead of throwing
        }
    }, [provider, network, getNetworkConfig]);

    // Check USDT allowance
    const checkAllowance = useCallback(async (userAddress: string): Promise<string> => {
        if (!provider || !network) {
            // Return 0 instead of throwing - wallet not connected yet
            return "0";
        }

        const config = getNetworkConfig();
        if (!config) {
            throw new Error("Unsupported network");
        }

        try {
            const usdtContract = new Contract(config.usdtAddress, USDT_ABI, provider);
            const allowance = await usdtContract.allowance(userAddress, config.vaultAddress);
            return formatUnits(allowance, config.decimals);
        } catch (err: any) {
            console.error("Error checking allowance:", err);
            return "0"; // Return 0 on error instead of throwing
        }
    }, [provider, network, getNetworkConfig]);

    // Approve USDT spending
    const approveUSDT = useCallback(async (amount: string): Promise<string> => {
        if (!signer || !network) {
            throw new Error("Wallet not connected");
        }

        const config = getNetworkConfig();
        if (!config) {
            throw new Error("Unsupported network");
        }

        setIsApproving(true);
        setError(null);

        try {
            const usdtContract = new Contract(config.usdtAddress, USDT_ABI, signer);
            const amountWei = parseUnits(amount, config.decimals);

            const tx = await usdtContract.approve(config.vaultAddress, amountWei);
            console.log("Approval transaction sent:", tx.hash);

            await tx.wait();
            console.log("Approval confirmed:", tx.hash);

            return tx.hash;
        } catch (err: any) {
            console.error("Approval error:", err);
            const errorMessage = err.reason || err.message || "Failed to approve USDT";
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsApproving(false);
        }
    }, [signer, network, getNetworkConfig]);

    // Execute deposit
    const deposit = useCallback(async (amount: string): Promise<string> => {
        if (!signer || !network) {
            throw new Error("Wallet not connected");
        }

        const config = getNetworkConfig();
        if (!config) {
            throw new Error("Unsupported network");
        }

        // Validate amount is a valid number
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new Error("Invalid deposit amount");
        }

        setIsDepositing(true);
        setError(null);

        try {
            // Check if vault is paused
            const vaultContract = new Contract(config.vaultAddress, VAULT_ABI, signer);
            const isPaused = await vaultContract.paused();

            if (isPaused) {
                throw new Error("Deposits are currently paused on this network");
            }

            // Convert amount to wei with exact precision
            // This ensures the exact amount entered by user is sent to blockchain
            const amountWei = parseUnits(amount, config.decimals);
            
            // Verify the conversion is correct (round-trip check)
            const convertedBack = parseFloat(formatUnits(amountWei, config.decimals));
            if (Math.abs(convertedBack - amountNum) > 0.01) {
                throw new Error("Amount precision error. Please try again.");
            }

            console.log(`Depositing exact amount: $${amountNum.toFixed(2)} USDT (${amountWei.toString()} wei)`);

            // Execute deposit with exact amount
            const tx = await vaultContract.deposit(amountWei);
            console.log("Deposit transaction sent:", tx.hash);

            await tx.wait();
            console.log("Deposit confirmed:", tx.hash);

            return tx.hash;
        } catch (err: any) {
            console.error("Deposit error:", err);
            const errorMessage = err.reason || err.message || "Failed to deposit";
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsDepositing(false);
        }
    }, [signer, network, getNetworkConfig]);

    // Check if approval is needed
    const needsApproval = useCallback(async (userAddress: string, amount: string): Promise<boolean> => {
        try {
            const allowance = await checkAllowance(userAddress);
            return parseFloat(allowance) < parseFloat(amount);
        } catch (err) {
            console.error("Error checking if approval needed:", err);
            return true; // Assume approval needed if check fails
        }
    }, [checkAllowance]);

    return {
        checkBalance,
        checkAllowance,
        approveUSDT,
        deposit,
        needsApproval,
        isApproving,
        isDepositing,
        error,
        networkConfig: getNetworkConfig(),
    };
}
