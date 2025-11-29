import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { updateRank, updateTeamVolume } from "./ranks";
import { createError, ErrorCodes, isValidRankName, isValidAmount } from "./errors";

// Force rebuild - B-Rank Capping Migrations Added

/**
 * Admin Mutations
 * 
 * Create, update, and delete B-Ranks and Staking Cycles
 */

// ==================== B-RANK MANAGEMENT ====================

export const createVRank = mutation({
    args: {
        rank: v.string(),
        minTeamVolume: v.number(),
        minDirectReferrals: v.number(),
        requiredRankDirects: v.object({
            count: v.number(),
            rank: v.string(),
        }),
        commissionRate: v.number(),
        cappingMultiplier: v.number(), // e.g., 2 for 2x of active stake
    },
    handler: async (ctx, args) => {
        // Validate input
        if (!isValidRankName(args.rank)) {
            throw createError(ErrorCodes.INVALID_RANK_CONFIG, 'Rank name must be in format B0, B1, B2, etc.');
        }

        if (!isValidAmount(args.minTeamVolume, 0)) {
            throw createError(ErrorCodes.INVALID_RANK_CONFIG, 'Minimum team volume must be a positive number');
        }

        if (args.commissionRate < 0 || args.commissionRate > 100) {
            throw createError(ErrorCodes.INVALID_RANK_CONFIG, 'Commission rate must be between 0 and 100');
        }

        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "rank_rules"))
            .unique();

        const currentRules = config?.value || [];

        // Check if rank already exists
        const existingRank = currentRules.find((r: any) => r.rank === args.rank);
        if (existingRank) {
            throw createError(ErrorCodes.RANK_ALREADY_EXISTS);
        }

        // Add new rank
        const newRules = [...currentRules, {
            rank: args.rank,
            minTeamVolume: args.minTeamVolume,
            minDirectReferrals: args.minDirectReferrals,
            requiredRankDirects: args.requiredRankDirects,
            commissionRate: args.commissionRate,
            cappingMultiplier: args.cappingMultiplier,
        }];

        // Update config
        if (config) {
            await ctx.db.patch(config._id, { value: newRules });
        } else {
            await ctx.db.insert("configs", { key: "rank_rules", value: newRules });
        }

        return { success: true, message: `Rank ${args.rank} created successfully` };
    },
});

export const updateVRank = mutation({
    args: {
        rank: v.string(),
        minTeamVolume: v.number(),
        minDirectReferrals: v.number(),
        requiredRankDirects: v.object({
            count: v.number(),
            rank: v.string(),
        }),
        commissionRate: v.number(),
        cappingMultiplier: v.number(), // e.g., 2 for 2x of active stake
    },
    handler: async (ctx, args) => {
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "rank_rules"))
            .unique();

        if (!config) {
            throw new Error("Rank rules configuration not found");
        }

        const currentRules = config.value || [];

        // Find and update the rank
        const updatedRules = currentRules.map((r: any) => {
            if (r.rank === args.rank) {
                return {
                    rank: args.rank,
                    minTeamVolume: args.minTeamVolume,
                    minDirectReferrals: args.minDirectReferrals,
                    requiredRankDirects: args.requiredRankDirects,
                    commissionRate: args.commissionRate,
                    cappingMultiplier: args.cappingMultiplier,
                };
            }
            return r;
        });

        await ctx.db.patch(config._id, { value: updatedRules });

        // Trigger rank recalculation for all users
        // This could be done in a background job for better performance
        const users = await ctx.db.query("users").collect();

        for (const user of users) {
            await updateRank(ctx, user._id);
        }


        return { success: true, message: `Rank ${args.rank} updated successfully` };
    },
});

export const deleteVRank = mutation({
    args: {
        rank: v.string(),
    },
    handler: async (ctx, args) => {
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "rank_rules"))
            .unique();

        if (!config) {
            throw new Error("Rank rules configuration not found");
        }

        const currentRules = config.value || [];

        // Remove the rank
        const updatedRules = currentRules.filter((r: any) => r.rank !== args.rank);

        await ctx.db.patch(config._id, { value: updatedRules });

        return { success: true, message: `Rank ${args.rank} deleted successfully` };
    },
});

// ==================== STAKING CYCLE MANAGEMENT ====================

export const createStakingCycle = mutation({
    args: {
        days: v.number(),
        dailyRate: v.number(),
    },
    handler: async (ctx, args) => {
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "staking_cycles"))
            .unique();

        const currentCycles = config?.value || [];

        // Check if cycle already exists
        const existingCycle = currentCycles.find((c: any) => c.days === args.days);
        if (existingCycle) {
            throw new Error(`Staking cycle for ${args.days} days already exists`);
        }

        // Add new cycle
        const newCycles = [...currentCycles, {
            days: args.days,
            dailyRate: args.dailyRate,
        }];

        // Sort by days
        newCycles.sort((a: any, b: any) => a.days - b.days);

        // Update config
        if (config) {
            await ctx.db.patch(config._id, { value: newCycles });
        } else {
            await ctx.db.insert("configs", { key: "staking_cycles", value: newCycles });
        }

        return { success: true, message: `Staking cycle for ${args.days} days created successfully` };
    },
});

