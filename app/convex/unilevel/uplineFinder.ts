import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Find upline users up to a specified number of levels
 * Returns array of { userId, level } where level 1 is direct referrer
 */
export async function findUpline(
    ctx: QueryCtx | MutationCtx,
    userId: Id<"users">,
    maxLevels: number = 10
): Promise<Array<{ userId: Id<"users">; level: number }>> {
    const upline: Array<{ userId: Id<"users">; level: number }> = [];
    let currentUser = await ctx.db.get(userId);
    let level = 1;

    while (currentUser?.referrerId && level <= maxLevels) {
        upline.push({
            userId: currentUser.referrerId,
            level: level,
        });

        currentUser = await ctx.db.get(currentUser.referrerId);
        level++;
    }

    return upline;
}

/**
 * Find all downline users (descendants) up to a specified number of levels
 * Useful for tree visualization
 */
export async function findDownline(
    ctx: QueryCtx | MutationCtx,
    userId: Id<"users">,
    maxLevels: number = 10
): Promise<Array<{ userId: Id<"users">; level: number; email: string }>> {
    const downline: Array<{ userId: Id<"users">; level: number; email: string }> = [];

    async function traverse(currentUserId: Id<"users">, currentLevel: number) {
        if (currentLevel > maxLevels) return;

        const directs = await ctx.db
            .query("users")
            .withIndex("by_referrerId", (q) => q.eq("referrerId", currentUserId))
            .collect();

        for (const direct of directs) {
            downline.push({
                userId: direct._id,
                level: currentLevel,
                email: direct.email,
            });

            // Recursively get their referrals
            await traverse(direct._id, currentLevel + 1);
        }
    }

    await traverse(userId, 1);
    return downline;
}
