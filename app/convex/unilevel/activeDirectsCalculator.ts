import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { calculateUnlockedLevels } from "./commissionRates";

/**
 * Calculate the number of active direct referrals for a user
 * A direct referral is "active" if they have at least one active stake
 */
export async function calculateActiveDirects(
    ctx: QueryCtx | MutationCtx,
    userId: Id<"users">
): Promise<number> {
    // Get all direct referrals
    const directs = await ctx.db
        .query("users")
        .withIndex("by_referrerId", (q) => q.eq("referrerId", userId))
        .collect();

    // Count how many have active stakes
    let activeCount = 0;
    for (const direct of directs) {
        const hasActiveStake = await ctx.db
            .query("stakes")
            .withIndex("by_userId", (q) => q.eq("userId", direct._id))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();

        if (hasActiveStake) {
            activeCount++;
        }
    }

    return activeCount;
}

/**
 * Update a user's active direct referrals count and unlocked levels
 */
export async function updateActiveDirects(
    ctx: MutationCtx,
    userId: Id<"users">
): Promise<{ activeDirects: number; unlockedLevels: number }> {
    const activeDirects = await calculateActiveDirects(ctx, userId);
    const unlockedLevels = calculateUnlockedLevels(activeDirects);

    await ctx.db.patch(userId, {
        activeDirectReferrals: activeDirects,
        unlockedLevels: unlockedLevels,
        lastUnlockUpdate: Date.now(),
    });

    return { activeDirects, unlockedLevels };
}
