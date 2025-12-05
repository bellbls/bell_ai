import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { updateTeamVolume } from "./ranks";
import { DEFAULT_STAKING_CYCLES } from "./config";
import { createError, ErrorCodes } from "./errors";
import { notify } from "./notifications";
import { updateActiveDirects } from "./unilevel/activeDirectsCalculator";

export const createStake = mutation({
    args: {
        accountId: v.optional(v.id("accounts")),  // New: accountId
        userId: v.optional(v.id("users")),  // Legacy: userId (for backward compatibility)
        amount: v.number(),
        cycleDays: v.number(),
    },
    handler: async (ctx, args) => {
        const MIN_STAKE_AMOUNT = 100; // Minimum stake is $100

        // 1. Get account (try accountId first, fallback to userId for backward compatibility)
        let account = null;
        if (args.accountId) {
            account = await ctx.db.get(args.accountId);
        } else if (args.userId) {
            // Legacy: get user and find/create account
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
                }
            }
        }

        if (!account) throw createError(ErrorCodes.USER_NOT_FOUND);
        if (args.amount < MIN_STAKE_AMOUNT) {
            throw createError(ErrorCodes.VALIDATION_ERROR, `Minimum stake amount is $${MIN_STAKE_AMOUNT}`);
        }
        if (account.walletBalance < args.amount) throw createError(ErrorCodes.INSUFFICIENT_BALANCE);

        // 2.5. Check if presale is active - block staking if presale is on
        const presaleConfig = await ctx.db.query("presaleConfig").first();
        if (presaleConfig?.isActive) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Staking is disabled while presale is active. Please wait for presale to end.");
        }

        // 2.6. Check if staking is paused
        const stakingPausedConfig = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "staking_paused"))
            .first();
            
        if (stakingPausedConfig?.value) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Staking is currently paused. Please try again later.");
        }

        // 2. Get Cycle Config
        const cycleConfig = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "staking_cycles"))
            .unique();

        // Fallback to defaults if config is missing (safe default)
        const cycles = cycleConfig?.value || DEFAULT_STAKING_CYCLES;
        const selectedCycle = cycles.find((c: any) => c.days === args.cycleDays);

        if (!selectedCycle) throw createError(ErrorCodes.INVALID_CYCLE);

        // 3. Deduct Balance
        await ctx.db.patch(account._id, {
            walletBalance: account.walletBalance - args.amount,
        });

        // 4. Create Stake
        const startDate = Date.now();
        const endDate = startDate + args.cycleDays * 24 * 60 * 60 * 1000;

        const stakeId = await ctx.db.insert("stakes", {
            accountId: account._id,
            userId: args.userId,  // Keep for backward compatibility
            amount: args.amount,
            cycleDays: args.cycleDays,
            dailyRate: selectedCycle.dailyRate,
            startDate,
            endDate,
            status: "active",
            lastYieldDate: startDate,
        });

        // 5. Log Transaction
        await ctx.db.insert("transactions", {
            accountId: account._id,
            userId: args.userId,  // Keep for backward compatibility
            amount: -args.amount,
            type: "deposit",
            referenceId: stakeId,
            description: `Staked ${args.amount} USDT for ${args.cycleDays} days`,
            timestamp: Date.now(),
        });

        // 6. Update Team Volume (Upline)
        await updateTeamVolume(ctx, account._id, args.amount);

        // 7. NEW: Update referrer's active directs count (for Unilevel unlock)
        // TODO: updateActiveDirects needs to be updated to support accountId
        // For now, skip if referrerId is an accountId (updateActiveDirects only supports userId)
        // This will be fixed when updateActiveDirects is updated for multi-account support
        if (account.referrerId) {
            // Skip for now - updateActiveDirects needs to support accountId
            // await updateActiveDirects(ctx, account.referrerId as any);
        }

        // 8. Create Notification
        const totalReturn = (selectedCycle.dailyRate * args.cycleDays).toFixed(1);
        await notify(
            ctx,
            account._id,
            "account",
            "stake",
            "Stake Created Successfully",
            `You've staked $${args.amount} for ${args.cycleDays} days at ${selectedCycle.dailyRate}% daily. Expected return: ${totalReturn}%`,
            "TrendingUp",
            { amount: args.amount, cycleDays: args.cycleDays, dailyRate: selectedCycle.dailyRate }
        );

        return stakeId;
    },
});

export const getUserStakes = query({
    args: { 
        accountId: v.optional(v.id("accounts")),
        userId: v.optional(v.id("users")),  // Legacy support
    },
    handler: async (ctx, args) => {
        if (args.accountId) {
            return await ctx.db
                .query("stakes")
                .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
                .collect();
        } else if (args.userId) {
            // Legacy: query by userId
            return await ctx.db
                .query("stakes")
                .withIndex("by_userId", (q) => q.eq("userId", args.userId))
                .collect();
        }
        return [];
    },
});

export const getActiveStakes = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("stakes")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();
    },
});
