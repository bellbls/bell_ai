import { useCallback, useState } from 'react';
import { Contract, parseUnits } from 'ethers';
import { useWeb3Wallet } from './useWeb3Wallet';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

// VaultForwarder ABI - only the withdraw function we need
const VAULT_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "user", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Contract addresses for each network (will be updated after deployment)
const VAULT_ADDRESSES: Record<string, string> = {
    polygon: process.env.NEXT_PUBLIC_VAULT_ADDRESS_POLYGON || '',
    bsc: process.env.NEXT_PUBLIC_VAULT_ADDRESS_BSC || '',
    arbitrum: process.env.NEXT_PUBLIC_VAULT_ADDRESS_ARBITRUM || '',
};

// Block explorer URLs
const BLOCK_EXPLORERS: Record<string, string> = {
    polygon: 'https://polygonscan.com',
    bsc: 'https://bscscan.com',
    arbitrum: 'https://arbiscan.io',
};

export interface WithdrawalRequest {
    _id: Id<"withdrawals">;
    userId: string;
    amount: number;
    address: string;
    network: string;
    status: string;
}

export interface ExecutionResult {
    withdrawalId: Id<"withdrawals">;
    status: 'success' | 'failed';
    txHash?: string;
    error?: string;
}

export function useWithdrawalExecution() {
    const { provider, signer, connect, switchNetwork, account } = useWeb3Wallet();
    const [executing, setExecuting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    // Convex mutations
    const updateWithdrawalStatus = useMutation(api.wallet.updateWithdrawalStatus);

    /**
     * Get block explorer URL for a transaction
     */
    const getExplorerUrl = useCallback((network: string, txHash: string) => {
        const baseUrl = BLOCK_EXPLORERS[network] || BLOCK_EXPLORERS.polygon;
        return `${baseUrl}/tx/${txHash}`;
    }, []);

    /**
     * Execute a single withdrawal via MetaMask
     */
    const executeWithdrawal = useCallback(async (withdrawal: WithdrawalRequest): Promise<string> => {
        if (!signer) {
            await connect();
            if (!signer) throw new Error('Failed to connect wallet');
        }

        // Get contract address for the network
        const vaultAddress = VAULT_ADDRESSES[withdrawal.network];
        if (!vaultAddress) {
            throw new Error(`No contract address configured for network: ${withdrawal.network}`);
        }

        // Update status to "executing"
        await updateWithdrawalStatus({
            withdrawalId: withdrawal._id as Id<"withdrawals">,
            status: 'executing',
            approvedBy: account || '',
        });

        try {
            // Create contract instance
            const contract = new Contract(vaultAddress, VAULT_ABI, signer);

            // Execute withdrawal (USDT has 6 decimals)
            const tx = await contract.withdraw(
                withdrawal.address,
                parseUnits(withdrawal.amount.toString(), 6)
            );

            // Wait for transaction confirmation
            const receipt = await tx.wait();

            // Update status to "completed"
            await updateWithdrawalStatus({
                withdrawalId: withdrawal._id as Id<"withdrawals">,
                status: 'completed',
                transactionHash: tx.hash,
                executedAt: Date.now(),
            });

            return tx.hash;
        } catch (error: any) {
            // Update status to "failed"
            await updateWithdrawalStatus({
                withdrawalId: withdrawal._id as Id<"withdrawals">,
                status: 'failed',
                executionError: error.message || 'Transaction failed',
                retryAttempts: (withdrawal as any).retryAttempts ? (withdrawal as any).retryAttempts + 1 : 1,
            });

            throw error;
        }
    }, [signer, connect, account, updateWithdrawalStatus]);

    /**
     * Execute multiple withdrawals in batch
     */
    const executeBatch = useCallback(async (withdrawals: WithdrawalRequest[]): Promise<ExecutionResult[]> => {
        setExecuting(true);
        setProgress({ current: 0, total: withdrawals.length });

        const results: ExecutionResult[] = [];

        for (let i = 0; i < withdrawals.length; i++) {
            const withdrawal = withdrawals[i];
            setProgress({ current: i + 1, total: withdrawals.length });

            try {
                const txHash = await executeWithdrawal(withdrawal);
                results.push({
                    withdrawalId: withdrawal._id,
                    status: 'success',
                    txHash,
                });
            } catch (error: any) {
                results.push({
                    withdrawalId: withdrawal._id,
                    status: 'failed',
                    error: error.message || 'Execution failed',
                });

                // Continue with next withdrawal even if this one failed
                console.error(`Failed to execute withdrawal ${withdrawal._id}:`, error);
            }
        }

        setExecuting(false);
        setProgress({ current: 0, total: 0 });

        return results;
    }, [executeWithdrawal]);

    /**
     * Retry a failed withdrawal
     */
    const retryWithdrawal = useCallback(async (withdrawal: WithdrawalRequest): Promise<string> => {
        return executeWithdrawal(withdrawal);
    }, [executeWithdrawal]);

    return {
        executeWithdrawal,
        executeBatch,
        retryWithdrawal,
        getExplorerUrl,
        executing,
        progress,
    };
}
