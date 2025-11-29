import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { updateTeamVolume, updateRank } from "./ranks";
import { notify } from "./notifications";


export const distributeDailyRewards = mutation({
    args: {},
    handler: async (ctx) => {
        const startTime = Date.now();
        let stakesProcessed = 0;
        let stakesExpired = 0;
        let totalYield = 0;
        let totalCommissions = 0;
        let errors: string[] = [];

        try {
            // 1. Get Active Stakes
            const stakes = await ctx.db
                .query("stakes")
                .withIndex("by_status", (q) => q.eq("status", "active"))
                .collect();

            const now = Date.now();

            for (const stake of stakes) {
                try {
                    // Check if stake is expired
                    if (now > stake.endDate) {
                        await ctx.db.patch(stake._id, { status: "completed" });
                        stakesExpired++;

                        // When a stake expires, we need to update team volumes and ranks
                        const staker = await ctx.db.get(stake.userId);
                        if (staker) {
                            // Subtract the stake amount from team volume
                            await updateTeamVolume(ctx, stake.userId, -stake.amount);

                            // NEW: Update referrer's active directs count (for Unilevel unlock)
                            if (staker.referrerId) {
                                const { updateActiveDirects } = await import("./unilevel/activeDirectsCalculator");
                                await updateActiveDirects(ctx, staker.referrerId);
                            }
                        }
                        continue;
                    }

                    // 2. Calculate Yield
                    const dailyYield = (stake.amount * stake.dailyRate) / 100;
                    totalYield += dailyYield;

                    // Update Staker Wallet
                    const staker = await ctx.db.get(stake.userId);
                    if (staker) {
                        // Check if BLS system is enabled
                        const blsConfig = await ctx.db.query("blsConfig").first();
                        const isBLSEnabled = blsConfig?.isEnabled || false;

                        if (isBLSEnabled) {
                            // Credit BLS instead of USDT (creditBLS creates the transaction record)
                            await ctx.runMutation(internal.bls.creditBLS, {
                                userId: staker._id,
                                amount: dailyYield,
                                description: `Daily yield for $${stake.amount} stake (${stake.cycleDays} days)`,
                                referenceId: stake._id,
                                transactionType: "yield",
                            });

                            // Notify user of daily earnings in BLS
                            await notify(
                                ctx,
                                staker._id,
                                "earnings",
                                "Daily Yield Credited (BLS)",
                                `You earned ${dailyYield.toFixed(2)} BLS from your ${stake.cycleDays}-day stake! Swap to USDT anytime.`,
                                "DollarSign",
                                { amount: dailyYield, stakeId: stake._id, currency: "BLS" }
                            );
                        } else {
                            // Credit USDT directly (existing behavior)
                            await ctx.db.insert("transactions", {
                                userId: stake.userId,
                                amount: dailyYield,
                                type: "yield",
                                referenceId: stake._id,
                                description: `Daily yield for $${stake.amount} stake (${stake.cycleDays} days)`,
                                timestamp: now,
                            });

                            await ctx.db.patch(staker._id, { walletBalance: (staker.walletBalance || 0) + dailyYield });

                            // Notify user of daily earnings
                            await notify(
                                ctx,
                                staker._id,
                                "earnings",
                                "Daily Yield Credited",
                                `You earned $${dailyYield.toFixed(2)} from your ${stake.cycleDays}-day stake!`,
                                "DollarSign",
                                { amount: dailyYield, stakeId: stake._id }
                            );
                        }
                    }

                    // 3. Distribute Commissions (Referral Bonuses)
                    const commissionsDistributed = await distributeReferralBonuses(ctx, stake.userId, dailyYield, now, stake._id);
                    totalCommissions += commissionsDistributed;

                    // 4. Distribute B-Rank Bonuses
                    const vrankBonus = await distributeVRankBonuses(ctx, stake.userId, dailyYield, now, stake._id);
                    totalCommissions += vrankBonus;

                    // 5. NEW: Distribute Unilevel Commissions (10 levels)
                    const { distributeUnilevelCommissions } = await import("./unilevel/commissionDistributor");
                    await distributeUnilevelCommissions(ctx, stake._id, dailyYield);

                    // Update last yield date
                    await ctx.db.patch(stake._id, { lastYieldDate: now });
                    stakesProcessed++;
                } catch (error: any) {
                    errors.push(`Stake ${stake._id}: ${error.message}`);
                }
            }

            const executionTime = Date.now() - startTime;

            // Log successful execution
            await ctx.db.insert("cron_logs", {
                jobName: "distribute-daily-rewards",
                status: "success",
                message: `Processed ${stakesProcessed} stakes, ${stakesExpired} expired`,
                timestamp: now,
                stakesProcessed,
                stakesExpired,
                totalYieldDistributed: totalYield,
                totalCommissionsDistributed: totalCommissions,
                executionTimeMs: executionTime,
                details: errors.length > 0 ? `Errors: ${errors.join("; ")}` : undefined,
            });

        } catch (error: any) {
            const executionTime = Date.now() - startTime;

            // Log failed execution
            await ctx.db.insert("cron_logs", {
                jobName: "distribute-daily-rewards",
                status: "failed",
                message: error.message || "Unknown error",
                timestamp: Date.now(),
                stakesProcessed,
                stakesExpired,
                totalYieldDistributed: totalYield,
                totalCommissionsDistributed: totalCommissions,
                executionTimeMs: executionTime,
                details: `Error: ${error.stack || error.message}`,
            });

            throw error;
        }
    },
});

