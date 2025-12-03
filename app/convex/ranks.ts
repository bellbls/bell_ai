import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { notify } from "./notifications";

// Helper to get rank weight for comparison
function getRankWeight(rank: string): number {
    const ranks = ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"];
    return ranks.indexOf(rank);
}

/**
 * Update team volume for all uplines when a stake is created or expires
 * @param ctx - Mutation context
 * @param accountId - Account whose stake changed (new system)
 * @param amount - Amount to add (positive) or subtract (negative)
 */
export async function updateTeamVolume(ctx: MutationCtx, accountId: Id<"accounts">, amount: number) {
    let currentAccount = await ctx.db.get(accountId);
    if (!currentAccount) return;

    // 1. Update Account's Own Volume (Total Volume = Personal + Team)
    const newPersonalVolume = Math.max(0, (currentAccount.teamVolume || 0) + amount);
    await ctx.db.patch(currentAccount._id, { teamVolume: newPersonalVolume });

    // Check for Rank Update for the account themselves
    await updateRank(ctx, currentAccount._id);

    // 2. Traverse up the referral tree
    let depth = 0;
    const MAX_DEPTH = 50; // Reasonable limit for unilevel structure

    while (currentAccount && currentAccount.referrerId && depth < MAX_DEPTH) {
        const referrer: any = await ctx.db.get(currentAccount.referrerId);
        if (!referrer) break;

        // Update volume
        // Ensure volume doesn't go below 0
        const newVolume = Math.max(0, (referrer.teamVolume || 0) + amount);
        await ctx.db.patch(referrer._id, { teamVolume: newVolume });

        // Check for Rank Update (Upgrade or Downgrade)
        // This is crucial for dynamic rank management
        await updateRank(ctx, referrer._id);

        // Move up the tree
        currentAccount = referrer;
        depth++;
    }
}

/**
 * Update user's rank based on current conditions
 * This function implements DYNAMIC RANK logic:
 * - Upgrades when conditions are met
 * - Downgrades immediately when conditions are no longer met
 * 
 * Rank Requirements:
 * 1. Minimum Team Volume (accumulative stakes from all downlines)
 * 2. Minimum Direct Referrals count
 * 3. Structure Requirement (for B2+): Minimum 2 direct referrals who achieved previous rank
 * 
 * Example for B2:
 * - Team Volume: $10,000
 * - Direct Referrals: 5
 * - Structure: 2 of the 5 directs must be B1 or higher
 */
export async function updateRank(ctx: MutationCtx, accountId: Id<"accounts">) {
    const account = await ctx.db.get(accountId);
    if (!account) return;

    const config = await ctx.db
        .query("configs")
        .withIndex("by_key", (q) => q.eq("key", "rank_rules"))
        .unique();

    const rules = config?.value || [];
    // Sort rules by difficulty (highest rank first) to find the max rank met
    rules.sort((a: any, b: any) => getRankWeight(b.rank) - getRankWeight(a.rank));

    let newRank = "B0";

    // Get Direct Referrals for structure check
    const directReferrals = await ctx.db
        .query("accounts")
        .withIndex("by_referrerId", (q) => q.eq("referrerId", accountId))
        .collect();

    // Count active direct referrals (those with active stakes)
    // For now, we count all direct referrals
    // Future enhancement: Only count those with active stakes
    const activeDirectsCount = directReferrals.length;

    // Check each rank requirement from highest to lowest
    for (const rule of rules) {
        const volumeMet = account.teamVolume >= rule.minTeamVolume;
        const directsMet = activeDirectsCount >= rule.minDirectReferrals;

        let structureMet = true;

        // Check structure requirement (for B2+)
        // Example: To reach B2, need 2 directs who are B1+
        if (rule.requiredRankDirects && rule.requiredRankDirects.count > 0) {
            const requiredRank = rule.requiredRankDirects.rank;
            const requiredCount = rule.requiredRankDirects.count;

            // Count how many direct referrals have achieved the required rank or higher
            const qualifiedDirects = directReferrals.filter(d =>
                getRankWeight(d.currentRank) >= getRankWeight(requiredRank)
            ).length;

            if (qualifiedDirects < requiredCount) {
                structureMet = false;
            }
        }

        // All conditions must be met
        if (volumeMet && directsMet && structureMet) {
            newRank = rule.rank;
            break; // Found highest rank that account qualifies for
        }
    }

    // Update rank if it changed (upgrade or downgrade)
    if (newRank !== account.currentRank) {
        const oldRank = account.currentRank;
        await ctx.db.patch(accountId, { currentRank: newRank });

        // Notify account of rank change
        const isUpgrade = getRankWeight(newRank) > getRankWeight(oldRank);
        await notify(
            ctx,
            accountId,
            "rank",
            isUpgrade ? "Rank Advancement!" : "Rank Update",
            isUpgrade
                ? `Congratulations! You've been promoted to ${newRank}! 🎉`
                : `Your rank has been updated to ${newRank}.`,
            isUpgrade ? "Award" : "Info",
            { oldRank, newRank, isUpgrade }
        );

        // Propagate change up the tree
        // This is important because my rank change might affect my referrer's structure requirement
        // Example: If I downgrade from B1 to B0, my referrer might lose B2 qualification
        if (account.referrerId) {
            // We don't need to update volume, just check rank
            await updateRank(ctx, account.referrerId);
        }
    }
}

/**
 * Get active direct referrals count (those with active stakes)
 * This is a more strict check for "active referrals"
 */
async function getActiveDirectReferralsCount(ctx: MutationCtx, accountId: Id<"accounts">): Promise<number> {
    const directReferrals = await ctx.db
        .query("accounts")
        .withIndex("by_referrerId", (q) => q.eq("referrerId", accountId))
        .collect();

    let activeCount = 0;

    for (const referral of directReferrals) {
        // Check if this referral has any active stakes
        const activeStakes = await ctx.db
            .query("stakes")
            .withIndex("by_accountId", (q) => q.eq("accountId", referral._id))
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();

        if (activeStakes.length > 0) {
            activeCount++;
        }
    }

    return activeCount;
}
