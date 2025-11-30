import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Test Helper Functions for Deposit Testing
 * These functions help create test data and simulate scenarios
 */

/**
 * Create a test user with optional initial balance
 */
export const createTestUser = mutation({
    args: {
        email: v.optional(v.string()),
        initialBalance: v.optional(v.number()),
        depositAddress: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const email = args.email || `test${now}@example.com`;

        const userId = await ctx.db.insert("users", {
            name: `Test User ${now}`,
            email,
            password: "$2a$10$test",
            referralCode: `TEST${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: args.initialBalance || 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
            depositAddress: args.depositAddress?.toLowerCase(),
            depositAddressLinkedAt: args.depositAddress ? now : undefined,
        });

        return {
            userId,
            email,
            initialBalance: args.initialBalance || 0,
            depositAddress: args.depositAddress,
        };
    },
});

/**
 * Create a test deposit log entry
 */
export const createTestDepositLog = mutation({
    args: {
        userId: v.optional(v.id("users")),
        txHash: v.string(),
        fromAddress: v.string(),
        toAddress: v.string(),
        amount: v.number(),
        network: v.string(),
    },
    handler: async (ctx, args) => {
        const amountRaw = (args.amount * 1000000).toString(); // 6 decimals

        const depositId = await ctx.db.insert("deposit_logs", {
            userId: args.userId || null,
            txHash: args.txHash,
            fromAddress: args.fromAddress.toLowerCase(),
            toAddress: args.toAddress.toLowerCase(),
            amount: args.amount,
            amountRaw,
            blockNumber: 12345,
            timestamp: Date.now(),
            status: "confirmed",
            network: args.network,
            contractAddress: args.toAddress.toLowerCase(),
        });

        return {
            depositId,
            txHash: args.txHash,
        };
    },
});

/**
 * Initialize test network configuration
 */
export const initializeTestNetwork = mutation({
    args: {
        network: v.string(),
        contractAddress: v.string(),
        rpcUrl: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if network already exists
        const existing = await ctx.db
            .query("blockchain_networks")
            .withIndex("by_network", (q) => q.eq("network", args.network))
            .first();

        if (existing) {
            // Update existing
            await ctx.db.patch(existing._id, {
                contractAddress: args.contractAddress.toLowerCase(),
                rpcUrl: args.rpcUrl,
                isActive: true,
                isPaused: false,
                updatedAt: Date.now(),
            });
            return { networkId: existing._id, updated: true };
        }

        // Create new
        const networkId = await ctx.db.insert("blockchain_networks", {
            network: args.network,
            name: args.network.charAt(0).toUpperCase() + args.network.slice(1),
            chainId: args.network === "polygon" ? 137 : args.network === "bsc" ? 56 : 42161,
            contractAddress: args.contractAddress.toLowerCase(),
            usdtAddress: "0x0000000000000000000000000000000000000000", // Placeholder
            rpcUrl: args.rpcUrl,
            isActive: true,
            isPaused: false,
            lowBalanceThreshold: 500,
            decimals: args.network === "bsc" ? 18 : 6,
            blockExplorer: `https://${args.network}scan.com`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return { networkId, updated: false };
    },
});

/**
 * Get user balance for testing
 */
export const getUserBalance = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("User not found");
        }

        return {
            userId: args.userId,
            balance: user.walletBalance || 0,
        };
    },
});

/**
 * Clean up test data (for cleanup after tests)
 */
export const cleanupTestData = mutation({
    args: {
        userId: v.optional(v.id("users")),
        txHash: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const deleted: string[] = [];

        if (args.userId) {
            // Delete user's transactions
            const transactions = await ctx.db
                .query("transactions")
                .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
                .collect();

            for (const tx of transactions) {
                await ctx.db.delete(tx._id);
                deleted.push(`transaction:${tx._id}`);
            }

            // Delete user's deposit logs
            const depositLogs = await ctx.db
                .query("deposit_logs")
                .filter((q) => q.eq(q.field("userId"), args.userId!))
                .collect();

            for (const log of depositLogs) {
                await ctx.db.delete(log._id);
                deleted.push(`deposit_log:${log._id}`);
            }

            // Delete user's notifications
            const notifications = await ctx.db
                .query("notifications")
                .filter((q) => q.eq(q.field("userId"), args.userId!))
                .collect();

            for (const notif of notifications) {
                await ctx.db.delete(notif._id);
                deleted.push(`notification:${notif._id}`);
            }

            // Delete user
            await ctx.db.delete(args.userId);
            deleted.push(`user:${args.userId}`);
        }

        if (args.txHash) {
            // Delete deposit log by txHash
            const depositLog = await ctx.db
                .query("deposit_logs")
                .withIndex("by_txHash", (q) => q.eq("txHash", args.txHash!))
                .first();

            if (depositLog) {
                await ctx.db.delete(depositLog._id);
                deleted.push(`deposit_log:${depositLog._id}`);
            }
        }

        return {
            success: true,
            deleted,
            count: deleted.length,
        };
    },
});

/**
 * Simulate blockchain deposit event data
 */
export const generateMockDepositEvent = mutation({
    args: {
        userAddress: v.string(),
        amount: v.number(),
        network: v.string(),
    },
    handler: async (ctx, args) => {
        const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substring(2)}`;
        const amountRaw = (args.amount * (args.network === "bsc" ? 1e18 : 1e6)).toString();
        const blockNumber = Math.floor(Math.random() * 1000000) + 100000;

        return {
            txHash,
            userAddress: args.userAddress.toLowerCase(),
            amount: args.amount,
            amountRaw,
            blockNumber,
            network: args.network,
            // Mock event structure similar to ethers event
            mockEvent: {
                transactionHash: txHash,
                blockNumber,
                args: {
                    user: args.userAddress,
                    amount: amountRaw,
                },
            },
        };
    },
});
