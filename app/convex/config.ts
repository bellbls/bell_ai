import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const DEFAULT_RANK_RULES = [
    { rank: "V1", minTeamVolume: 3000, minDirectReferrals: 5, requiredRankDirects: { count: 0, rank: "" }, commissionRate: 20 },
    { rank: "V2", minTeamVolume: 10000, minDirectReferrals: 5, requiredRankDirects: { count: 2, rank: "V1" }, commissionRate: 25 },
    { rank: "V3", minTeamVolume: 30000, minDirectReferrals: 5, requiredRankDirects: { count: 2, rank: "V2" }, commissionRate: 30 },
    { rank: "V4", minTeamVolume: 100000, minDirectReferrals: 5, requiredRankDirects: { count: 2, rank: "V3" }, commissionRate: 35 },
    { rank: "V5", minTeamVolume: 300000, minDirectReferrals: 5, requiredRankDirects: { count: 2, rank: "V4" }, commissionRate: 40 },
    { rank: "V6", minTeamVolume: 1000000, minDirectReferrals: 5, requiredRankDirects: { count: 2, rank: "V5" }, commissionRate: 45 },
    { rank: "V7", minTeamVolume: 3000000, minDirectReferrals: 5, requiredRankDirects: { count: 2, rank: "V6" }, commissionRate: 50 },
    { rank: "V8", minTeamVolume: 10000000, minDirectReferrals: 5, requiredRankDirects: { count: 2, rank: "V7" }, commissionRate: 55 },
    { rank: "V9", minTeamVolume: 30000000, minDirectReferrals: 5, requiredRankDirects: { count: 2, rank: "V8" }, commissionRate: 60 },
];

export const DEFAULT_STAKING_CYCLES = [
    { days: 7, dailyRate: 0.45 },
    { days: 30, dailyRate: 0.60 },
    { days: 90, dailyRate: 0.75 },
    { days: 360, dailyRate: 1.00 },
];

export const DEFAULT_COMMISSION_RATES = {
    L1: 15, // 15% of Daily Yield
    L2: 10, // 10% of Daily Yield
};

export const initializeDefaults = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db.query("configs").first();
        if (existing) return;

        await ctx.db.insert("configs", { key: "rank_rules", value: DEFAULT_RANK_RULES });
        await ctx.db.insert("configs", { key: "staking_cycles", value: DEFAULT_STAKING_CYCLES });
        await ctx.db.insert("configs", { key: "commission_rates", value: DEFAULT_COMMISSION_RATES });
        await ctx.db.insert("configs", { key: "twoFactorMandatory", value: false });
    },
});

export const get = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .unique();
        return config?.value;
    },
});

export const update = mutation({
    args: { key: v.string(), value: v.any() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, { value: args.value });
        } else {
            await ctx.db.insert("configs", { key: args.key, value: args.value });
        }
    },
});

/**
 * Initialize B-Rank Capping Data
 * Run: npx convex run config:initializeBRankCapping
 * Or in dashboard: select config:initializeBRankCapping with args {}
 */
export const initializeBRankCapping = mutation({
    args: {},
    handler: async (ctx) => {
        let ranksUpdated = 0;
        let usersUpdated = 0;

        // 1. Add capping multipliers to ranks
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q: any) => q.eq("key", "rank_rules"))
            .unique();

        if (config) {
            const updatedRules = (config.value || []).map((rule: any) => {
                if (rule.cappingMultiplier !== undefined) {
                    return rule; // Already has multiplier
                }

                // Default multipliers: B1-B3=2x, B4-B6=3x, B7-B9=5x
                let defaultMultiplier = 2;
                if (rule.rank >= "B4" && rule.rank <= "B6") {
                    defaultMultiplier = 3;
                } else if (rule.rank >= "B7" && rule.rank <= "B9") {
                    defaultMultiplier = 5;
                }

                ranksUpdated++;
                return { ...rule, cappingMultiplier: defaultMultiplier };
            });

            await ctx.db.patch(config._id, { value: updatedRules });
        }

        // 2. Initialize totalBRankBonusReceived for all users
        const users = await ctx.db.query("users").collect();

        for (const user of users) {
            if (user.totalBRankBonusReceived === undefined) {
                // Calculate historical bonuses from transactions
                const brankTransactions = await ctx.db
                    .query("transactions")
                    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
                    .filter((q: any) => q.eq(q.field("type"), "commission_vrank"))
                    .collect();

                const totalReceived = brankTransactions.reduce(
                    (sum: number, tx: any) => sum + tx.amount,
                    0
                );

                await ctx.db.patch(user._id, {
                    totalBRankBonusReceived: totalReceived,
                });

                usersUpdated++;
            }
        }

        return {
            success: true,
            message: `✅ Initialized ${ranksUpdated} ranks and ${usersUpdated} users`,
            details: { ranksUpdated, usersUpdated, totalUsers: users.length }
        };
    },
});

/**
 * Initialize Unilevel Active Directs for All Users
 * Run: npx convex run config:initializeUnilevelData
 */
export const initializeUnilevelData = mutation({
    args: {},
    handler: async (ctx) => {
        const { calculateActiveDirects } = await import("./unilevel/activeDirectsCalculator");
        const { calculateUnlockedLevels } = await import("./unilevel/commissionRates");

        const users = await ctx.db.query("users").collect();
        let updatedCount = 0;

        for (const user of users) {
            // Calculate active directs
            const activeDirects = await calculateActiveDirects(ctx, user._id);
            const unlockedLevels = calculateUnlockedLevels(activeDirects);

            // Update user
            await ctx.db.patch(user._id, {
                activeDirectReferrals: activeDirects,
                unlockedLevels: unlockedLevels,
                lastUnlockUpdate: Date.now(),
            });

            updatedCount++;
            if (activeDirects > 0) {
                console.log(`User ${user.name}: ${activeDirects} active directs, ${unlockedLevels} levels unlocked`);
            }
        }

        return {
            success: true,
            message: `Initialized unilevel data for ${updatedCount} users`,
            updatedCount,
        };
    },
});
