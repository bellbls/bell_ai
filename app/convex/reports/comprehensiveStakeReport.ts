import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";

/**
 * Comprehensive Stake Report for Finance Teams
 * Industry-standard reporting with detailed yield payouts and staking analytics
 */

/**
 * Get comprehensive yield payout report
 * Shows every payout with full details for audit purposes
 */
export const getDetailedYieldPayoutReport = query({
    args: {
        userId: v.optional(v.id("users")),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        stakeId: v.optional(v.id("stakes")),
        groupBy: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("stake"))),
        includeBLS: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate, stakeId, groupBy, includeBLS = true } = args;

        // Get all yield transactions
        let yieldTransactions: any[];
        if (userId) {
            // Query with userId index
            yieldTransactions = await ctx.db
                .query("transactions")
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .filter((q) => 
                    q.or(
                        q.eq(q.field("type"), "yield"),
                        includeBLS ? q.eq(q.field("type"), "bls_earned") : q.eq(q.field("type"), "yield")
                    )
                )
                .order("desc")
                .collect();
        } else {
            // Query all transactions by type
            yieldTransactions = await ctx.db
                .query("transactions")
                .withIndex("by_type", (q) => q.eq("type", "yield"))
                .order("desc")
                .collect();
            
            // Also get BLS transactions if needed
            if (includeBLS) {
                const blsTransactions = await ctx.db
                    .query("transactions")
                    .withIndex("by_type", (q) => q.eq("type", "bls_earned"))
                    .order("desc")
                    .collect();
                yieldTransactions = [...yieldTransactions, ...blsTransactions];
            }
        }

        // Filter by date range
        if (startDate && endDate) {
            yieldTransactions = yieldTransactions.filter(
                t => t.timestamp >= startDate && t.timestamp <= endDate
            );
        }

        // Filter by stake if specified
        if (stakeId) {
            yieldTransactions = yieldTransactions.filter(
                t => t.referenceId === stakeId
            );
        }

        // Get user and stake details for each transaction
        const detailedPayouts = await Promise.all(
            yieldTransactions.map(async (tx) => {
                const user = await ctx.db.get(tx.userId);
                const stake = tx.referenceId
                    ? await ctx.db.get(tx.referenceId as Id<"stakes">)
                    : null;

                // Check if BLS transaction
                const isBLS = tx.type === "bls_earned";
                const blsConfig = isBLS ? await ctx.db.query("blsConfig").first() : null;

                // Calculate expected daily yield only for actual yield transactions
                // Variance should only be calculated for yield/bls_earned transactions that match a stake
                const isYieldTransaction = tx.type === "yield" || tx.type === "bls_earned";
                const hasValidStake = stake && stake.amount > 0 && stake.dailyRate > 0;
                const expectedDailyYield = hasValidStake && isYieldTransaction
                    ? (stake.amount * stake.dailyRate / 100)
                    : 0;
                
                // Only calculate variance for yield transactions with valid stakes
                let variance = 0;
                let variancePercentage = 0;
                let varianceReason = "";
                
                if (hasValidStake && isYieldTransaction) {
                    variance = tx.amount - expectedDailyYield;
                    if (expectedDailyYield > 0) {
                        variancePercentage = (variance / expectedDailyYield) * 100;
                    }
                    
                    // Determine reason for variance if significant
                    if (Math.abs(variancePercentage) > 5) {
                        if (variance < 0) {
                            // Negative variance - actual is less than expected
                            if (Math.abs(variancePercentage) > 50) {
                                varianceReason = "Possible partial payout, commission, or stake modification";
                            } else {
                                varianceReason = "Slightly below expected yield";
                            }
                        } else {
                            // Positive variance - actual is more than expected
                            varianceReason = "Above expected yield";
                        }
                    }
                } else if (!hasValidStake && isYieldTransaction) {
                    varianceReason = "Stake not found or invalid";
                } else if (!isYieldTransaction) {
                    varianceReason = "Not a yield transaction";
                }

                return {
                    payoutId: tx._id,
                    transactionId: tx._id,
                    userId: tx.userId,
                    userName: user?.name || "Unknown",
                    userEmail: user?.email || "Unknown",
                    stakeId: tx.referenceId,
                    stakeAmount: stake?.amount || 0,
                    stakeCycleDays: stake?.cycleDays || 0,
                    stakeDailyRate: stake?.dailyRate || 0,
                    stakeStatus: stake?.status || "unknown",
                    stakeStartDate: stake?.startDate || 0,
                    stakeEndDate: stake?.endDate || 0,
                    payoutDate: tx.timestamp,
                    payoutDateFormatted: new Date(tx.timestamp).toISOString(),
                    payoutAmount: tx.amount,
                    currency: isBLS ? "BLS" : "USDT",
                    isBLS: isBLS,
                    description: tx.description,
                    transactionType: tx.type,
                    status: tx.status || "completed",
                    // Financial calculations
                    expectedDailyYield,
                    variance,
                    variancePercentage,
                    varianceReason,
                };
            })
        );

        // Group data if requested
        let groupedData = null;
        if (groupBy) {
            const groups: Record<string, {
                payouts: typeof detailedPayouts,
                totalAmount: number,
                count: number,
                averageAmount: number,
                currency: string,
            }> = {};

            detailedPayouts.forEach(payout => {
                let key: string;

                if (groupBy === "day") {
                    key = new Date(payout.payoutDate).toISOString().split('T')[0];
                } else if (groupBy === "week") {
                    const date = new Date(payout.payoutDate);
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                } else if (groupBy === "month") {
                    const date = new Date(payout.payoutDate);
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                } else { // stake
                    key = payout.stakeId || "unknown";
                }

                if (!groups[key]) {
                    groups[key] = {
                        payouts: [],
                        totalAmount: 0,
                        count: 0,
                        averageAmount: 0,
                        currency: payout.currency,
                    };
                }

                groups[key].payouts.push(payout);
                groups[key].totalAmount += payout.payoutAmount;
                groups[key].count += 1;
            });

            groupedData = Object.entries(groups).map(([period, data]) => ({
                period,
                payouts: data.payouts,
                totalAmount: data.totalAmount,
                count: data.count,
                averageAmount: data.totalAmount / data.count,
                currency: data.currency,
            })).sort((a, b) => {
                if (groupBy === "stake") return 0;
                return b.period.localeCompare(a.period);
            });
        }

        // Calculate summary statistics
        const totalPayouts = detailedPayouts.length;
        const totalAmount = detailedPayouts.reduce((sum, p) => sum + p.payoutAmount, 0);
        const totalBLS = detailedPayouts.filter(p => p.isBLS).reduce((sum, p) => sum + p.payoutAmount, 0);
        const totalUSDT = detailedPayouts.filter(p => !p.isBLS).reduce((sum, p) => sum + p.payoutAmount, 0);
        const averagePayout = totalPayouts > 0 ? totalAmount / totalPayouts : 0;
        const highestPayout = totalPayouts > 0 ? Math.max(...detailedPayouts.map(p => p.payoutAmount)) : 0;
        const lowestPayout = totalPayouts > 0 ? Math.min(...detailedPayouts.map(p => p.payoutAmount)) : 0;

        // Calculate variance statistics
        const payoutsWithVariance = detailedPayouts.filter(p => p.stakeAmount > 0);
        const averageVariance = payoutsWithVariance.length > 0
            ? payoutsWithVariance.reduce((sum, p) => sum + Math.abs(p.variance), 0) / payoutsWithVariance.length
            : 0;

        return {
            payouts: detailedPayouts,
            grouped: groupedData,
            summary: {
                totalPayouts,
                totalAmount,
                totalBLS,
                totalUSDT,
                averagePayout,
                highestPayout,
                lowestPayout,
                averageVariance,
                dateRange: {
                    start: startDate || (detailedPayouts.length > 0 ? Math.min(...detailedPayouts.map(p => p.payoutDate)) : Date.now()),
                    end: endDate || Date.now(),
                },
            },
        };
    },
});

