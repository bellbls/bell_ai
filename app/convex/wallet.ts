import { mutation, query, internalMutation } from "./_generated/server";
import { v, Id } from "convex/values";
import { createError, ErrorCodes, isValidAmount } from "./errors";
import { internal } from "./_generated/api";

// ==================== DEPOSIT ====================

export const deposit = mutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
        txHash: v.optional(v.string()),
        method: v.optional(v.string()), // e.g., "crypto", "bank_transfer", "card"
    },
    handler: async (ctx, args) => {
        // Validate amount
        if (!isValidAmount(args.amount, 0)) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'Deposit amount must be greater than 0');
        }

        // Get user
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw createError(ErrorCodes.USER_NOT_FOUND);
        }

        // Update user balance
        const newBalance = (user.walletBalance || 0) + args.amount;
        await ctx.db.patch(args.userId, {
            walletBalance: newBalance,
        });

        // Log transaction
        await ctx.db.insert("transactions", {
            userId: args.userId,
            amount: args.amount,
            type: "deposit",
            description: `Deposit${args.method ? ` via ${args.method}` : ''}${args.txHash ? ` (${args.txHash.substring(0, 10)}...)` : ''}`,
            timestamp: Date.now(),
        });

        return {
            success: true,
            newBalance,
            message: `Successfully deposited $${args.amount.toFixed(2)}`,
        };
    },
});

// ==================== WITHDRAWAL ====================


export const requestWithdrawal = mutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
        address: v.string(),
    },
    handler: async (ctx, args) => {
        // Validate amount
        if (!isValidAmount(args.amount, 0)) {
            throw createError(ErrorCodes.INVALID_WITHDRAWAL_AMOUNT, 'Withdrawal amount must be greater than 0');
        }

        // Validate address
        if (!args.address || args.address.trim().length < 10) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'Please enter a valid wallet address');
        }

        // Check Address Book
        const savedWallet = await ctx.db
            .query("saved_wallets")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("address"), args.address))
            .unique();

        if (!savedWallet) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'Address not found in your address book');
        }

        const now = Date.now();
        if (savedWallet.status === "locked" && now < savedWallet.unlockedAt) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'This address is currently locked for security. Please try again later.');
        }

        // Check minimum withdrawal amount
        const minWithdrawalConfig = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "min_withdrawal_amount"))
            .first();

        const minWithdrawal = minWithdrawalConfig?.value ?? 50;
        if (args.amount < minWithdrawal) {
            throw createError(
                ErrorCodes.VALIDATION_ERROR,
                `Minimum withdrawal amount is $${minWithdrawal}`
            );
        }

        // Get user
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw createError(ErrorCodes.USER_NOT_FOUND);
        }

        // Check BLS system status
        const blsConfig = await ctx.db.query("blsConfig").first();
        const isBLSEnabled = blsConfig?.isEnabled || false;

        if (isBLSEnabled) {
            // When BLS is enabled, withdrawals should only come from swapped BLS
            // Check if user has sufficient USDT from BLS swaps
            const swappedUSDT = await getUserSwappedUSDTBalance(ctx, args.userId);
            
            if (swappedUSDT < args.amount) {
                throw createError(
                    ErrorCodes.INSUFFICIENT_BALANCE,
                    `Insufficient swapped BLS balance. You have $${swappedUSDT.toFixed(2)} available to withdraw. Please swap your BLS to USDT first.`
                );
            }
        }

        // Check balance
        if ((user.walletBalance || 0) < args.amount) {
            throw createError(ErrorCodes.INSUFFICIENT_BALANCE);
        }

        // Deduct balance immediately to prevent double spend
        await ctx.db.patch(args.userId, {
            walletBalance: user.walletBalance - args.amount,
        });

        // Calculate Fee
        const feeConfig = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "withdrawal_fee_percentage"))
            .first();

        const feePercentage = feeConfig?.value ?? 0;
        const fee = args.amount * (feePercentage / 100);
        const netAmount = args.amount - fee;

        // Create Withdrawal Record
        const withdrawalId = await ctx.db.insert("withdrawals", {
            userId: args.userId,
            amount: args.amount,
            fee: fee,
            netAmount: netAmount,
            address: args.address.trim(),
            status: "pending",
            requestDate: Date.now(),
            withdrawalSource: isBLSEnabled ? "bls_swapped" : "direct_usdt", // Track withdrawal source for audit
        });

        // Log Transaction
        await ctx.db.insert("transactions", {
            userId: args.userId,
            amount: -args.amount,
            type: "withdrawal",
            referenceId: withdrawalId,
            description: `Withdrawal request to ${args.address.substring(0, 10)}...`,
            timestamp: Date.now(),
            status: "pending",
        });

        return {
            success: true,
            withdrawalId,
            message: `Withdrawal request submitted for $${args.amount.toFixed(2)}`,
        };
    },
});

