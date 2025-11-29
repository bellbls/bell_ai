import { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { findUpline } from "./uplineFinder";
import { calculateActiveDirects } from "./activeDirectsCalculator";
import { getCommissionRate, calculateUnlockedLevels, formatReportingDate } from "./commissionRates";

/**
 * Distribute Unilevel commissions for a stake's daily yield
 * 
 * This function:
 * 1. Finds all upline users (up to L10)
 * 2. For each upline, checks if they have access to that level
 * 3. Calculates and pays commission if qualified
 * 4. Logs transaction and commission history
 */
export async function distributeUnilevelCommissions(
    ctx: MutationCtx,
    stakeId: Id<"stakes">,
    yieldAmount: number
): Promise<void> {
    const stake = await ctx.db.get(stakeId);
    if (!stake) {
        console.error(`Stake ${stakeId} not found`);
        return;
    }

    const stakeOwner = await ctx.db.get(stake.userId);
    if (!stakeOwner) {
        console.error(`Stake owner ${stake.userId} not found`);
        return;
    }

    // Find upline (up to L10)
    const upline = await findUpline(ctx, stake.userId, 10);

    const now = Date.now();
    const reportingDate = formatReportingDate(now);

    // Process each upline user
    for (const { userId: uplineUserId, level } of upline) {
        const uplineUser = await ctx.db.get(uplineUserId);
        if (!uplineUser) continue;

        // Calculate their unlocked levels
        const activeDirects = await calculateActiveDirects(ctx, uplineUserId);
        const unlockedLevels = calculateUnlockedLevels(activeDirects);

        // Check if they have access to this level
        if (level > unlockedLevels) {
            // Not qualified for this level - skip
            continue;
        }

        // Calculate commission
        const rate = getCommissionRate(level);
        const commission = yieldAmount * rate;

        if (commission <= 0) continue;

        // Check if BLS system is enabled
        const blsConfig = await ctx.db.query("blsConfig").first();
        const isBLSEnabled = blsConfig?.isEnabled || false;

        if (isBLSEnabled) {
            // Credit BLS instead of USDT
            await ctx.runMutation(internal.bls.creditBLS, {
                userId: uplineUserId,
                amount: commission,
                description: `L${level} Unilevel Commission from ${stakeOwner.email}`,
                referenceId: stakeId,
                transactionType: "commission_unilevel",
            });
        } else {
            // Pay commission to upline user (existing behavior)
            await ctx.db.patch(uplineUserId, {
                walletBalance: uplineUser.walletBalance + commission,
            });

            // Log transaction
            await ctx.db.insert("transactions", {
                userId: uplineUserId,
                amount: commission,
                type: "commission_unilevel",
                description: `L${level} Unilevel Commission from ${stakeOwner.email}`,
                timestamp: now,
                commissionLevel: level,
                commissionRate: rate,
                sourceStakeId: stakeId,
                sourceUserId: stake.userId,
            });
        }

        // Log commission history for reporting
        await ctx.db.insert("commission_history", {
            userId: uplineUserId,
            sourceUserId: stake.userId,
            sourceStakeId: stakeId,
            level: level,
            rate: rate,
            yieldAmount: yieldAmount,
            commissionAmount: commission,
            timestamp: now,
            date: reportingDate.date,
            week: reportingDate.week,
            month: reportingDate.month,
            year: reportingDate.year,
        });
    }
}

/**
 * Distribute commissions for multiple stakes (batch processing)
 * Useful for daily cron job
 */
export async function distributeBatchUnilevelCommissions(
    ctx: MutationCtx,
    stakes: Array<{ stakeId: Id<"stakes">; yieldAmount: number }>
): Promise<{ processed: number; totalCommissions: number }> {
    let processed = 0;
    let totalCommissions = 0;

    for (const { stakeId, yieldAmount } of stakes) {
        try {
            await distributeUnilevelCommissions(ctx, stakeId, yieldAmount);
            processed++;

            // Calculate total commissions paid (approximate)
            // This is for logging purposes
            totalCommissions += yieldAmount * 0.16; // Max possible: 16% total across all levels
        } catch (error) {
            console.error(`Failed to distribute commissions for stake ${stakeId}:`, error);
        }
    }

    return { processed, totalCommissions };
}