/**
 * Get comprehensive staking report
 * Shows all stake details, lifecycle, and financial metrics
 */
export const getComprehensiveStakingReport = query({
    args: {
        userId: v.optional(v.id("users")),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        status: v.optional(v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled"))),
        minAmount: v.optional(v.number()),
        maxAmount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate, status, minAmount, maxAmount } = args;

        // Get all stakes
        let stakes = userId
            ? await ctx.db
                .query("stakes")
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .collect()
            : await ctx.db.query("stakes").collect();

        // Apply filters
        if (startDate && endDate) {
            stakes = stakes.filter(s => s.startDate >= startDate && s.startDate <= endDate);
        }

        if (status) {
            stakes = stakes.filter(s => s.status === status);
        }

        if (minAmount !== undefined) {
            stakes = stakes.filter(s => s.amount >= minAmount);
        }

        if (maxAmount !== undefined) {
            stakes = stakes.filter(s => s.amount <= maxAmount);
        }

        const now = Date.now();

        // Get detailed stake information
        const detailedStakes = await Promise.all(
            stakes.map(async (stake) => {
                const user = await ctx.db.get(stake.userId);

                // Get all yield transactions for this stake
                const yieldTransactions = await ctx.db
                    .query("transactions")
                    .withIndex("by_userId", (q) => q.eq("userId", stake.userId))
                    .filter((q) =>
                        q.and(
                            q.or(
                                q.eq(q.field("type"), "yield"),
                                q.eq(q.field("type"), "bls_earned")
                            ),
                            q.eq(q.field("referenceId"), stake._id)
                        )
                    )
                    .collect();

                const totalYieldPaid = yieldTransactions.reduce((sum, t) => sum + t.amount, 0);
                const blsYieldPaid = yieldTransactions.filter(t => t.type === "bls_earned").reduce((sum, t) => sum + t.amount, 0);
                const usdtYieldPaid = yieldTransactions.filter(t => t.type === "yield").reduce((sum, t) => sum + t.amount, 0);
                const payoutCount = yieldTransactions.length;

                // Calculate time metrics
                const totalDuration = stake.endDate - stake.startDate;
                const daysTotal = Math.ceil(totalDuration / (24 * 60 * 60 * 1000));
                const elapsed = now - stake.startDate;
                const daysElapsed = Math.min(
                    Math.ceil(elapsed / (24 * 60 * 60 * 1000)),
                    daysTotal
                );
                const daysRemaining = Math.max(0, daysTotal - daysElapsed);

                // Calculate financial metrics
                const dailyYield = (stake.amount * stake.dailyRate) / 100;
                const projectedTotalYield = dailyYield * daysTotal;
                const expectedYieldSoFar = dailyYield * daysElapsed;
                const remainingProjectedYield = dailyYield * daysRemaining;

                // ROI calculations
                const currentROI = (totalYieldPaid / stake.amount) * 100;
                const projectedROI = (projectedTotalYield / stake.amount) * 100;
                const annualizedROI = daysElapsed > 0
                    ? (currentROI / daysElapsed) * 365
                    : 0;

                // Performance metrics
                const performanceRatio = expectedYieldSoFar > 0
                    ? totalYieldPaid / expectedYieldSoFar
                    : 0;
                let performanceStatus: "ahead" | "on-track" | "behind" = "on-track";
                if (performanceRatio > 1.05) performanceStatus = "ahead";
                else if (performanceRatio < 0.95) performanceStatus = "behind";

                // Completion percentage
                const completionPercentage = (daysElapsed / daysTotal) * 100;

                // Next payout date (if active)
                const lastPayoutDate = yieldTransactions.length > 0
                    ? Math.max(...yieldTransactions.map(t => t.timestamp))
                    : stake.startDate;
                const daysSinceLastPayout = Math.floor((now - lastPayoutDate) / (24 * 60 * 60 * 1000));
                const nextPayoutDate = stake.status === "active"
                    ? lastPayoutDate + (24 * 60 * 60 * 1000)
                    : null;

                return {
                    stakeId: stake._id,
                    userId: stake.userId,
                    userName: user?.name || "Unknown",
                    userEmail: user?.email || "Unknown",
                    stakeAmount: stake.amount,
                    cycleDays: stake.cycleDays,
                    dailyRate: stake.dailyRate,
                    status: stake.status,
                    startDate: stake.startDate,
                    endDate: stake.endDate,
                    lastYieldDate: stake.lastYieldDate || stake.startDate,
                    // Time metrics
                    daysTotal,
                    daysElapsed,
                    daysRemaining,
                    completionPercentage,
                    // Financial metrics
                    totalYieldPaid,
                    blsYieldPaid,
                    usdtYieldPaid,
                    payoutCount,
                    dailyYield,
                    projectedTotalYield,
                    expectedYieldSoFar,
                    remainingProjectedYield,
                    // ROI metrics
                    currentROI,
                    projectedROI,
                    annualizedROI,
                    // Performance
                    performanceStatus,
                    performanceRatio,
                    // Payout schedule
                    lastPayoutDate,
                    daysSinceLastPayout,
                    nextPayoutDate,
                    // Audit trail
                    createdAt: stake._creationTime,
                };
            })
        );

        // Calculate aggregate statistics
        const totalStakes = detailedStakes.length;
        const totalStakeAmount = detailedStakes.reduce((sum, s) => sum + s.stakeAmount, 0);
        const totalYieldPaid = detailedStakes.reduce((sum, s) => sum + s.totalYieldPaid, 0);
        const totalBLSYield = detailedStakes.reduce((sum, s) => sum + s.blsYieldPaid, 0);
        const totalUSDTYield = detailedStakes.reduce((sum, s) => sum + s.usdtYieldPaid, 0);
        const totalPayouts = detailedStakes.reduce((sum, s) => sum + s.payoutCount, 0);
        const averageROI = totalStakes > 0
            ? detailedStakes.reduce((sum, s) => sum + s.currentROI, 0) / totalStakes
            : 0;
        const averageStakeAmount = totalStakes > 0 ? totalStakeAmount / totalStakes : 0;

        // Status breakdown
        const activeStakes = detailedStakes.filter(s => s.status === "active");
        const completedStakes = detailedStakes.filter(s => s.status === "completed");
        const cancelledStakes = detailedStakes.filter(s => s.status === "cancelled");

        // Performance breakdown
        const aheadStakes = detailedStakes.filter(s => s.performanceStatus === "ahead");
        const onTrackStakes = detailedStakes.filter(s => s.performanceStatus === "on-track");
        const behindStakes = detailedStakes.filter(s => s.performanceStatus === "behind");

        return {
            stakes: detailedStakes,
            summary: {
                totalStakes,
                totalStakeAmount,
                totalYieldPaid,
                totalBLSYield,
                totalUSDTYield,
                totalPayouts,
                averageROI,
                averageStakeAmount,
                statusBreakdown: {
                    active: activeStakes.length,
                    completed: completedStakes.length,
                    cancelled: cancelledStakes.length,
                },
                performanceBreakdown: {
                    ahead: aheadStakes.length,
                    onTrack: onTrackStakes.length,
                    behind: behindStakes.length,
                },
                dateRange: {
                    start: startDate || (detailedStakes.length > 0 ? Math.min(...detailedStakes.map(s => s.startDate)) : Date.now()),
                    end: endDate || Date.now(),
                },
            },
        };
    },
});

