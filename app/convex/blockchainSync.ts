import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { createError, ErrorCodes } from "./errors";

/**
 * Initialize or get blockchain sync state
 */
export const initializeSyncState = mutation({
    args: {
        network: v.string(),
        contractAddress: v.string(),
        startBlock: v.number(),
    },
    handler: async (ctx, args) => {
        // Check if sync state already exists
        const existing = await ctx.db
            .query("blockchain_sync")
            .withIndex("by_network", (q) => q.eq("network", args.network))
            .filter((q) => q.eq(q.field("contractAddress"), args.contractAddress))
            .first();

        if (existing) {
            return {
                success: true,
                syncState: existing,
                message: "Sync state already exists",
            };
        }

        // Create new sync state
        const syncId = await ctx.db.insert("blockchain_sync", {
            network: args.network,
            contractAddress: args.contractAddress.toLowerCase(),
            lastCheckedBlock: args.startBlock,
            lastSyncedAt: Date.now(),
            status: "idle",
            eventsProcessed: 0,
        });

        const syncState = await ctx.db.get(syncId);

        return {
            success: true,
            syncState,
            message: "Sync state initialized",
        };
    },
});

/**
 * Get current sync state
 */
export const getSyncState = query({
    args: {
        network: v.string(),
        contractAddress: v.string(),
    },
    handler: async (ctx, args) => {
        const syncState = await ctx.db
            .query("blockchain_sync")
            .withIndex("by_network", (q) => q.eq("network", args.network))
            .filter((q) => q.eq(q.field("contractAddress"), args.contractAddress.toLowerCase()))
            .first();

        return syncState || null;
    },
});

/**
 * Update sync state after processing events
 */
export const updateSyncState = mutation({
    args: {
        network: v.string(),
        contractAddress: v.string(),
        lastCheckedBlock: v.number(),
        eventsProcessed: v.optional(v.number()),
        status: v.optional(v.union(v.literal("syncing"), v.literal("idle"), v.literal("error"))),
        errorMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const syncState = await ctx.db
            .query("blockchain_sync")
            .withIndex("by_network", (q) => q.eq("network", args.network))
            .filter((q) => q.eq(q.field("contractAddress"), args.contractAddress.toLowerCase()))
            .first();

        if (!syncState) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Sync state not found. Initialize first.");
        }

        const updates: any = {
            lastCheckedBlock: args.lastCheckedBlock,
            lastSyncedAt: Date.now(),
        };

        if (args.status) {
            updates.status = args.status;
        }

        if (args.errorMessage !== undefined) {
            updates.errorMessage = args.errorMessage;
        }

        if (args.eventsProcessed !== undefined) {
            updates.eventsProcessed = (syncState.eventsProcessed || 0) + args.eventsProcessed;
        }

        await ctx.db.patch(syncState._id, updates);

        return {
            success: true,
            message: "Sync state updated",
        };
    },
});

/**
 * Log a detected deposit
 */
export const logDeposit = mutation({
    args: {
        userId: v.id("users"),
        txHash: v.string(),
        fromAddress: v.string(),
        toAddress: v.string(),
        amount: v.number(),
        amountRaw: v.string(),
        blockNumber: v.number(),
        network: v.string(),
        contractAddress: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if deposit already logged (prevent duplicates)
        const existing = await ctx.db
            .query("deposit_logs")
            .withIndex("by_txHash", (q) => q.eq("txHash", args.txHash))
            .first();

        if (existing) {
            return {
                success: false,
                duplicate: true,
                message: "Deposit already logged",
            };
        }

        // Log the deposit
        const depositId = await ctx.db.insert("deposit_logs", {
            userId: args.userId,
            txHash: args.txHash,
            fromAddress: args.fromAddress.toLowerCase(),
            toAddress: args.toAddress.toLowerCase(),
            amount: args.amount,
            amountRaw: args.amountRaw,
            blockNumber: args.blockNumber,
            timestamp: Date.now(),
            status: "confirmed",
            network: args.network,
            contractAddress: args.contractAddress.toLowerCase(),
        });

        // Update user's wallet balance
        const user = await ctx.db.get(args.userId);
        if (user) {
            await ctx.db.patch(args.userId, {
                walletBalance: user.walletBalance + args.amount,
            });

            // Create transaction record
            await ctx.db.insert("transactions", {
                userId: args.userId,
                amount: args.amount,
                type: "deposit",
                referenceId: args.txHash,
                description: `Blockchain deposit from ${args.fromAddress.substring(0, 10)}...`,
                timestamp: Date.now(),
                status: "approved",
            });

            // Create notification
            await ctx.db.insert("notifications", {
                userId: args.userId,
                type: "earnings",
                title: "Deposit Received",
                message: `You received $${args.amount.toFixed(2)} USDT from blockchain deposit`,
                data: {
                    txHash: args.txHash,
                    amount: args.amount,
                    fromAddress: args.fromAddress,
                },
                read: false,
                createdAt: Date.now(),
                icon: "wallet",
            });
        }

        return {
            success: true,
            duplicate: false,
            depositId,
            message: "Deposit logged and credited",
        };
    },
});

/**
 * Get all deposit logs (admin)
 */
export const getAllDepositLogs = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 100;

        const deposits = await ctx.db
            .query("deposit_logs")
            .order("desc")
            .take(limit);

        // Join with user info
        return await Promise.all(deposits.map(async (deposit) => {
            const user = await ctx.db.get(deposit.userId);
            return {
                ...deposit,
                userName: user?.name,
                userEmail: user?.email,
            };
        }));
    },
});

/**
 * Get deposit logs by block range (for debugging)
 */
export const getDepositsByBlockRange = query({
    args: {
        startBlock: v.number(),
        endBlock: v.number(),
    },
    handler: async (ctx, args) => {
        const deposits = await ctx.db
            .query("deposit_logs")
            .withIndex("by_blockNumber")
            .filter((q) =>
                q.and(
                    q.gte(q.field("blockNumber"), args.startBlock),
                    q.lte(q.field("blockNumber"), args.endBlock)
                )
            )
            .collect();

        return deposits;
    },
});

/**
 * Get deposit by transaction hash (internal - used by deposit listener)
 */
export const getDepositByTxHash = query({
    args: { txHash: v.string() },
    handler: async (ctx, args) => {
        const deposit = await ctx.db
            .query("deposit_logs")
            .withIndex("by_txHash", (q) => q.eq("txHash", args.txHash))
            .first();

        return deposit || null;
    },
});

/**
 * Log cron job execution
 */
export const logCronExecution = mutation({
    args: {
        jobName: v.string(),
        status: v.union(v.literal("success"), v.literal("failed")),
        message: v.string(),
        executionTimeMs: v.optional(v.number()),
        details: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("cron_logs", {
            jobName: args.jobName,
            status: args.status,
            message: args.message,
            timestamp: Date.now(),
            executionTimeMs: args.executionTimeMs,
            details: args.details,
        });
    },
});

