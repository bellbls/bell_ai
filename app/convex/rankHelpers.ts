import { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get user's or account's total active stake amount
 * Only counts stakes with status "active"
 * Supports both accountId and userId for multi-account migration
 */
export async function getUserActiveStakeTotal(
    ctx: MutationCtx | QueryCtx,
    id: Id<"accounts"> | Id<"users">
): Promise<number> {
    // Try to determine if it's an account or user by checking which table it belongs to
    let isAccount = false;
    try {
        const account = await ctx.db.get(id as Id<"accounts">);
        if (account && "loginId" in account) {
            isAccount = true;
        }
    } catch {
        // If get fails or doesn't have loginId, it's likely a user
    }

    let activeStakes = [];
    if (isAccount) {
        // Query by accountId
        activeStakes = await ctx.db
            .query("stakes")
            .withIndex("by_accountId", (q) => q.eq("accountId", id as Id<"accounts">))
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();
    } else {
        // Query by userId (legacy)
        activeStakes = await ctx.db
            .query("stakes")
            .withIndex("by_userId", (q) => q.eq("userId", id as Id<"users">))
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();
    }

    return activeStakes.reduce((sum, stake) => sum + stake.amount, 0);
}

/**
 * Get user's or account's B-Rank bonus cap based on their current rank and active stakes
 * Cap = Total Active Stake × Capping Multiplier
 * Supports both accountId and userId for multi-account migration
 */
export async function getUserBRankCap(
    ctx: MutationCtx | QueryCtx,
    id: Id<"accounts"> | Id<"users">
): Promise<number> {
    // Try to get as account first, then user
    let account = null;
    try {
        account = await ctx.db.get(id as Id<"accounts">);
        if (account && !("loginId" in account)) {
            account = null; // Not an account
        }
    } catch {
        // Not an account
    }

    if (!account) {
        // Try as user
        account = await ctx.db.get(id as Id<"users">);
    }

    if (!account || account.currentRank === "B0") return 0;

    // Get rank configuration
    const config = await ctx.db
        .query("configs")
        .withIndex("by_key", (q) => q.eq("key", "rank_rules"))
        .unique();

    const rules = config?.value || [];
    const rankRule = rules.find((r: any) => r.rank === account.currentRank);

    if (!rankRule || !rankRule.cappingMultiplier) return 0;

    // Calculate cap based on active stakes
    const totalActiveStake = await getUserActiveStakeTotal(ctx, id);
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
 * Get detailed B-Rank cap information for a user or account
 * Supports both accountId and userId for multi-account migration
 */
export async function getUserBRankCapInfo(
    ctx: MutationCtx | QueryCtx,
    id: Id<"accounts"> | Id<"users">
) {
    // Try to get as account first, then user
    let account = null;
    try {
        account = await ctx.db.get(id as Id<"accounts">);
        if (account && !("loginId" in account)) {
            account = null; // Not an account
        }
    } catch {
        // Not an account
    }

    if (!account) {
        // Try as user
        account = await ctx.db.get(id as Id<"users">);
    }

    if (!account) {
        throw new Error("Account or user not found");
    }

    const totalActiveStake = await getUserActiveStakeTotal(ctx, id);
    const currentCap = await getUserBRankCap(ctx, id);
    const totalReceived = account.totalBRankBonusReceived || 0;
    const remainingCap = Math.max(0, currentCap - totalReceived);

    // Get capping multiplier from rank config
    const config = await ctx.db
        .query("configs")
        .withIndex("by_key", (q) => q.eq("key", "rank_rules"))
        .unique();

    const rules = config?.value || [];
    const rankRule = rules.find((r: any) => r.rank === account.currentRank);
    const cappingMultiplier = rankRule?.cappingMultiplier || 0;

    return {
        currentRank: account.currentRank,
        totalActiveStake,
        cappingMultiplier,
        currentCap,
        totalReceived,
        remainingCap,
        isCapReached: remainingCap <= 0,
    };
}
