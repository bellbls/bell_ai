import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Multi-Network Deposit Listener
 * Monitors all active blockchain networks for DepositMade events
 * Runs as a scheduled cron job every 60 seconds
 * 
 * Supports: Polygon, BSC, Arbitrum
 */

/**
 * VaultForwarder Contract ABI (minimal - only DepositMade event)
 */
const VAULT_ABI = [
    "event DepositMade(address indexed user, uint256 amount, uint256 toHotWallet, uint256 toColdWallet)"
];

/**
 * Main deposit listener function - checks all active networks
 */
export const checkForDeposits = internalAction({
    args: {},
    handler: async (ctx) => {
        const startTime = Date.now();
        let totalEventsProcessed = 0;
        const errors: string[] = [];

        try {
            // Get all active networks
            const networks = await ctx.runQuery(internal.networkManagement.getActiveNetworks, {});

            if (!networks || networks.length === 0) {
                console.log("No active networks to monitor");
                return {
                    success: true,
                    message: "No active networks",
                    eventsProcessed: 0,
                };
            }

            console.log(`Monitoring ${networks.length} active networks for deposits...`);

            // Check each network
            for (const network of networks) {
                try {
                    if (network.isPaused) {
                        console.log(`Skipping ${network.name}: Deposits paused`);
                        continue;
                    }

                    if (!network.contractAddress || network.contractAddress === "") {
                        console.log(`Skipping ${network.name}: No contract address configured`);
                        continue;
                    }

                    const eventsProcessed = await checkNetworkDeposits(ctx, network);
                    totalEventsProcessed += eventsProcessed;

                } catch (error: any) {
                    console.error(`Error checking ${network.name}:`, error.message);
                    errors.push(`${network.name}: ${error.message}`);

                    // Create error alert
                    await ctx.runMutation(internal.adminAlerts.createAlert, {
                        type: "sync_error",
                        network: network.network,
                        severity: "warning",
                        title: `Deposit Sync Failed: ${network.name}`,
                        message: `Failed to sync deposits on ${network.name}: ${error.message}`,
                        data: { error: error.message },
                    });
                }
            }

            // Log cron execution
            await ctx.runMutation(internal.blockchainSync.logCronExecution, {
                jobName: "multi-network-deposit-listener",
                status: errors.length > 0 ? "failed" : "success",
                message: `Processed ${totalEventsProcessed} deposits across ${networks.length} networks`,
                executionTimeMs: Date.now() - startTime,
                details: errors.length > 0 ? JSON.stringify({ errors }) : undefined,
            });

            return {
                success: true,
                eventsProcessed: totalEventsProcessed,
                networksChecked: networks.length,
                errors: errors.length > 0 ? errors : undefined,
                executionTimeMs: Date.now() - startTime,
            };

        } catch (error: any) {
            console.error("Multi-network deposit listener error:", error);

            // Log error
            await ctx.runMutation(internal.blockchainSync.logCronExecution, {
                jobName: "multi-network-deposit-listener",
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
 * Check deposits for a single network
 */
async function checkNetworkDeposits(ctx: any, network: any): Promise<number> {
    console.log(`\n📡 Checking ${network.name} for deposits...`);

    // Get sync state for this network
    const syncState = await ctx.runQuery(internal.blockchainSync.getSyncState, {
        network: network.network,
        contractAddress: network.contractAddress,
    });

    // Initialize ethers
    const ethers = await import("ethers");
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    const contract = new ethers.Contract(network.contractAddress, VAULT_ABI, provider);

    // Determine block range to query
    let fromBlock: number;
    const currentBlock = await provider.getBlockNumber();

    if (!syncState) {
        // First time - start from 100 blocks ago
        fromBlock = Math.max(0, currentBlock - 100);

        await ctx.runMutation(internal.blockchainSync.initializeSyncState, {
            network: network.network,
            contractAddress: network.contractAddress,
            startBlock: fromBlock,
        });

        console.log(`Initialized ${network.name} sync state at block ${fromBlock}`);
    } else {
        fromBlock = syncState.lastCheckedBlock + 1;
    }

    const toBlock = currentBlock;
    const blocksToQuery = toBlock - fromBlock;

    if (blocksToQuery <= 0) {
        console.log(`${network.name}: Already up to date (block ${currentBlock})`);
        return 0;
    }

    console.log(`${network.name}: Querying blocks ${fromBlock} to ${toBlock} (${blocksToQuery} blocks)`);

    // Update status to syncing
    await ctx.runMutation(internal.blockchainSync.updateSyncState, {
        network: network.network,
        contractAddress: network.contractAddress,
        lastCheckedBlock: fromBlock - 1, // Keep existing block count while syncing
        status: "syncing",
    });

    // Query for DepositMade events
    const filter = contract.filters.DepositMade();
    const events = await contract.queryFilter(filter, fromBlock, toBlock);

    console.log(`${network.name}: Found ${events.length} deposit events`);

    let eventsProcessed = 0;

    // Process each event
    for (const event of events) {
        try {
            await processDepositEvent(ctx, event, network);
            eventsProcessed++;
        } catch (error: any) {
            console.error(`Error processing event on ${network.name}:`, error.message);
            // Continue processing other events
        }
    }

    // Update sync state
    await ctx.runMutation(internal.blockchainSync.updateSyncState, {
        network: network.network,
        contractAddress: network.contractAddress,
        lastCheckedBlock: toBlock,
        status: "idle",
        eventsProcessed: (syncState?.eventsProcessed || 0) + eventsProcessed,
    });

    console.log(`${network.name}: Processed ${eventsProcessed} deposits`);

    return eventsProcessed;
}

/**
 * Process a single deposit event
 */
async function processDepositEvent(ctx: any, event: any, network: any) {
    const txHash = event.transactionHash;
    const userAddress = event.args.user;
    const amountWei = event.args.amount;
    const blockNumber = event.blockNumber;

    // Check if already processed
    const existing = await ctx.runQuery(internal.blockchainSync.getDepositByTxHash, {
        txHash,
    });

    if (existing) {
        console.log(`Skipping duplicate: ${txHash}`);
        return;
    }

    // Convert amount from Wei to decimal
    const ethers = await import("ethers");
    const amountDecimal = Number(ethers.formatUnits(amountWei, network.decimals));

    console.log(`New deposit: ${userAddress} → $${amountDecimal.toFixed(2)} (${network.name})`);

    // Get user by deposit address
    const user = await ctx.runQuery(internal.depositAddress.getUserByDepositAddress, {
        address: userAddress.toLowerCase(),
    });

    if (!user) {
        console.log(`⚠️ Unlinked deposit: ${userAddress} (${network.name})`);

        // Log as unlinked deposit
        await ctx.runMutation(internal.blockchainSync.logDeposit, {
            userId: null,
            txHash,
            fromAddress: userAddress.toLowerCase(),
            toAddress: network.contractAddress.toLowerCase(),
            amount: amountDecimal,
            amountRaw: amountWei.toString(),
            blockNumber,
            network: network.network,
            contractAddress: network.contractAddress,
        });

        // Create alert for manual review
        await ctx.runMutation(internal.adminAlerts.createAlert, {
            type: "network_error",
            network: network.network,
            severity: "warning",
            title: `Unlinked Deposit: ${network.name}`,
            message: `Deposit of $${amountDecimal.toFixed(2)} from ${userAddress.substring(0, 10)}... has no linked user`,
            data: {
                txHash,
                amount: amountDecimal,
                address: userAddress,
                network: network.network,
            },
        });

        return;
    }

    // Credit user and log deposit
    await ctx.runMutation(internal.blockchainSync.logDeposit, {
        userId: user._id,
        txHash,
        fromAddress: userAddress.toLowerCase(),
        toAddress: network.contractAddress.toLowerCase(),
        amount: amountDecimal,
        amountRaw: amountWei.toString(),
        blockNumber,
        network: network.network,
        contractAddress: network.contractAddress,
    });

    console.log(`✅ Credited ${user.email}: $${amountDecimal.toFixed(2)} (${network.name})`);
}