export const approveWithdrawal = mutation({
    args: {
        withdrawalId: v.id("withdrawals"),
        txHash: v.optional(v.string()),
        adminId: v.optional(v.id("users"))  // Admin who approved the withdrawal
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);

        if (!withdrawal) {
            throw createError(ErrorCodes.WITHDRAWAL_NOT_FOUND);
        }

        if (withdrawal.status !== "pending") {
            throw createError(ErrorCodes.WITHDRAWAL_ALREADY_PROCESSED);
        }

        await ctx.db.patch(args.withdrawalId, {
            status: "approved",
            processedDate: Date.now(),
            adminId: args.adminId,  // Track which admin approved
            txHash: args.txHash,
        });

        // Update related transaction status
        const tx = await ctx.db
            .query("transactions")
            .withIndex("by_type", (q) => q.eq("type", "withdrawal"))
            .filter((q) => q.eq(q.field("referenceId"), args.withdrawalId))
            .first();

        if (tx) {
            await ctx.db.patch(tx._id, { status: "approved" });
        }
    },
});

export const rejectWithdrawal = mutation({
    args: {
        withdrawalId: v.id("withdrawals"),
        adminId: v.optional(v.id("users"))  // Admin who rejected the withdrawal
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);

        if (!withdrawal) {
            throw createError(ErrorCodes.WITHDRAWAL_NOT_FOUND);
        }

        if (withdrawal.status !== "pending") {
            throw createError(ErrorCodes.WITHDRAWAL_ALREADY_PROCESSED);
        }

        // Refund User
        const user = await ctx.db.get(withdrawal.userId);
        if (user) {
            await ctx.db.patch(user._id, {
                walletBalance: user.walletBalance + withdrawal.amount,
            });
        }

        await ctx.db.patch(args.withdrawalId, {
            status: "rejected",
            processedDate: Date.now(),
            adminId: args.adminId,  // Track which admin rejected
        });

        // Update related transaction status
        const tx = await ctx.db
            .query("transactions")
            .withIndex("by_type", (q) => q.eq("type", "withdrawal"))
            .filter((q) => q.eq(q.field("referenceId"), args.withdrawalId))
            .first();

        if (tx) {
            await ctx.db.patch(tx._id, { status: "rejected" });
        }
    },
});

export const markWithdrawalAsSent = mutation({
    args: {
        withdrawalId: v.id("withdrawals"),
        txHash: v.string(),  // Blockchain transaction hash (required)
        adminId: v.optional(v.id("users"))  // Admin who confirmed the blockchain transaction
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);

        if (!withdrawal) {
            throw createError(ErrorCodes.WITHDRAWAL_NOT_FOUND);
        }

        // Can only mark as sent if it's approved
        if (withdrawal.status !== "approved") {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Only approved withdrawals can be marked as sent");
        }

        await ctx.db.patch(args.withdrawalId, {
            status: "sent",
            txHash: args.txHash,
            processedDate: Date.now(),
            adminId: args.adminId || withdrawal.adminId,  // Use provided adminId or keep existing
        });

        // Update related transaction status
        const tx = await ctx.db
            .query("transactions")
            .withIndex("by_type", (q) => q.eq("type", "withdrawal"))
            .filter((q) => q.eq(q.field("referenceId"), args.withdrawalId))
            .first();

        if (tx) {
            await ctx.db.patch(tx._id, {
                status: "approved",
                description: `${tx.description} - Sent (${args.txHash.substring(0, 10)}...)`
            });
        }
    },
});