/**
 * Get financial summary report
 * Comprehensive financial metrics and projections
 */
export const getFinancialSummaryReport = query({
    args: {
        userId: v.optional(v.id("users")),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate } = args;

        // Get all stakes
        let stakes = userId
            ? await ctx.db
                .query("stakes")
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .collect()
            : await ctx.db.query("stakes").collect();

        // Filter by date range
        if (startDate && endDate) {
            stakes = stakes.filter(s => s.startDate >= startDate && s.startDate <= endDate);
        }

        const now = Date.now();
        const activeStakes = stakes.filter(s => s.status === "active");

        // Get all yield transactions
        let yieldTransactions: any[];
        if (userId) {
            // Query with userId index
            yieldTransactions = await ctx.db
                .query("transactions")
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .filter((q) =>
                    q.or(
                        q.eq(q.field("type"), "yield"),
                        q.eq(q.field("type"), "bls_earned")
                    )
                )
                .collect();
        } else {
            // Query all transactions by type
            const yieldTx = await ctx.db
                .query("transactions")
                .withIndex("by_type", (q) => q.eq("type", "yield"))
                .collect();
            const blsTx = await ctx.db
                .query("transactions")
                .withIndex("by_type", (q) => q.eq("type", "bls_earned"))
                .collect();
            yieldTransactions = [...yieldTx, ...blsTx];
        }

        if (startDate && endDate) {
            yieldTransactions = yieldTransactions.filter(
                t => t.timestamp >= startDate && t.timestamp <= endDate
            );
        }

        // Calculate historical metrics
        const totalYieldPaid = yieldTransactions.reduce((sum, t) => sum + t.amount, 0);
        const blsYieldPaid = yieldTransactions.filter(t => t.type === "bls_earned").reduce((sum, t) => sum + t.amount, 0);
        const usdtYieldPaid = yieldTransactions.filter(t => t.type === "yield").reduce((sum, t) => sum + t.amount, 0);

        // Calculate projections for active stakes
        const projections = activeStakes.map(stake => {
            const daysElapsed = Math.min(
                Math.ceil((now - stake.startDate) / (24 * 60 * 60 * 1000)),
                stake.cycleDays
            );
            const daysRemaining = Math.max(0, stake.cycleDays - daysElapsed);
            const dailyYield = (stake.amount * stake.dailyRate) / 100;
            const projectedRemainingYield = dailyYield * daysRemaining;

            return {
                stakeId: stake._id,
                stakeAmount: stake.amount,
                dailyYield,
                daysRemaining,
                projectedRemainingYield,
            };
        });

        const totalProjectedRemainingYield = projections.reduce((sum, p) => sum + p.projectedRemainingYield, 0);
        const totalActiveStakeAmount = activeStakes.reduce((sum, s) => sum + s.amount, 0);
        const totalDailyYield = activeStakes.reduce((sum, s) => sum + (s.amount * s.dailyRate / 100), 0);

        // Calculate monthly and annual projections
        const projectedMonthlyYield = totalDailyYield * 30;
        const projectedAnnualYield = totalDailyYield * 365;

        // Calculate ROI metrics
        const totalStakeAmount = stakes.reduce((sum, s) => sum + s.amount, 0);
        const overallROI = totalStakeAmount > 0 ? (totalYieldPaid / totalStakeAmount) * 100 : 0;
        const projectedOverallROI = totalStakeAmount > 0
            ? ((totalYieldPaid + totalProjectedRemainingYield) / totalStakeAmount) * 100
            : 0;

        // Calculate yield trends (last 30 days)
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        const recentYield = yieldTransactions
            .filter(t => t.timestamp >= thirtyDaysAgo)
            .reduce((sum, t) => sum + t.amount, 0);
        const averageDailyYield = recentYield / 30;

        return {
            historical: {
                totalYieldPaid,
                blsYieldPaid,
                usdtYieldPaid,
                totalStakeAmount,
                overallROI,
                averageDailyYield,
            },
            projections: {
                totalProjectedRemainingYield,
                projectedMonthlyYield,
                projectedAnnualYield,
                projectedOverallROI,
                totalActiveStakeAmount,
                totalDailyYield,
                activeStakesCount: activeStakes.length,
            },
            breakdown: {
                byCurrency: {
                    BLS: blsYieldPaid,
                    USDT: usdtYieldPaid,
                },
                byStatus: {
                    active: activeStakes.length,
                    completed: stakes.filter(s => s.status === "completed").length,
                    cancelled: stakes.filter(s => s.status === "cancelled").length,
                },
            },
            dateRange: {
                start: startDate || (stakes.length > 0 ? Math.min(...stakes.map(s => s.startDate)) : Date.now()),
                end: endDate || Date.now(),
            },
        };
    },
});

