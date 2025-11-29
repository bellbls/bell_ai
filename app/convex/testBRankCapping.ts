import { mutation } from "./_generated/server";

/**
 * Test Helper: Initialize B-Rank Capping Data
 * 
 * This function initializes the data needed for B-Rank capping to work:
 * 1. Adds capping multipliers to existing ranks (if missing)
 * 2. Initializes totalBRankBonusReceived for all users
 * 
 * Run this once: npx convex run testBRankCapping:initializeTestData
 */
export const initializeTestData = mutation({
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

                // Determine default multiplier based on rank
                let defaultMultiplier = 2; // B1-B3
                if (rule.rank >= "B4" && rule.rank <= "B6") {
                    defaultMultiplier = 3;
                } else if (rule.rank >= "B7" && rule.rank <= "B9") {
                    defaultMultiplier = 5;
                }

                ranksUpdated++;
                console.log(`Adding cappingMultiplier ${defaultMultiplier}x to ${rule.rank}`);

                return {
                    ...rule,
                    cappingMultiplier: defaultMultiplier,
                };
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
                if (totalReceived > 0) {
                    console.log(`User ${user.name}: Initialized with $${totalReceived.toFixed(2)} in historical bonuses`);
                }
            }
        }

        return {
            success: true,
            message: `Initialized ${ranksUpdated} ranks and ${usersUpdated} users`,
            details: {
                ranksUpdated,
                usersUpdated,
                totalUsers: users.length,
            },
        };
    },
});
