import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { updateTeamVolume } from "./ranks";
import { DEFAULT_STAKING_CYCLES } from "./config";
import { createError, ErrorCodes } from "./errors";
import { notify } from "./notifications";
import { updateActiveDirects } from "./unilevel/activeDirectsCalculator";

export const createStake = mutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
        cycleDays: v.number(),
    },
    handler: async (ctx, args) => {
        const MIN_STAKE_AMOUNT = 100; // Minimum stake is $100

        // 1. Validate User & Balance
        const user = await ctx.db.get(args.userId);
        if (!user) throw createError(ErrorCodes.USER_NOT_FOUND);
        if (args.amount < MIN_STAKE_AMOUNT) {
            throw createError(ErrorCodes.VALIDATION_ERROR, `Minimum stake amount is $${MIN_STAKE_AMOUNT}`);
        }
        if (user.walletBalance < args.amount) throw createError(ErrorCodes.INSUFFICIENT_BALANCE);

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
        await ctx.db.patch(args.userId, {
            walletBalance: user.walletBalance - args.amount,
        });

        // 4. Create Stake
        const startDate = Date.now();
        const endDate = startDate + args.cycleDays * 24 * 60 * 60 * 1000;

        const stakeId = await ctx.db.insert("stakes", {
            userId: args.userId,
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
            userId: args.userId,
            amount: -args.amount,
            type: "deposit",
            referenceId: stakeId,
            description: `Staked ${args.amount} USDT for ${args.cycleDays} days`,
            timestamp: Date.now(),
        });

        // 6. Update Team Volume (Upline)
        await updateTeamVolume(ctx, args.userId, args.amount);

        // 7. NEW: Update referrer's active directs count (for Unilevel unlock)
        if (user.referrerId) {
            await updateActiveDirects(ctx, user.referrerId);
        }

        // 8. Create Notification
        const totalReturn = (selectedCycle.dailyRate * args.cycleDays).toFixed(1);
        await notify(
            ctx,
            args.userId,
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
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("stakes")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();
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
