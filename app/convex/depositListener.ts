import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Deposit Listener - Monitors blockchain for DepositMade events
 * Runs as a scheduled cron job every 60 seconds
 * 
 * Configuration (set via environment variables or configs table):
 * - VAULT_CONTRACT_ADDRESS: Address of deployed VaultUSDT contract
 * - VAULT_NETWORK_RPC_URL: RPC endpoint (Infura/Alchemy)
 * - VAULT_NETWORK_NAME: Network identifier (ethereum/polygon/bsc)
 * - USDT_DECIMALS: Token decimals (typically 6 for USDT)
 */

// Configuration - TODO: Move to environment variables or configs table
const CONFIG = {
    NETWORK: process.env.VAULT_NETWORK_NAME || "ethereum",
    CONTRACT_ADDRESS: process.env.VAULT_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
    RPC_URL: process.env.VAULT_NETWORK_RPC_URL || "",
    USDT_DECIMALS: parseInt(process.env.USDT_DECIMALS || "6"),
    BLOCKS_PER_QUERY: 1000,  // Query 1000 blocks at a time
};

/**
 * VaultUSDT Contract ABI (minimal - only DepositMade event)
 */
const VAULT_ABI = [
    "event DepositMade(address indexed user, uint256 amount)"
];

/**
 * Main deposit listener function
 * This is called by the cron job
 */
export const checkForDeposits = internalAction({
    args: {},
    handler: async (ctx) => {
        const startTime = Date.now();
        let eventsProcessed = 0;
        let errors: string[] = [];

        try {
            // Validate configuration
            if (!CONFIG.RPC_URL || CONFIG.CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
                throw new Error("Blockchain configuration not set. Please configure VAULT_CONTRACT_ADDRESS and VAULT_NETWORK_RPC_URL");
            }

            // Step A: Get sync state
            const syncState = await ctx.runQuery(internal.blockchainSync.getSyncState, {
                network: CONFIG.NETWORK,
                contractAddress: CONFIG.CONTRACT_ADDRESS,
            });

            if (!syncState) {
                // Initialize sync state if it doesn't exist
                // Start from current block - 100 (to catch recent deposits)
                const ethers = await import("ethers");
                const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
                const currentBlock = await provider.getBlockNumber();
                const startBlock = Math.max(0, currentBlock - 100);

                await ctx.runMutation(internal.blockchainSync.initializeSyncState, {
                    network: CONFIG.NETWORK,
                    contractAddress: CONFIG.CONTRACT_ADDRESS,
                    startBlock,
                });

                console.log(`Initialized sync state at block ${startBlock}`);
                return {
                    success: true,
                    message: "Sync state initialized",
                    eventsProcessed: 0,
                };
            }

            // Update status to syncing
            await ctx.runMutation(internal.blockchainSync.updateSyncState, {
                network: CONFIG.NETWORK,
                contractAddress: CONFIG.CONTRACT_ADDRESS,
                lastCheckedBlock: syncState.lastCheckedBlock,
                status: "syncing",
            });

            // Step B: Query blockchain for events
            const ethers = await import("ethers");
            const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
            const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, VAULT_ABI, provider);

            const currentBlock = await provider.getBlockNumber();
            const fromBlock = syncState.lastCheckedBlock + 1;
            const toBlock = Math.min(fromBlock + CONFIG.BLOCKS_PER_QUERY, currentBlock);

            if (fromBlock > currentBlock) {
                // Already up to date
                await ctx.runMutation(internal.blockchainSync.updateSyncState, {
                    network: CONFIG.NETWORK,
                    contractAddress: CONFIG.CONTRACT_ADDRESS,
                    lastCheckedBlock: syncState.lastCheckedBlock,
                    status: "idle",
                });

                return {
                    success: true,
                    message: "Already up to date",
                    eventsProcessed: 0,
                    currentBlock,
                    lastCheckedBlock: syncState.lastCheckedBlock,
                };
            }

            console.log(`Querying blocks ${fromBlock} to ${toBlock} (current: ${currentBlock})`);

            // Query for DepositMade events
            const filter = contract.filters.DepositMade();
            const events = await contract.queryFilter(filter, fromBlock, toBlock);

            console.log(`Found ${events.length} deposit events`);

            // Step C-I: Process each event
            for (const event of events) {
                try {
                    await processDepositEvent(ctx, event, provider);
                    eventsProcessed++;
                } catch (error: any) {
                    console.error(`Error processing event ${event.transactionHash}:`, error);
                    errors.push(`TX ${event.transactionHash}: ${error.message}`);
                }
            }

            // Update sync state with new block
            await ctx.runMutation(internal.blockchainSync.updateSyncState, {
                network: CONFIG.NETWORK,
                contractAddress: CONFIG.CONTRACT_ADDRESS,
                lastCheckedBlock: toBlock,
                eventsProcessed,
                status: errors.length > 0 ? "error" : "idle",
                errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
            });

            // Log cron execution
            await ctx.runMutation(internal.blockchainSync.logCronExecution, {
                jobName: "deposit-listener",
                status: errors.length > 0 ? "failed" : "success",
                message: `Processed ${eventsProcessed} deposits from blocks ${fromBlock}-${toBlock}`,
                executionTimeMs: Date.now() - startTime,
                details: errors.length > 0 ? JSON.stringify({ errors }) : undefined,
            });

            return {
                success: true,
                eventsProcessed,
                fromBlock,
                toBlock,
                currentBlock,
                errors: errors.length > 0 ? errors : undefined,
                executionTimeMs: Date.now() - startTime,
            };

        } catch (error: any) {
            console.error("Deposit listener error:", error);

            // Log error
            await ctx.runMutation(internal.blockchainSync.logCronExecution, {
                jobName: "deposit-listener",
                status: "failed",
                message: `Error: ${error.message}`,
                executionTimeMs: Date.now() - startTime,
                details: error.stack,
            });

            // Update sync state to error
            try {
                await ctx.runMutation(internal.blockchainSync.updateSyncState, {
                    network: CONFIG.NETWORK,
                    contractAddress: CONFIG.CONTRACT_ADDRESS,
                    lastCheckedBlock: 0,  // Will be fetched from DB
                    status: "error",
                    errorMessage: error.message,
                });
            } catch (e) {
                // Ignore if sync state doesn't exist yet
            }

            throw error;
        }
    },
});