export const updateStakingCycle = mutation({
    args: {
        days: v.number(),
        dailyRate: v.number(),
    },
    handler: async (ctx, args) => {
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "staking_cycles"))
            .unique();

        if (!config) {
            throw new Error("Staking cycles configuration not found");
        }

        const currentCycles = config.value || [];

        // Find and update the cycle
        const updatedCycles = currentCycles.map((c: any) => {
            if (c.days === args.days) {
                return {
                    days: args.days,
                    dailyRate: args.dailyRate,
                };
            }
            return c;
        });

        await ctx.db.patch(config._id, { value: updatedCycles });

        return { success: true, message: `Staking cycle for ${args.days} days updated successfully` };
    },
});

export const deleteStakingCycle = mutation({
    args: {
        days: v.number(),
    },
    handler: async (ctx, args) => {
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "staking_cycles"))
            .unique();

        if (!config) {
            throw new Error("Staking cycles configuration not found");
        }

        const currentCycles = config.value || [];

        // Remove the cycle
        const updatedCycles = currentCycles.filter((c: any) => c.days !== args.days);

        await ctx.db.patch(config._id, { value: updatedCycles });

        return { success: true, message: `Staking cycle for ${args.days} days deleted successfully` };
    },
});

// ==================== USER MANAGEMENT ====================

export const updateUserRank = mutation({
    args: {
        userId: v.id("users"),
        newRank: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("User not found");
        }

        await ctx.db.patch(args.userId, { currentRank: args.newRank });

        return { success: true, message: `User rank updated to ${args.newRank}` };
    },
});

export const updateUserVolume = mutation({
    args: {
        userId: v.id("users"),
        volumeChange: v.number(),
    },
    handler: async (ctx, args) => {
        await updateTeamVolume(ctx, args.userId, args.volumeChange);

        return { success: true, message: "User volume updated successfully" };
    },
});

export const recalculateAllRanks = mutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        let count = 0;
        for (const user of users) {
            await updateRank(ctx, user._id);
            count++;
        }
        return { success: true, message: `Recalculated ranks for ${count} users` };
    },
});

// ==================== B-RANK CAPPING MIGRATIONS ====================

/**
 * Migration: Add Capping Multiplier to Existing B-Ranks
 * Run: adminMutations.addCappingMultiplierToRanks({})
 */
export const addCappingMultiplierToRanks = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("Starting migration: Add capping multiplier to B-Ranks...");

        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q: any) => q.eq("key", "rank_rules"))
            .unique();

        if (!config) {
            console.log("No rank_rules config found. Skipping migration.");
            return { success: true, message: "No ranks to migrate" };
        }

        const currentRules = config.value || [];
        let updatedCount = 0;

        const updatedRules = currentRules.map((rule: any) => {
            // Skip if already has cappingMultiplier
            if (rule.cappingMultiplier !== undefined) {
                return rule;
            }

            // Determine default multiplier based on rank
            let defaultMultiplier = 2; // Default for B1-B3

            if (rule.rank >= "B4" && rule.rank <= "B6") {
                defaultMultiplier = 3;
            } else if (rule.rank >= "B7" && rule.rank <= "B9") {
                defaultMultiplier = 5;
            }

            updatedCount++;
            console.log(`Adding cappingMultiplier ${defaultMultiplier}x to ${rule.rank}`);

            return {
                ...rule,
                cappingMultiplier: defaultMultiplier,
            };
        });

        await ctx.db.patch(config._id, { value: updatedRules });

        console.log(`Migration complete. Updated ${updatedCount} ranks.`);
        return {
            success: true,
            message: `Added capping multiplier to ${updatedCount} ranks`,
            updatedRules
        };
    },
});

/**
 * Migration: Initialize totalBRankBonusReceived for Existing Users
 * Run: adminMutations.initializeBRankBonusTracking({})
 */
export const initializeBRankBonusTracking = mutation({
    args: {},
    handler: async (ctx) => {
        console.log("Starting migration: Initialize B-Rank bonus tracking...");

        const users = await ctx.db.query("users").collect();
        let updatedCount = 0;

        for (const user of users) {
            // Skip if already initialized
            if (user.totalBRankBonusReceived !== undefined) {
                continue;
            }

            // Calculate total B-Rank bonuses from transaction history
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

            updatedCount++;
            if (totalReceived > 0) {
                console.log(`User ${user.name}: Initialized with $${totalReceived.toFixed(2)} in historical B-Rank bonuses`);
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} users.`);
        return {
            success: true,
            message: `Initialized B-Rank bonus tracking for ${updatedCount} users`
        };
    },
});
