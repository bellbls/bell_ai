import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Configuration Management
 * Stores system-wide configuration values in the configs table
 */

/**
 * Get a configuration value by key
 */
export const getConfig = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        return config?.value ?? null;
    },
});

/**
 * Set a configuration value
 */
export const setConfig = mutation({
    args: {
        key: v.string(),
        value: v.any(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { value: args.value });
        } else {
            await ctx.db.insert("configs", {
                key: args.key,
                value: args.value,
            });
        }

        return { success: true };
    },
});

/**
 * Get minimum withdrawal amount
 */
export const getMinWithdrawalAmount = query({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "min_withdrawal_amount"))
            .first();

        return config?.value ?? 50; // Default: $50
    },
});

/**
 * Get minimum deposit amount
 */
export const getMinDepositAmount = query({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "min_deposit_amount"))
            .first();

        return config?.value ?? 10; // Default: $10
    },
});

/**
 * Get withdrawal fee percentage
 */
export const getWithdrawalFeePercentage = query({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "withdrawal_fee_percentage"))
            .first();

        return config?.value ?? 0; // Default: 0%
    },
});

/**
 * Get all configurations (admin only)
 */
export const getAllConfigs = query({
    args: {},
    handler: async (ctx) => {
        const configs = await ctx.db.query("configs").collect();
        return configs;
    },
});

/**
 * Initialize default configurations
 */
export const initializeDefaultConfigs = mutation({
    args: {},
    handler: async (ctx) => {
        const defaults = [
            { key: "min_withdrawal_amount", value: 50 },
            { key: "min_deposit_amount", value: 10 },
            { key: "withdrawal_fee_percentage", value: 0 },
            { key: "max_withdrawal_amount", value: 100000 },
            { key: "staking_paused", value: false },
            { key: "withdrawals_paused", value: false },
            { key: "referral_bonuses_enabled", value: false },
        ];

        for (const config of defaults) {
            const existing = await ctx.db
                .query("configs")
                .withIndex("by_key", (q) => q.eq("key", config.key))
                .first();

            if (!existing) {
                await ctx.db.insert("configs", config);
            }
        }

        return { success: true, message: "Default configurations initialized" };
    },
});

/**
 * Toggle staking pause state
 */
export const toggleStakingPause = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "staking_paused"))
            .first();

        const newState = !existing?.value;

        if (existing) {
            await ctx.db.patch(existing._id, { value: newState });
        } else {
            await ctx.db.insert("configs", {
                key: "staking_paused",
                value: newState,
            });
        }

        // Create system notification for all users
        const users = await ctx.db.query("users").collect();
        const now = Date.now();

        for (const user of users) {
            await ctx.db.insert("notifications", {
                userId: user._id,
                type: "system",
                title: newState ? "🔒 Staking Paused" : "✅ Staking Resumed",
                message: newState 
                    ? "Staking has been temporarily paused by the administrator. You will be notified when it resumes."
                    : "Staking is now available again. You can create new stakes.",
                icon: newState ? "🔒" : "✅",
                read: false,
                createdAt: now,
            });
        }

        return { success: true, isPaused: newState };
    },
});

/**
 * Toggle withdrawals pause state
 */
export const toggleWithdrawalsPause = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "withdrawals_paused"))
            .first();

        const newState = !existing?.value;

        if (existing) {
            await ctx.db.patch(existing._id, { value: newState });
        } else {
            await ctx.db.insert("configs", {
                key: "withdrawals_paused",
                value: newState,
            });
        }

        // Create system notification for all users
        const users = await ctx.db.query("users").collect();
        const now = Date.now();

        for (const user of users) {
            await ctx.db.insert("notifications", {
                userId: user._id,
                type: "system",
                title: newState ? "🔒 Withdrawals Paused" : "✅ Withdrawals Resumed",
                message: newState 
                    ? "Withdrawals have been temporarily paused by the administrator. You will be notified when they resume."
                    : "Withdrawals are now available again. You can request withdrawals from your wallet.",
                icon: newState ? "🔒" : "✅",
                read: false,
                createdAt: now,
            });
        }

        return { success: true, isPaused: newState };
    },
});