/**
 * Distribute Referral Bonuses (L1 and L2)
 * L1 (Direct Referral): 15% of referral stake yield
 * L2 (Indirect Referral): 10% of referral stake yield
 */
async function distributeReferralBonuses(ctx: any, stakerId: any, yieldAmount: number, now: number, stakeId: any): Promise<number> {
    let currentUserId = stakerId;
    let level = 1;
    const MAX_LEVELS = 2; // Only L1 and L2 for referral bonuses
    let totalCommissions = 0;

    while (level <= MAX_LEVELS) {
        const user = await ctx.db.get(currentUserId);
        if (!user || !user.referrerId) break;

        const referrer = await ctx.db.get(user.referrerId);
        if (!referrer) break;

        // Calculate Rate based on Level
        let rate = 0;
        if (level === 1) rate = 15; // L1: 15%
        if (level === 2) rate = 10; // L2: 10%

        if (rate > 0) {
            const commission = (yieldAmount * rate) / 100;
            totalCommissions += commission;

            // Check if BLS system is enabled
            const blsConfig = await ctx.db.query("blsConfig").first();
            const isBLSEnabled = blsConfig?.isEnabled || false;

            if (isBLSEnabled) {
                // Credit BLS instead of USDT
                await ctx.runMutation(internal.bls.creditBLS, {
                    userId: referrer._id,
                    amount: commission,
                    description: `L${level} Referral Bonus from ${user.name}'s stake`,
                    referenceId: stakeId,
                    transactionType: level === 1 ? "commission_direct" : "commission_indirect",
                });

                // Notify referrer of commission in BLS
                await notify(
                    ctx,
                    referrer._id,
                    "commission",
                    `L${level} Commission Earned (BLS)`,
                    `You earned ${commission.toFixed(2)} BLS commission from ${user.name}'s stake! Swap to USDT anytime.`,
                    "Gift",
                    { amount: commission, level, fromUser: user.name, fromUserId: user._id, currency: "BLS" }
                );
            } else {
                // Credit USDT directly (existing behavior)
                await ctx.db.insert("transactions", {
                    userId: referrer._id,
                    amount: commission,
                    type: level === 1 ? "commission_direct" : "commission_indirect",
                    referenceId: stakeId,
                    description: `L${level} Referral Bonus from ${user.name}'s stake`,
                    timestamp: now,
                });

                await ctx.db.patch(referrer._id, { walletBalance: (referrer.walletBalance || 0) + commission });

                // Notify referrer of commission
                await notify(
                    ctx,
                    referrer._id,
                    "commission",
                    `L${level} Commission Earned`,
                    `You earned $${commission.toFixed(2)} commission from ${user.name}'s stake!`,
                    "Gift",
                    { amount: commission, level, fromUser: user.name, fromUserId: user._id }
                );
            }
        }

        currentUserId = referrer._id;
        level++;
    }

    return totalCommissions;
}