/**
 * Process a single DepositMade event
 */
async function processDepositEvent(ctx: any, event: any, provider: any) {
    const ethers = await import("ethers");

    // Extract event data
    const userAddress = event.args.user.toLowerCase();
    const amountRaw = event.args.amount.toString();
    const txHash = event.transactionHash;
    const blockNumber = event.blockNumber;

    console.log(`Processing deposit: ${txHash} - User: ${userAddress}, Amount: ${amountRaw}`);

    // Step D: Check uniqueness (prevent double-crediting)
    const existingDeposit = await ctx.runQuery(internal.blockchainSync.getDepositByTxHash, {
        txHash,
    });

    if (existingDeposit) {
        console.log(`Duplicate deposit detected: ${txHash} - SKIPPING`);
        return;
    }

    // Step E: Find user by deposit address
    const user = await ctx.runQuery(internal.depositAddress.getUserByDepositAddress, {
        address: userAddress,
    });

    if (!user) {
        console.log(`Unlinked deposit: ${txHash} - Address ${userAddress} not linked to any user - SKIPPING`);
        // TODO: Log unlinked deposits for manual review
        return;
    }

    // Step F: Convert amount from Wei to USDT
    const amount = parseFloat(ethers.formatUnits(amountRaw, CONFIG.USDT_DECIMALS));

    console.log(`Crediting user ${user._id} with $${amount} USDT`);

    // Steps G & H: Update database and log transaction
    const result = await ctx.runMutation(internal.blockchainSync.logDeposit, {
        userId: user._id,
        txHash,
        fromAddress: userAddress,
        toAddress: CONFIG.CONTRACT_ADDRESS.toLowerCase(),
        amount,
        amountRaw,
        blockNumber,
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS.toLowerCase(),
    });

    if (result.success) {
        console.log(`Successfully processed deposit: ${txHash}`);
    } else if (result.duplicate) {
        console.log(`Duplicate deposit (race condition): ${txHash}`);
    }
}
