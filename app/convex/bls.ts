import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { createError, ErrorCodes, isValidAmount } from "./errors";
import { notify } from "./notifications";

/**
 * BellCoin Stable (BLS) System
 * Internal stable unit that acts as off-chain points
 * Users can swap BLS to USDT instantly
 */

// ==================== HELPER FUNCTIONS ====================

/**
 * Helper function to round currency amounts to 2 decimal places for safe comparison
 */
function roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
}

/**
 * Helper function to safely check if balance is sufficient (accounting for floating-point precision)
 * Uses epsilon tolerance to handle floating-point precision issues
 */
function hasSufficientBalance(balance: number, amount: number): boolean {
    const EPSILON = 0.001; // Allow 0.001 BLS tolerance for floating-point precision
    const roundedBalance = roundToTwoDecimals(balance);
    const roundedAmount = roundToTwoDecimals(amount);
    // Check if balance is sufficient with epsilon tolerance
    return roundedBalance + EPSILON >= roundedAmount;
}

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
    args: { 
        userId: v.optional(v.id("users")),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        if (args.accountId) {
            const account = await ctx.db.get(args.accountId);
            if (!account) {
                throw createError(ErrorCodes.USER_NOT_FOUND);
            }

            return {
                blsBalance: account.blsBalance || 0,
            };
        } else if (args.userId) {
            // Legacy: query by userId
            const user = await ctx.db.get(args.userId);
            if (!user) {
                throw createError(ErrorCodes.USER_NOT_FOUND);
            }

            return {
                blsBalance: user.blsBalance || 0,
            };
        }
        return { blsBalance: 0 };
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
        if (!hasSufficientBalance(currentBalance, args.amount)) {
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
        accountId: v.optional(v.id("accounts")),
        userId: v.optional(v.id("users")),  // Legacy support
        blsAmount: v.number(),
    },
    handler: async (ctx, args) => {
        // Validate amount
        if (!isValidAmount(args.blsAmount, 0)) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Swap amount must be greater than 0");
        }

        // Check if BLS system is enabled
        const config = await ctx.db.query("blsConfig").first();
        if (!config) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "BLS system is not configured. Please contact support.");
        }
        if (!config.isEnabled) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "BLS system is currently disabled. Swapping is not available.");
        }

        // Check minimum swap amount
        if (args.blsAmount < config.minSwapAmount) {
            throw createError(
                ErrorCodes.VALIDATION_ERROR,
                `Minimum swap amount is ${config.minSwapAmount} BLS`
            );
        }

        // Get account or user
        let account = null;
        let targetId: Id<"accounts"> | Id<"users"> | null = null;
        
        if (args.accountId) {
            account = await ctx.db.get(args.accountId);
            targetId = args.accountId;
        } else if (args.userId) {
            // Legacy: get user and find account
            const user = await ctx.db.get(args.userId);
            if (user) {
                const login = await ctx.db
                    .query("logins")
                    .withIndex("by_email", (q) => q.eq("email", user.email))
                    .first();
                if (login) {
                    account = await ctx.db
                        .query("accounts")
                        .withIndex("by_loginId", (q) => q.eq("loginId", login._id))
                        .filter((q) => q.eq(q.field("isDefault"), true))
                        .first();
                    if (account) {
                        targetId = account._id;
                    }
                }
                // Fallback to user if no account found
                if (!account) {
                    account = user as any;
                    targetId = args.userId;
                }
            }
        }

        if (!account || !targetId) {
            throw createError(ErrorCodes.USER_NOT_FOUND);
        }

        // Check BLS balance using safe floating-point comparison
        const currentBLSBalance = account.blsBalance || 0;
        if (!hasSufficientBalance(currentBLSBalance, args.blsAmount)) {
            // Enhanced error message with detailed values for debugging
            const roundedBalance = roundToTwoDecimals(currentBLSBalance);
            const roundedAmount = roundToTwoDecimals(args.blsAmount);
            throw createError(
                ErrorCodes.INSUFFICIENT_BALANCE, 
                `Insufficient BLS balance. Balance: ${currentBLSBalance.toFixed(6)} (rounded: ${roundedBalance.toFixed(2)}), Amount: ${args.blsAmount.toFixed(6)} (rounded: ${roundedAmount.toFixed(2)})`
            );
        }

        // Calculate USDT amount (ensure conversion rate is valid)
        if (!config.conversionRate || config.conversionRate <= 0) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Invalid conversion rate configured. Please contact support.");
        }
        const usdtAmount = args.blsAmount * config.conversionRate;

        // Determine if we're working with account or user
        const isAccount = args.accountId !== undefined;
        
        // Deduct BLS
        if (isAccount && args.accountId) {
            await ctx.db.patch(args.accountId, {
                blsBalance: currentBLSBalance - args.blsAmount,
            });
        } else if (args.userId) {
            await ctx.db.patch(args.userId, {
                blsBalance: currentBLSBalance - args.blsAmount,
            });
        }

        // Credit USDT
        const newUSDTBalance = (account.walletBalance || 0) + usdtAmount;
        if (isAccount && args.accountId) {
            await ctx.db.patch(args.accountId, {
                walletBalance: newUSDTBalance,
            });
        } else if (args.userId) {
            await ctx.db.patch(args.userId, {
                walletBalance: newUSDTBalance,
            });
        }

        // Create swap request record
        const swapRequestId = await ctx.db.insert("blsSwapRequests", {
            accountId: args.accountId || undefined,
            userId: args.userId || undefined,  // Keep for backward compatibility
            blsAmount: args.blsAmount,
            usdtAmount: usdtAmount,
            status: "completed",
            timestamp: Date.now(),
            completedAt: Date.now(),
        });

        // Convert swapRequestId to string for referenceId field
        const swapRequestIdString = swapRequestId.toString();

        // Log BLS deduction transaction
        await ctx.db.insert("transactions", {
            accountId: args.accountId || undefined,
            userId: args.userId || undefined,  // Keep for backward compatibility
            amount: -args.blsAmount,
            type: "bls_swap",
            referenceId: swapRequestIdString,
            description: `Swapped ${args.blsAmount.toFixed(2)} BLS to ${usdtAmount.toFixed(2)} USDT`,
            timestamp: Date.now(),
        });

        // Log USDT credit transaction
        await ctx.db.insert("transactions", {
            accountId: args.accountId || undefined,
            userId: args.userId || undefined,  // Keep for backward compatibility
            amount: usdtAmount,
            type: "deposit",
            referenceId: swapRequestIdString,
            description: `Received ${usdtAmount.toFixed(2)} USDT from BLS swap`,
            timestamp: Date.now(),
        });

        // Notify user (use accountId if available, otherwise userId)
        const notifyId = args.accountId || args.userId;
        if (notifyId) {
            await notify(
                ctx,
                notifyId,
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
        }

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
    args: { 
        userId: v.optional(v.id("users")),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        if (args.accountId) {
            const swaps = await ctx.db
                .query("blsSwapRequests")
                .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
                .order("desc")
                .collect();
            return swaps;
        } else if (args.userId) {
            // Legacy: query by userId
            const swaps = await ctx.db
                .query("blsSwapRequests")
                .withIndex("by_userId", (q) => q.eq("userId", args.userId))
                .order("desc")
                .collect();
            return swaps;
        }
        return [];
    },
});

/**
 * Diagnostic query to check swap readiness for a user
 * Helps identify why swaps might be failing
 */
export const checkSwapReadiness = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        const config = await ctx.db.query("blsConfig").first();

        return {
            userExists: !!user,
            userHasBLSBalance: (user?.blsBalance || 0) > 0,
            blsBalance: user?.blsBalance || 0,
            blsSystemExists: !!config,
            blsSystemEnabled: config?.isEnabled || false,
            conversionRate: config?.conversionRate || null,
            minSwapAmount: config?.minSwapAmount || null,
            canSwap: !!(config?.isEnabled && (user?.blsBalance || 0) > 0 && config?.conversionRate > 0),
            issues: [
                !user && "User not found",
                !config && "BLS system not configured",
                config && !config.isEnabled && "BLS system is disabled",
                (user?.blsBalance || 0) === 0 && "User has no BLS balance",
                config && (!config.conversionRate || config.conversionRate <= 0) && "Invalid conversion rate",
            ].filter(Boolean),
        };
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