// NEW: Update withdrawal status during blockchain execution
export const updateWithdrawalStatus = mutation({
    args: {
        withdrawalId: v.id("withdrawals"),
        status: v.union(
            v.literal("executing"),
            v.literal("completed"),
            v.literal("failed")
        ),
        transactionHash: v.optional(v.string()),
        executedAt: v.optional(v.number()),
        executionError: v.optional(v.string()),
        retryAttempts: v.optional(v.number()),
        approvedBy: v.optional(v.string()),  // Admin wallet address
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);

        if (!withdrawal) {
            throw createError(ErrorCodes.WITHDRAWAL_NOT_FOUND);
        }

        // Build update object
        const updateData: any = {
            status: args.status,
        };

        if (args.transactionHash) updateData.transactionHash = args.transactionHash;
        if (args.executedAt) updateData.executedAt = args.executedAt;
        if (args.executionError) updateData.executionError = args.executionError;
        if (args.retryAttempts !== undefined) updateData.retryAttempts = args.retryAttempts;
        if (args.approvedBy) updateData.approvedBy = args.approvedBy;

        // Update withdrawal
        await ctx.db.patch(args.withdrawalId, updateData);

        // Update related transaction if status is completed
        if (args.status === "completed") {
            const tx = await ctx.db
                .query("transactions")
                .withIndex("by_type", (q) => q.eq("type", "withdrawal"))
                .filter((q) => q.eq(q.field("referenceId"), args.withdrawalId))
                .first();

            if (tx && args.transactionHash) {
                await ctx.db.patch(tx._id, {
                    status: "approved",
                    description: `${tx.description} - Completed (${args.transactionHash.substring(0, 10)}...)`
                });
            }
        }

        return { success: true };
    },
});

export const getPendingWithdrawals = query({
    args: {},
    handler: async (ctx) => {
        const withdrawals = await ctx.db
            .query("withdrawals")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .collect();

        // Join with user info
        return await Promise.all(withdrawals.map(async (w) => {
            const user = await ctx.db.get(w.userId);
            return { ...w, userName: user?.name, userEmail: user?.email };
        }));
    },
});

export const getTransactionHistory = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
    },
});

/**
 * Get user's available USDT balance from BLS swaps (for withdrawals when BLS enabled)
 */
export const getSwappedUSDTBalance = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const swappedBalance = await getUserSwappedUSDTBalance(ctx, args.userId);
        return {
            swappedUSDTBalance: swappedBalance,
        };
    },
});

export const getApprovedWithdrawals = query({
    args: {},
    handler: async (ctx) => {
        const withdrawals = await ctx.db
            .query("withdrawals")
            .withIndex("by_status", (q) => q.eq("status", "approved"))
            .collect();

        // Join with user info and admin info
        return await Promise.all(withdrawals.map(async (w) => {
            const user = await ctx.db.get(w.userId);
            const admin = w.adminId ? await ctx.db.get(w.adminId) : null;
            return {
                ...w,
                userName: user?.name,
                userEmail: user?.email,
                adminName: admin?.name
            };
        }));
    },
});