/**
 * Distribute B-Rank Bonuses with Capping
 * B-Rank bonus is calculated as a percentage of the direct referrals' daily yields
 * The percentage is based on the user's current B-Rank (commissionRate from config)
 * 
 * NEW: Capping Logic
 * - Maximum bonus cap = Total Active Stake × Capping Multiplier
 * - Bonuses stop when total received >= cap
 * - Bonuses resume when user stakes more (increasing the cap)
 * 
 * Example for B1 (2x multiplier):
 * - User has $200 active stake → Cap = $400
 * - User receives bonuses until total = $400
 * - User stakes $100 more → Total active = $300 → New cap = $600
 * - User can now receive $200 more in bonuses
 */
async function distributeVRankBonuses(ctx: any, stakerId: any, yieldAmount: number, now: number, stakeId: any): Promise<number> {
    // Get the staker
    const staker = await ctx.db.get(stakerId);
    if (!staker || !staker.referrerId) return 0;

    // Get the direct referrer (sponsor)
    const directReferrer = await ctx.db.get(staker.referrerId);
    if (!directReferrer) return 0;

    // Only distribute B-Rank bonus if the referrer has a rank (B1 or higher)
    if (directReferrer.currentRank === "B0") return 0;

    // Get the rank configuration to find the commission rate and capping multiplier
    const config = await ctx.db
        .query("configs")
        .withIndex("by_key", (q) => q.eq("key", "rank_rules"))
        .unique();

    const rules = config?.value || [];
    const rankRule = rules.find((r: any) => r.rank === directReferrer.currentRank);

    if (!rankRule || !rankRule.commissionRate) return 0;

    // NEW: Calculate current cap based on active stakes
    const activeStakes = await ctx.db
        .query("stakes")
        .withIndex("by_userId", (q: any) => q.eq("userId", directReferrer._id))
        .filter((q: any) => q.eq(q.field("status"), "active"))
        .collect();

    const totalActiveStake = activeStakes.reduce((sum: number, stake: any) => sum + stake.amount, 0);
    const cappingMultiplier = rankRule.cappingMultiplier || 0;
    const currentCap = totalActiveStake * cappingMultiplier;

    // NEW: Check if cap is reached
    const totalReceived = directReferrer.totalBRankBonusReceived || 0;
    const remainingCap = currentCap - totalReceived;

    if (remainingCap <= 0) {
        // Cap reached, no bonus distributed
        return 0;
    }

    // Calculate B-Rank bonus as a percentage of the direct referral's yield
    const calculatedBonus = (yieldAmount * rankRule.commissionRate) / 100;

    // NEW: Cap the bonus if it exceeds remaining cap
    const actualBonus = Math.min(calculatedBonus, remainingCap);

    // Check if BLS system is enabled
    const blsConfig = await ctx.db.query("blsConfig").first();
    const isBLSEnabled = blsConfig?.isEnabled || false;

    if (isBLSEnabled) {
        // Credit BLS instead of USDT
        await ctx.runMutation(internal.bls.creditBLS, {
            userId: directReferrer._id,
            amount: actualBonus,
            description: `${directReferrer.currentRank} Rank Bonus from ${staker.name}'s stake`,
            referenceId: stakeId,
            transactionType: "commission_vrank",
        });

        // Update total B-Rank bonuses received
        await ctx.db.patch(directReferrer._id, {
            totalBRankBonusReceived: totalReceived + actualBonus
        });
    } else {
        // Credit USDT directly (existing behavior)
        await ctx.db.insert("transactions", {
            userId: directReferrer._id,
            amount: actualBonus,
            type: "commission_vrank",
            referenceId: stakeId,
            description: `${directReferrer.currentRank} Rank Bonus from ${staker.name}'s stake`,
            timestamp: now,
        });

        // Update wallet balance and total B-Rank bonuses received
        await ctx.db.patch(directReferrer._id, {
            walletBalance: (directReferrer.walletBalance || 0) + actualBonus,
            totalBRankBonusReceived: totalReceived + actualBonus
        });
    }

    // NEW: Notify user if they've reached or are close to their cap
    const newTotalReceived = totalReceived + actualBonus;
    const newRemainingCap = currentCap - newTotalReceived;

    const currency = isBLSEnabled ? "BLS" : "USDT";
    const currencySymbol = isBLSEnabled ? "" : "$";

    if (newRemainingCap <= 0) {
        // Cap reached
        await notify(
            ctx,
            directReferrer._id,
            "system",
            "B-Rank Bonus Cap Reached",
            `You've reached your ${directReferrer.currentRank} bonus cap of ${currencySymbol}${currentCap.toFixed(2)} ${currency}. Stake more to increase your cap and continue earning bonuses!`,
            "Info",
            {
                cap: currentCap,
                totalReceived: newTotalReceived,
                totalActiveStake,
                cappingMultiplier,
                currency
            }
        );
    } else if (actualBonus < calculatedBonus) {
        // Partial bonus due to cap
        await notify(
            ctx,
            directReferrer._id,
            "system",
            "B-Rank Bonus Partially Capped",
            `Your ${directReferrer.currentRank} bonus was capped. You have ${currencySymbol}${newRemainingCap.toFixed(2)} ${currency} remaining before reaching your cap of ${currencySymbol}${currentCap.toFixed(2)} ${currency}.`,
            "Info",
            {
                calculatedBonus,
                actualBonus,
                remainingCap: newRemainingCap,
                cap: currentCap,
                currency
            }
        );
    } else if (isBLSEnabled) {
        // Notify about BLS bonus earned
        await notify(
            ctx,
            directReferrer._id,
            "commission",
            `${directReferrer.currentRank} Rank Bonus Earned (BLS)`,
            `You earned ${actualBonus.toFixed(2)} BLS from ${staker.name}'s stake! Swap to USDT anytime.`,
            "Gift",
            { amount: actualBonus, rank: directReferrer.currentRank, fromUser: staker.name, currency: "BLS" }
        );
    }

    return actualBonus;
}

