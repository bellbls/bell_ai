import { mutation } from "./_generated/server";

/**
 * Migration Script: Convert V-Ranks to B-Ranks
 * 
 * This script updates all existing data in the database:
 * - User ranks: V0→B0, V1→B1, etc.
 * - Rank rules configuration
 * 
 * Run this once to migrate existing data.
 */

export const migrateVRanksToBRanks = mutation({
    args: {},
    handler: async (ctx) => {
        const startTime = Date.now();
        let usersUpdated = 0;
        let configsUpdated = 0;

        console.log("Starting V-Rank to B-Rank migration...");

        // 1. Update all users' currentRank
        const users = await ctx.db.query("users").collect();

        for (const user of users) {
            if (user.currentRank && user.currentRank.startsWith("V")) {
                const newRank = user.currentRank.replace("V", "B");
                await ctx.db.patch(user._id, { currentRank: newRank });
                usersUpdated++;
                console.log(`Updated user ${user.email}: ${user.currentRank} → ${newRank}`);
            }
        }

        // 2. Update rank_rules configuration
        const rankConfig = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "rank_rules"))
            .unique();

        if (rankConfig && rankConfig.value) {
            const updatedRules = rankConfig.value.map((rule: any) => {
                if (rule.rank && rule.rank.startsWith("V")) {
                    const newRank = rule.rank.replace("V", "B");
                    console.log(`Updating rank rule: ${rule.rank} → ${newRank}`);

                    // Also update requiredRankDirects if it exists
                    let updatedRequiredRankDirects = rule.requiredRankDirects;
                    if (rule.requiredRankDirects?.rank?.startsWith("V")) {
                        updatedRequiredRankDirects = {
                            ...rule.requiredRankDirects,
                            rank: rule.requiredRankDirects.rank.replace("V", "B")
                        };
                    }

                    return {
                        ...rule,
                        rank: newRank,
                        requiredRankDirects: updatedRequiredRankDirects
                    };
                }
                return rule;
            });

            await ctx.db.patch(rankConfig._id, { value: updatedRules });
            configsUpdated++;
            console.log("Updated rank_rules configuration");
        }

        const executionTime = Date.now() - startTime;

        const summary = {
            success: true,
            usersUpdated,
            configsUpdated,
            executionTimeMs: executionTime,
            message: `Migration complete! Updated ${usersUpdated} users and ${configsUpdated} configs in ${executionTime}ms`
        };

        console.log(summary.message);
        return summary;
    },
});