export const getSentWithdrawals = query({
    args: {},
    handler: async (ctx) => {
        const withdrawals = await ctx.db
            .query("withdrawals")
            .withIndex("by_status", (q) => q.eq("status", "sent"))
            .collect();

        // Join with user info and admin info
        return await Promise.all(withdrawals.map(async (w) => {
            const user = await ctx.db.get(w.userId);
            const admin = w.adminId ? await ctx.db.get(w.adminId) : null;
            return {
                ...w,
                userName: user?.name,
                userEmail: user?.email,
                adminName: admin?.name
            };
        }));
    },
});

export const getWithdrawalsByAdmin = query({
    args: { adminId: v.id("users") },
    handler: async (ctx, args) => {
        const withdrawals = await ctx.db
            .query("withdrawals")
            .withIndex("by_adminId", (q) => q.eq("adminId", args.adminId))
            .collect();

        // Join with user info
        return await Promise.all(withdrawals.map(async (w) => {
            const user = await ctx.db.get(w.userId);
            return {
                ...w,
                userName: user?.name,
                userEmail: user?.email
            };
        }));
    },
});

/**
 * Create notification for successful withdrawal
 * Internal - called by withdrawal executer
 */
export const createWithdrawalNotification = mutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
        txHash: v.string(),
        address: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("notifications", {
            userId: args.userId,
            type: "withdrawal",
            title: "Withdrawal Completed",
            message: `Your withdrawal of $${args.amount.toFixed(2)} USDT has been sent to ${args.address.substring(0, 10)}...`,
            data: {
                amount: args.amount,
                txHash: args.txHash,
                address: args.address,
            },
            read: false,
            createdAt: Date.now(),
            icon: "wallet",
        });
    },
});

/**
 * Log withdrawal processing error
 * Internal - called by withdrawal executer
 */
/**
 * Calculate user's USDT balance that came from BLS swaps
 * Used to validate withdrawals when BLS system is enabled
 */
async function getUserSwappedUSDTBalance(ctx: any, userId: Id<"users">): Promise<number> {
    // Get all completed BLS swap requests for this user
    const swapRequests = await ctx.db
        .query("blsSwapRequests")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("status"), "completed"))
        .collect();
    
    // Sum up all USDT amounts from completed swaps
    let swappedTotal = swapRequests.reduce((sum, swap) => sum + (swap.usdtAmount || 0), 0);
    
    // Subtract any withdrawals that came from swapped USDT
    const withdrawals = await ctx.db
        .query("withdrawals")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .filter((q: any) => 
            q.or(
                q.eq(q.field("status"), "sent"),
                q.eq(q.field("status"), "completed"),
                q.eq(q.field("status"), "approved")
            )
        )
        .collect();
    
    // Subtract withdrawals that used swapped USDT
    for (const withdrawal of withdrawals) {
        const withdrawalSource = (withdrawal as any).withdrawalSource;
        if (withdrawalSource === "bls_swapped") {
            swappedTotal -= withdrawal.amount || 0;
        }
    }
    
    return Math.max(0, swappedTotal); // Don't return negative
}

export const logWithdrawalError = mutation({
    args: {
        withdrawalId: v.id("withdrawals"),
        errorMessage: v.string(),
    },
    handler: async (ctx, args) => {
        const withdrawal = await ctx.db.get(args.withdrawalId);
        if (!withdrawal) return;

        // Create notification for user about the issue
        await ctx.db.insert("notifications", {
            userId: withdrawal.userId,
            type: "system",
            title: "Withdrawal Processing Issue",
            message: `There was an issue processing your withdrawal of $${withdrawal.amount.toFixed(2)}. Our team has been notified and will resolve this shortly.`,
            data: {
                withdrawalId: args.withdrawalId,
                error: args.errorMessage,
            },
            read: false,
            createdAt: Date.now(),
            icon: "alert",
        });

        // Log to cron_logs for admin review
        await ctx.db.insert("cron_logs", {
            jobName: "withdrawal-executer-error",
            status: "failed",
            message: `Failed to process withdrawal ${args.withdrawalId}`,
            timestamp: Date.now(),
            details: args.errorMessage,
        });
    },
});
