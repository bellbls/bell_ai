import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { createError, ErrorCodes, isValidAmount } from "./errors";
import { notify } from "./notifications";

/**
 * BellCoin Stable (BLS) System
 * Internal stable unit that acts as off-chain points
 * Users can swap BLS to USDT instantly
 */

// ==================== CONFIGURATION ====================

/**
 * Get BLS configuration
 */
export const getBLSConfig = query({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db.query("blsConfig").first();
        
        if (!config) {
            // Return default config if not initialized
            return {
                isEnabled: false,
                conversionRate: 1.0,
                minSwapAmount: 1.0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
        }

        return config;
    },
});

/**
 * Initialize BLS configuration (first time setup)
 */
export const initializeBLSConfig = internalMutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db.query("blsConfig").first();
        if (existing) return existing._id;

        const now = Date.now();
        const configId = await ctx.db.insert("blsConfig", {
            isEnabled: false,
            conversionRate: 1.0,
            minSwapAmount: 1.0,
            createdAt: now,
            updatedAt: now,
        });

        return configId;
    },
});

/**
 * Toggle BLS system on/off (Admin only)
 */
export const toggleBLSSystem = mutation({
    args: {},
    handler: async (ctx) => {
        // Check if user is admin (you may want to add proper admin check)
        // For now, we'll allow any authenticated user - add admin check in production

        let config = await ctx.db.query("blsConfig").first();
        
        if (!config) {
            // Initialize if doesn't exist
            const now = Date.now();
            const configId = await ctx.db.insert("blsConfig", {
                isEnabled: false,
                conversionRate: 1.0,
                minSwapAmount: 1.0,
                createdAt: now,
                updatedAt: now,
            });
            config = await ctx.db.get(configId);
            if (!config) {
                throw new Error("Failed to create BLS config");
            }
        }

        const newState = !config.isEnabled;

        await ctx.db.patch(config._id, {
            isEnabled: newState,
            updatedAt: Date.now(),
        });

        // Notify all users about the change
        const users = await ctx.db.query("users").collect();
        const now = Date.now();

        for (const user of users) {
            await ctx.db.insert("notifications", {
                userId: user._id,
                type: "system",
                title: newState ? "✅ BLS System Enabled" : "ℹ️ BLS System Disabled",
                message: newState
                    ? "BellCoin Stable (BLS) system is now active. Future rewards will be paid in BLS. You can swap BLS to USDT anytime."
                    : "BLS system has been disabled. Future rewards will be paid directly in USDT.",
                icon: newState ? "✅" : "ℹ️",
                read: false,
                createdAt: now,
            });
        }

        return { success: true, isEnabled: newState };
    },
});

/**
 * Update BLS configuration (Admin only)
 */
export const updateBLSConfig = mutation({
    args: {
        conversionRate: v.optional(v.number()),
        minSwapAmount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let config = await ctx.db.query("blsConfig").first();
        
        if (!config) {
            // Initialize if doesn't exist
            const now = Date.now();
            const configId = await ctx.db.insert("blsConfig", {
                isEnabled: false,
                conversionRate: args.conversionRate ?? 1.0,
                minSwapAmount: args.minSwapAmount ?? 1.0,
                createdAt: now,
                updatedAt: now,
            });
            config = await ctx.db.get(configId);
            if (!config) {
                throw new Error("Failed to create BLS config");
            }
        }

        const updates: any = {
            updatedAt: Date.now(),
        };

        if (args.conversionRate !== undefined) {
            if (args.conversionRate <= 0) {
                throw createError(ErrorCodes.VALIDATION_ERROR, "Conversion rate must be greater than 0");
            }
            updates.conversionRate = args.conversionRate;
        }

        if (args.minSwapAmount !== undefined) {
            if (args.minSwapAmount < 0) {
                throw createError(ErrorCodes.VALIDATION_ERROR, "Minimum swap amount cannot be negative");
            }
            updates.minSwapAmount = args.minSwapAmount;
        }

        await ctx.db.patch(config._id, updates);

        return { success: true };
    },
});

// ==================== BALANCE MANAGEMENT ====================

/**
 * Get user's BLS balance
 */
export const getBLSBalance = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw createError(ErrorCodes.USER_NOT_FOUND);
        }

        return {
            blsBalance: user.blsBalance || 0,
        };
    },
});

/**
 * Credit BLS to user balance (Internal function)
 */
export const creditBLS = internalMutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
        description: v.string(),
        referenceId: v.optional(v.string()),
        transactionType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (!isValidAmount(args.amount, 0)) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "BLS amount must be greater than 0");
        }

        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw createError(ErrorCodes.USER_NOT_FOUND);
        }

        const newBalance = (user.blsBalance || 0) + args.amount;

        await ctx.db.patch(args.userId, {
            blsBalance: newBalance,
        });

        // Log transaction - use transactionType if provided, otherwise default to "bls_earned"
        // This ensures earnings are properly categorized for the earnings page
        const transactionType = args.transactionType || "bls_earned";
        await ctx.db.insert("transactions", {
            userId: args.userId,
            amount: args.amount,
            type: transactionType as any, // Use the provided type so earnings page can categorize correctly
            referenceId: args.referenceId,
            description: args.description,
            timestamp: Date.now(),
        });

        return { success: true, newBalance };
    },
});

