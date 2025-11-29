import { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get user's total active stake amount
 * Only counts stakes with status "active"
 */
export async function getUserActiveStakeTotal(
    ctx: MutationCtx | QueryCtx,
    userId: Id<"users">
): Promise<number> {
    const activeStakes = await ctx.db
        .query("stakes")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

    return activeStakes.reduce((sum, stake) => sum + stake.amount, 0);
}

/**
 * Get user's B-Rank bonus cap based on their current rank and active stakes
 * Cap = Total Active Stake × Capping Multiplier
 */
export async function getUserBRankCap(
    ctx: MutationCtx | QueryCtx,
    userId: Id<"users">
): Promise<number> {
    const user = await ctx.db.get(userId);
    if (!user || user.currentRank === "B0") return 0;

    // Get rank configuration
    const config = await ctx.db
        .query("configs")
        .withIndex("by_key", (q) => q.eq("key", "rank_rules"))
        .unique();

    const rules = config?.value || [];
    const rankRule = rules.find((r: any) => r.rank === user.currentRank);

    if (!rankRule || !rankRule.cappingMultiplier) return 0;

    // Calculate cap based on active stakes
    const totalActiveStake = await getUserActiveStakeTotal(ctx, userId);
    return totalActiveStake * rankRule.cappingMultiplier;
}

/**
 * Get user's remaining B-Rank bonus cap
 * Remaining Cap = Current Cap - Total Bonuses Received
 */
export async function getUserRemainingBRankCap(
    ctx: MutationCtx | QueryCtx,
    userId: Id<"users">
): Promise<number> {
    const user = await ctx.db.get(userId);
    if (!user) return 0;

    const currentCap = await getUserBRankCap(ctx, userId);
    const totalReceived = user.totalBRankBonusReceived || 0;

    return Math.max(0, currentCap - totalReceived);
}

/**
 * Get detailed B-Rank cap information for a user
 */
export async function getUserBRankCapInfo(
    ctx: MutationCtx | QueryCtx,
    userId: Id<"users">
) {
    const user = await ctx.db.get(userId);
    if (!user) {
        throw new Error("User not found");
    }

    const totalActiveStake = await getUserActiveStakeTotal(ctx, userId);
    const currentCap = await getUserBRankCap(ctx, userId);
    const totalReceived = user.totalBRankBonusReceived || 0;
    const remainingCap = Math.max(0, currentCap - totalReceived);

    // Get capping multiplier from rank config
    const config = await ctx.db
        .query("configs")
        .withIndex("by_key", (q) => q.eq("key", "rank_rules"))
        .unique();

    const rules = config?.value || [];
    const rankRule = rules.find((r: any) => r.rank === user.currentRank);
    const cappingMultiplier = rankRule?.cappingMultiplier || 0;

    return {
        currentRank: user.currentRank,
        totalActiveStake,
        cappingMultiplier,
        currentCap,
        totalReceived,
        remainingCap,
        isCapReached: remainingCap <= 0,
    };
}