/**
 * Toggle referral bonuses state
 */
export const toggleReferralBonuses = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "referral_bonuses_enabled"))
            .first();

        const newState = !existing?.value;

        if (existing) {
            await ctx.db.patch(existing._id, { value: newState });
        } else {
            await ctx.db.insert("configs", {
                key: "referral_bonuses_enabled",
                value: newState,
            });
        }

        // Create system notification for all users
        const users = await ctx.db.query("users").collect();
        const now = Date.now();

        for (const user of users) {
            await ctx.db.insert("notifications", {
                userId: user._id,
                type: "system",
                title: newState ? "✅ Referral Bonuses Enabled" : "🔒 Referral Bonuses Disabled",
                message: newState 
                    ? "L1 and L2 referral bonuses have been enabled. You can now earn commissions from your referral network."
                    : "L1 and L2 referral bonuses have been disabled. Unilevel commissions continue to be available.",
                icon: newState ? "✅" : "🔒",
                read: false,
                createdAt: now,
            });
        }

        return { success: true, isEnabled: newState };
    },
});

/**
 * Toggle 2FA requirement (Admin only)
 */
export const toggle2FARequirement = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "two_factor_required"))
            .first();

        const newState = !existing?.value;
        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, { value: newState });
        } else {
            await ctx.db.insert("configs", {
                key: "two_factor_required",
                value: newState,
            });
        }

        // Store when 2FA requirement was enabled (for grace period calculation)
        if (newState) {
            const enabledAtConfig = await ctx.db
                .query("configs")
                .withIndex("by_key", (q) => q.eq("key", "two_factor_enabled_at"))
                .first();

            if (enabledAtConfig) {
                await ctx.db.patch(enabledAtConfig._id, { value: now });
            } else {
                await ctx.db.insert("configs", {
                    key: "two_factor_enabled_at",
                    value: now,
                });
            }

            // Mark all existing users as required (for grace period tracking)
            const users = await ctx.db.query("users").collect();
            for (const user of users) {
                if (!user.twoFactorRequiredAt && !user.twoFactorEnabled) {
                    await ctx.db.patch(user._id, {
                        twoFactorRequiredAt: now,
                    });
                }
            }
        }

        // Create system notification for all users
        const users = await ctx.db.query("users").collect();
        const notificationTime = Date.now();

        for (const user of users) {
            await ctx.db.insert("notifications", {
                userId: user._id,
                type: "system",
                title: newState ? "🔐 Two-Factor Authentication Required" : "✅ 2FA Requirement Removed",
                message: newState 
                    ? "Two-factor authentication is now required for login and withdrawals. Please set it up in Settings. You have 30 days to complete setup."
                    : "Two-factor authentication is no longer required. You can continue using the app without 2FA.",
                icon: newState ? "🔐" : "✅",
                read: false,
                createdAt: notificationTime,
            });
        }

        return { success: true, isRequired: newState };
    },
});

/**
 * Get 2FA requirement status
 */
export const get2FARequirement = query({
    args: {},
    handler: async (ctx) => {
        const required = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "two_factor_required"))
            .first();

        const enabledAt = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "two_factor_enabled_at"))
            .first();

        return {
            isRequired: required?.value ?? false,
            enabledAt: enabledAt?.value ?? null,
        };
    },
});

/**
 * Get system pause states
 */
export const getSystemPauseStates = query({
    args: {},
    handler: async (ctx) => {
        const stakingPaused = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "staking_paused"))
            .first();

        const withdrawalsPaused = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "withdrawals_paused"))
            .first();

        const referralBonusesEnabled = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "referral_bonuses_enabled"))
            .first();

        const twoFactorRequired = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "two_factor_required"))
            .first();

        return {
            stakingPaused: stakingPaused?.value ?? false,
            withdrawalsPaused: withdrawalsPaused?.value ?? false,
            referralBonusesEnabled: referralBonusesEnabled?.value ?? false,
            twoFactorRequired: twoFactorRequired?.value ?? false,
        };
    },
});