/**
 * Legacy function - kept for backward compatibility
 * Use distributeReferralBonuses and distributeVRankBonuses instead
 */
async function distributeCommissions(ctx: any, stakerId: any, yieldAmount: number, now: number, stakeId: any) {
    let currentUserId = stakerId;
    let level = 1;
    const MAX_LEVELS = 7; // Configurable

    while (level <= MAX_LEVELS) {
        const user = await ctx.db.get(currentUserId);
        if (!user || !user.referrerId) break;

        const referrer = await ctx.db.get(user.referrerId);
        if (!referrer) break;

        // Calculate Rate based on Rank and Level
        const rate = getCommissionRate(referrer.currentRank, level);

        if (rate > 0) {
            const commission = (yieldAmount * rate) / 100;

            await ctx.db.insert("transactions", {
                userId: referrer._id,
                amount: commission,
                type: level === 1 ? "commission_direct" : "commission_indirect",
                referenceId: stakeId,
                description: `L${level} Commission from ${user.name}`,
                timestamp: now,
            });

            await ctx.db.patch(referrer._id, { walletBalance: (referrer.walletBalance || 0) + commission });
        }

        currentUserId = referrer._id;
        level++;
    }
}

function getCommissionRate(rank: string, level: number): number {
    // Logic based on user requirements
    // "L1 is 15%, L2 is 10%"
    // "V1 rank bonus is Direct Referral Commission (20%)"

    // Base Rates
    let rate = 0;
    if (level === 1) rate = 15;
    if (level === 2) rate = 10;

    // Rank Overrides (Simplified)
    if (rank === "V1" && level === 1) rate = 20;
    if (rank === "V2" && level === 1) rate = 25;
    // ... add more rules as needed

    return rate;
}
