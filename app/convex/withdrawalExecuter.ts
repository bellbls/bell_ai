import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Withdrawal Executer - Processes approved withdrawals on blockchain
 * Runs as a scheduled cron job every 5 minutes
 * 
 * Configuration (set via environment variables):
 * - VAULT_CONTRACT_ADDRESS: Address of deployed VaultUSDT contract
 * - VAULT_NETWORK_RPC_URL: RPC endpoint (Infura/Alchemy)
 * - VAULT_PRIVATE_KEY: Private key for signing transactions (CRITICAL: Secure storage!)
 * - USDT_DECIMALS: Token decimals (typically 6 for USDT)
 */

// Configuration
const CONFIG = {
    CONTRACT_ADDRESS: process.env.VAULT_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
    RPC_URL: process.env.VAULT_NETWORK_RPC_URL || "",
    PRIVATE_KEY: process.env.VAULT_PRIVATE_KEY || "",
    USDT_DECIMALS: parseInt(process.env.USDT_DECIMALS || "6"),
    GAS_LIMIT: 100000, // Gas limit for withdraw transactions
};

/**
 * VaultUSDT Contract ABI (minimal - only withdraw function)
 */
const VAULT_ABI = [
    "function withdraw(address user, uint256 amount) external"
];

/**
 * Main withdrawal executer function
 * This is called by the cron job every 5 minutes
 */
export const executeWithdrawals = internalAction({
    args: {},
    handler: async (ctx) => {
        const startTime = Date.now();
        let processedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        try {
            // Validate configuration
            if (!CONFIG.RPC_URL || CONFIG.CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
                throw new Error("Withdrawal executer not configured. Please set VAULT_CONTRACT_ADDRESS and VAULT_NETWORK_RPC_URL");
            }

            if (!CONFIG.PRIVATE_KEY || CONFIG.PRIVATE_KEY === "") {
                throw new Error("VAULT_PRIVATE_KEY not set. Cannot sign transactions.");
            }

            // Step A: Fetch approved withdrawals
            const approvedWithdrawals = await ctx.runQuery(internal.wallet.getApprovedWithdrawals, {});

            if (!approvedWithdrawals || approvedWithdrawals.length === 0) {
                console.log("No approved withdrawals to process");
                return {
                    success: true,
                    message: "No approved withdrawals",
                    processedCount: 0,
                };
            }

            console.log(`Found ${approvedWithdrawals.length} approved withdrawals to process`);

            // Initialize Web3
            const ethers = await import("ethers");
            const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
            const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
            const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, VAULT_ABI, wallet);

            // Step B-G: Process each withdrawal
            for (const withdrawal of approvedWithdrawals) {
                try {
                    await processWithdrawal(ctx, withdrawal, contract, ethers);
                    processedCount++;
                } catch (error: any) {
                    console.error(`Error processing withdrawal ${withdrawal._id}:`, error);
                    failedCount++;
                    errors.push(`Withdrawal ${withdrawal._id}: ${error.message}`);

                    // Log the failure
                    await logWithdrawalError(ctx, withdrawal._id, error.message);
                }
            }

            // Log cron execution
            await ctx.runMutation(internal.blockchainSync.logCronExecution, {
                jobName: "withdrawal-executer",
                status: failedCount > 0 ? "failed" : "success",
                message: `Processed ${processedCount} withdrawals, ${failedCount} failed`,
                executionTimeMs: Date.now() - startTime,
                details: errors.length > 0 ? JSON.stringify({ errors }) : undefined,
            });

            return {
                success: true,
                processedCount,
                failedCount,
                errors: errors.length > 0 ? errors : undefined,
                executionTimeMs: Date.now() - startTime,
            };

        } catch (error: any) {
            console.error("Withdrawal executer error:", error);

            // Log error
            await ctx.runMutation(internal.blockchainSync.logCronExecution, {
                jobName: "withdrawal-executer",
                status: "failed",
                message: `Error: ${error.message}`,
                executionTimeMs: Date.now() - startTime,
                details: error.stack,
            });

            throw error;
        }
    },
});

/**
 * Process a single withdrawal on the blockchain
 */
async function processWithdrawal(ctx: any, withdrawal: any, contract: any, ethers: any) {
    const withdrawalId = withdrawal._id;
    const userAddress = withdrawal.address;
    const amount = withdrawal.amount;

    console.log(`Processing withdrawal ${withdrawalId}: ${amount} USDT to ${userAddress}`);

    // Step C: Convert amount to Wei
    const amountWei = ethers.parseUnits(amount.toString(), CONFIG.USDT_DECIMALS);

    console.log(`Amount in Wei: ${amountWei.toString()}`);

    // Step D: Execute withdraw() on blockchain
    console.log(`Calling VaultUSDT.withdraw(${userAddress}, ${amountWei.toString()})...`);

    const tx = await contract.withdraw(userAddress, amountWei, {
        gasLimit: CONFIG.GAS_LIMIT,
    });

    console.log(`Transaction sent: ${tx.hash}`);

    // Step E: Wait for confirmation
    console.log(`Waiting for transaction confirmation...`);
    const receipt = await tx.wait();

    // Check transaction status
    if (receipt.status !== 1) {
        throw new Error(`Transaction failed on blockchain. Status: ${receipt.status}`);
    }

    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    // Step F: Mark as sent
    await ctx.runMutation(internal.wallet.markWithdrawalAsSent, {
        withdrawalId,
        txHash: tx.hash,
    });

    console.log(`Withdrawal ${withdrawalId} marked as SENT`);

    // Create notification for user
    await ctx.runMutation(internal.wallet.createWithdrawalNotification, {
        userId: withdrawal.userId,
        amount,
        txHash: tx.hash,
        address: userAddress,
    });
}

/**
 * Log withdrawal processing error
 */
async function logWithdrawalError(ctx: any, withdrawalId: string, errorMessage: string) {
    try {
        await ctx.runMutation(internal.wallet.logWithdrawalError, {
            withdrawalId,
            errorMessage,
        });
    } catch (e) {
        console.error("Failed to log withdrawal error:", e);
    }
}
