import { internalMutation } from "./_generated/server";

/**
 * Migration: Add Capping Multiplier to Existing B-Ranks
 * 
 * This migration adds a default cappingMultiplier to existing B-Rank configurations
 * that don't have one yet.
 * 
 * Default multipliers:
 * - B1-B3: 2x
 * - B4-B6: 3x
 * - B7-B9: 5x
 */
export const addCappingMultiplierToRanks = internalMutation({
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
 * 
 * This migration initializes the totalBRankBonusReceived field for existing users
 * by calculating their historical B-Rank bonuses from transactions.
 */
export const initializeBRankBonusTracking = internalMutation({
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
