import { internalAction, query, action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

/**
 * Contract ABI for reading contract state
 */
const VAULT_ABI = [
    "function owner() view returns (address)",
    "function paused() view returns (bool)",
    "function getBalance() view returns (uint256)",
    "function lowBalanceThreshold() view returns (uint256)",
    "function coldWallet() view returns (address)",
    "function usdt() view returns (address)",
    "function HOT_WALLET_BPS() view returns (uint256)",
    "event DepositMade(address indexed user, uint256 amount, uint256 toHotWallet, uint256 toColdWallet)",
    "event WithdrawalMade(address indexed user, uint256 amount)",
    "event FundsForwarded(address indexed to, uint256 amount)",
    "event LowBalanceAlert(uint256 currentBalance, uint256 threshold)",
    "event DepositsPaused(address indexed by)",
    "event DepositsResumed(address indexed by)",
];

/**
 * Get contract information from blockchain
 */
export const getContractInfo = internalAction({
    args: {
        network: v.string(),
        contractAddress: v.string(),
        rpcUrl: v.string(),
        decimals: v.number(),
    },
    handler: async (ctx, args) => {
        try {
            const ethers = await import("ethers");
            const provider = new ethers.JsonRpcProvider(args.rpcUrl);
            const contract = new ethers.Contract(args.contractAddress, VAULT_ABI, provider);

            // Read contract state
            const [owner, paused, balance, threshold, coldWallet, usdtAddress, hotWalletBps] = await Promise.all([
                contract.owner(),
                contract.paused(),
                contract.getBalance(),
                contract.lowBalanceThreshold(),
                contract.coldWallet(),
                contract.usdt(),
                contract.HOT_WALLET_BPS(),
            ]);

            // Convert balance and threshold to USD
            const balanceUsd = parseFloat(ethers.formatUnits(balance, args.decimals));
            const thresholdUsd = parseFloat(ethers.formatUnits(threshold, args.decimals));
            const hotWalletPercentage = parseFloat(hotWalletBps.toString()) / 100; // Convert basis points to percentage

            return {
                success: true,
                data: {
                    owner: owner.toLowerCase(),
                    paused,
                    balance: balanceUsd,
                    threshold: thresholdUsd,
                    coldWallet: coldWallet.toLowerCase(),
                    usdtAddress: usdtAddress.toLowerCase(),
                    hotWalletPercentage,
                },
            };
        } catch (error: any) {
            console.error(`Error fetching contract info for ${args.network}:`, error);
            return {
                success: false,
                error: error.message || "Failed to fetch contract info",
            };
        }
    },
});

/**
 * Get recent contract events
 */
export const getRecentEvents = internalAction({
    args: {
        network: v.string(),
        contractAddress: v.string(),
        rpcUrl: v.string(),
        limit: v.optional(v.number()),
        decimals: v.number(),
    },
    handler: async (ctx, args) => {
        try {
            const ethers = await import("ethers");
            const provider = new ethers.JsonRpcProvider(args.rpcUrl);
            const contract = new ethers.Contract(args.contractAddress, VAULT_ABI, provider);

            const limit = args.limit || 50;
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks

            // Query all event types
            const [depositEvents, withdrawalEvents, forwardedEvents, pauseEvents, resumeEvents, alertEvents] = await Promise.all([
                contract.queryFilter(contract.filters.DepositMade(), fromBlock, currentBlock),
                contract.queryFilter(contract.filters.WithdrawalMade(), fromBlock, currentBlock),
                contract.queryFilter(contract.filters.FundsForwarded(), fromBlock, currentBlock),
                contract.queryFilter(contract.filters.DepositsPaused(), fromBlock, currentBlock),
                contract.queryFilter(contract.filters.DepositsResumed(), fromBlock, currentBlock),
                contract.queryFilter(contract.filters.LowBalanceAlert(), fromBlock, currentBlock),
            ]);

            // Combine and sort all events by block number
            const allEvents: any[] = [];

            depositEvents.forEach((event: any) => {
                allEvents.push({
                    type: "deposit",
                    user: event.args.user.toLowerCase(),
                    amount: parseFloat(ethers.formatUnits(event.args.amount, args.decimals)),
                    toHotWallet: parseFloat(ethers.formatUnits(event.args.toHotWallet, args.decimals)),
                    toColdWallet: parseFloat(ethers.formatUnits(event.args.toColdWallet, args.decimals)),
                    txHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    timestamp: event.blockNumber, // Will be converted later if needed
                });
            });

            withdrawalEvents.forEach((event: any) => {
                allEvents.push({
                    type: "withdrawal",
                    user: event.args.user.toLowerCase(),
                    amount: parseFloat(ethers.formatUnits(event.args.amount, args.decimals)),
                    txHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    timestamp: event.blockNumber,
                });
            });

            forwardedEvents.forEach((event: any) => {
                allEvents.push({
                    type: "forwarded",
                    to: event.args.to.toLowerCase(),
                    amount: parseFloat(ethers.formatUnits(event.args.amount, args.decimals)),
                    txHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    timestamp: event.blockNumber,
                });
            });

            pauseEvents.forEach((event: any) => {
                allEvents.push({
                    type: "paused",
                    by: event.args.by.toLowerCase(),
                    txHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    timestamp: event.blockNumber,
                });
            });

            resumeEvents.forEach((event: any) => {
                allEvents.push({
                    type: "resumed",
                    by: event.args.by.toLowerCase(),
                    txHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    timestamp: event.blockNumber,
                });
            });

            alertEvents.forEach((event: any) => {
                allEvents.push({
                    type: "low_balance",
                    currentBalance: parseFloat(ethers.formatUnits(event.args.currentBalance, args.decimals)),
                    threshold: parseFloat(ethers.formatUnits(event.args.threshold, args.decimals)),
                    txHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    timestamp: event.blockNumber,
                });
            });

            // Sort by block number (newest first) and limit
            allEvents.sort((a, b) => b.blockNumber - a.blockNumber);
            const recentEvents = allEvents.slice(0, limit);

            // Get block timestamps for recent events
            const blockNumbers = [...new Set(recentEvents.map((e) => e.blockNumber))];
            const blockPromises = blockNumbers.map((bn) => provider.getBlock(bn));
            const blocks = await Promise.all(blockPromises);
            const blockMap = new Map(blocks.filter((b): b is NonNullable<typeof b> => b !== null).map((b) => [b.number, b.timestamp * 1000]));

            // Add timestamps to events
            recentEvents.forEach((event) => {
                event.timestamp = blockMap.get(event.blockNumber) || Date.now();
            });

            return {
                success: true,
                events: recentEvents,
                total: allEvents.length,
            };
        } catch (error: any) {
            console.error(`Error fetching events for ${args.network}:`, error);
            return {
                success: false,
                error: error.message || "Failed to fetch events",
                events: [],
            };
        }
    },
});

/**
 * Get token metrics (aggregated from database)
 */
export const getTokenMetrics = query({
    args: {
        network: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Get all deposits
        const allDeposits = await ctx.db
            .query("deposit_logs")
            .collect();

        // Filter by network if specified
        const deposits = args.network
            ? allDeposits.filter((d) => d.network === args.network)
            : allDeposits;

        // Calculate metrics
        const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
        const depositCount = deposits.length;

        // Get unique users with deposits
        const usersWithDeposits = new Set(deposits.map((d) => d.userId).filter((id) => id !== null));
        const activeUsers = usersWithDeposits.size;

        // Get top depositors
        const depositorMap = new Map<string, number>();
        deposits.forEach((d) => {
            if (d.fromAddress) {
                const current = depositorMap.get(d.fromAddress) || 0;
                depositorMap.set(d.fromAddress, current + d.amount);
            }
        });

        const topDepositors = Array.from(depositorMap.entries())
            .map(([address, total]) => ({ address, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // Get withdrawals
        const withdrawals = await ctx.db
            .query("withdrawals")
            .filter((q) => q.eq(q.field("status"), "completed"))
            .collect();

        const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);

        // Get total staked (from stakes table)
        const stakes = await ctx.db
            .query("stakes")
            .collect();

        const totalStaked = stakes.reduce((sum, s) => sum + s.amount, 0);

        return {
            totalDeposits,
            depositCount,
            activeUsers,
            totalWithdrawals,
            totalStaked,
            topDepositors,
        };
    },
});

/**
 * Frontend-accessible query to get contract info for a network
 */
export const getContractInfoForNetwork = action({
    args: {
        network: v.string(),
    },
    handler: async (ctx, args): Promise<any> => {
        // Get network config
        const networkDoc = await ctx.runQuery((api as any).networkManagement.getNetwork, {
            network: args.network,
        });

        if (!networkDoc || !networkDoc.contractAddress || !networkDoc.isActive) {
            return {
                success: false,
                error: "Network not found or not active",
            };
        }

        // Fetch contract info from blockchain
        return await ctx.runAction((internal as any).contractInfo.getContractInfo, {
            network: args.network,
            contractAddress: networkDoc.contractAddress,
            rpcUrl: networkDoc.rpcUrl,
            decimals: networkDoc.decimals,
        });
    },
});

/**
 * Frontend-accessible query to get recent events for a network
 */
export const getRecentEventsForNetwork = action({
    args: {
        network: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Get network config
        const networkDoc = await ctx.runQuery(internal.networkManagement.getNetwork, {
            network: args.network,
        });

        if (!networkDoc || !networkDoc.contractAddress || !networkDoc.isActive) {
            return {
                success: false,
                error: "Network not found or not active",
                events: [],
            };
        }

        // Fetch events from blockchain
        return await ctx.runAction(internal.contractInfo.getRecentEvents, {
            network: args.network,
            contractAddress: networkDoc.contractAddress,
            rpcUrl: networkDoc.rpcUrl,
            limit: args.limit || 50,
            decimals: networkDoc.decimals,
        });
    },
});