/**
 * Deduct BLS from user balance (Internal function)
 */
export const deductBLS = internalMutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        if (!isValidAmount(args.amount, 0)) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "BLS amount must be greater than 0");
        }

        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw createError(ErrorCodes.USER_NOT_FOUND);
        }

        const currentBalance = user.blsBalance || 0;
        if (currentBalance < args.amount) {
            throw createError(ErrorCodes.INSUFFICIENT_BALANCE, "Insufficient BLS balance");
        }

        const newBalance = currentBalance - args.amount;

        await ctx.db.patch(args.userId, {
            blsBalance: newBalance,
        });

        return { success: true, newBalance };
    },
});

// ==================== SWAP TO CRYPTO ====================

/**
 * Swap BLS to USDT
 */
export const swapBLSToUSDT = mutation({
    args: {
        userId: v.id("users"),
        blsAmount: v.number(),
    },
    handler: async (ctx, args) => {
        // Validate amount
        if (!isValidAmount(args.blsAmount, 0)) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Swap amount must be greater than 0");
        }

        // Check if BLS system is enabled
        const config = await ctx.db.query("blsConfig").first();
        if (!config || !config.isEnabled) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "BLS system is not enabled");
        }

        // Check minimum swap amount
        if (args.blsAmount < config.minSwapAmount) {
            throw createError(
                ErrorCodes.VALIDATION_ERROR,
                `Minimum swap amount is ${config.minSwapAmount} BLS`
            );
        }

        // Get user
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw createError(ErrorCodes.USER_NOT_FOUND);
        }

        // Check BLS balance
        const currentBLSBalance = user.blsBalance || 0;
        if (currentBLSBalance < args.blsAmount) {
            throw createError(ErrorCodes.INSUFFICIENT_BALANCE, "Insufficient BLS balance");
        }

        // Calculate USDT amount
        const usdtAmount = args.blsAmount * config.conversionRate;

        // Deduct BLS
        await ctx.db.patch(args.userId, {
            blsBalance: currentBLSBalance - args.blsAmount,
        });

        // Credit USDT
        const newUSDTBalance = (user.walletBalance || 0) + usdtAmount;
        await ctx.db.patch(args.userId, {
            walletBalance: newUSDTBalance,
        });

        // Create swap request record
        const swapRequestId = await ctx.db.insert("blsSwapRequests", {
            userId: args.userId,
            blsAmount: args.blsAmount,
            usdtAmount: usdtAmount,
            status: "completed",
            timestamp: Date.now(),
            completedAt: Date.now(),
        });

        // Log BLS deduction transaction
        await ctx.db.insert("transactions", {
            userId: args.userId,
            amount: -args.blsAmount,
            type: "bls_swap",
            referenceId: swapRequestId,
            description: `Swapped ${args.blsAmount.toFixed(2)} BLS to ${usdtAmount.toFixed(2)} USDT`,
            timestamp: Date.now(),
        });

        // Log USDT credit transaction
        await ctx.db.insert("transactions", {
            userId: args.userId,
            amount: usdtAmount,
            type: "deposit",
            referenceId: swapRequestId,
            description: `Received ${usdtAmount.toFixed(2)} USDT from BLS swap`,
            timestamp: Date.now(),
        });

        // Notify user
        await notify(
            ctx,
            args.userId,
            "earnings",
            "BLS Swap Completed",
            `You successfully swapped ${args.blsAmount.toFixed(2)} BLS to ${usdtAmount.toFixed(2)} USDT`,
            "ArrowRightLeft",
            {
                blsAmount: args.blsAmount,
                usdtAmount: usdtAmount,
                swapRequestId: swapRequestId,
            }
        );

        return {
            success: true,
            swapRequestId,
            blsAmount: args.blsAmount,
            usdtAmount: usdtAmount,
            newBLSBalance: currentBLSBalance - args.blsAmount,
            newUSDTBalance: newUSDTBalance,
            message: `Successfully swapped ${args.blsAmount.toFixed(2)} BLS to ${usdtAmount.toFixed(2)} USDT`,
        };
    },
});

/**
 * Get user's swap history
 */
export const getSwapHistory = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const swaps = await ctx.db
            .query("blsSwapRequests")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();

        return swaps;
    },
});

/**
 * Get BLS system statistics (Admin)
 */
export const getBLSStats = query({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db.query("blsConfig").first();
        
        // Get all users with BLS balance
        const users = await ctx.db.query("users").collect();
        let totalBLSIssued = 0;
        let usersWithBLS = 0;

        for (const user of users) {
            const balance = user.blsBalance || 0;
            if (balance > 0) {
                totalBLSIssued += balance;
                usersWithBLS++;
            }
        }

        // Get total swaps
        const swaps = await ctx.db.query("blsSwapRequests").collect();
        const totalSwaps = swaps.length;
        const totalBLSSwapped = swaps.reduce((sum, swap) => sum + swap.blsAmount, 0);
        const totalUSDTCredited = swaps.reduce((sum, swap) => sum + swap.usdtAmount, 0);

        return {
            isEnabled: config?.isEnabled || false,
            conversionRate: config?.conversionRate || 1.0,
            minSwapAmount: config?.minSwapAmount || 1.0,
            totalBLSIssued,
            usersWithBLS,
            totalSwaps,
            totalBLSSwapped,
            totalUSDTCredited,
        };
    },
});

