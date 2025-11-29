import { query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";

/**
 * Get comprehensive stake overview for a user
 * Shows aggregate statistics on all stakes
 */
export const getStakeOverview = query({
    args: {
        userId: v.id("users"),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate } = args;

        // Get all stakes for user
        const allStakes = await ctx.db
            .query("stakes")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        // Filter by date range if provided
        const stakes = startDate && endDate
            ? allStakes.filter(s => s.startDate >= startDate && s.startDate <= endDate)
            : allStakes;

        // Separate active and completed stakes
        const activeStakes = stakes.filter(s => s.status === "active");
        const completedStakes = stakes.filter(s => s.status === "completed");

        // Calculate totals
        const totalActiveAmount = activeStakes.reduce((sum, s) => sum + s.amount, 0);
        const totalCompletedAmount = completedStakes.reduce((sum, s) => sum + s.amount, 0);
        const totalAmount = totalActiveAmount + totalCompletedAmount;

        // Get all yield transactions
        const yieldTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("type"), "yield"))
            .collect();

        // Filter yield by date range if provided
        const filteredYield = startDate && endDate
            ? yieldTransactions.filter(t => t.timestamp >= startDate && t.timestamp <= endDate)
            : yieldTransactions;

        const totalYield = filteredYield.reduce((sum, t) => sum + t.amount, 0);

        // Calculate average daily yield
        const daysInRange = startDate && endDate
            ? Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000))
            : 30; // Default to 30 days
        const averageDailyYield = totalYield / daysInRange;

        // Cycle distribution
        const cycleDistribution = stakes.reduce((acc, stake) => {
            acc[stake.cycleDays] = (acc[stake.cycleDays] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        // Calculate ROI for each stake
        const stakeROIs = await Promise.all(stakes.map(async (stake) => {
            const stakeYield = yieldTransactions
                .filter(t => t.referenceId === stake._id)
                .reduce((sum, t) => sum + t.amount, 0);
            return (stakeYield / stake.amount) * 100;
        }));

        const averageROI = stakeROIs.length > 0
            ? stakeROIs.reduce((sum, roi) => sum + roi, 0) / stakeROIs.length
            : 0;
        const bestROI = stakeROIs.length > 0 ? Math.max(...stakeROIs) : 0;
        const worstROI = stakeROIs.length > 0 ? Math.min(...stakeROIs) : 0;

        // Most popular cycle
        const mostPopularCycle = Object.entries(cycleDistribution)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || "30";

        return {
            totalStakes: {
                active: activeStakes.length,
                completed: completedStakes.length,
                total: stakes.length,
            },
            totalAmount: {
                active: totalActiveAmount,
                completed: totalCompletedAmount,
                total: totalAmount,
            },
            totalYield,
            averageDailyYield,
            cycleDistribution,
            roi: {
                average: averageROI,
                best: bestROI,
                worst: worstROI,
            },
            mostPopularCycle: parseInt(mostPopularCycle),
            dateRange: {
                start: startDate || stakes[0]?.startDate || Date.now(),
                end: endDate || Date.now(),
                days: daysInRange,
            },
        };
    },
});

/**
 * Get detailed yield history with transactions
 */
export const getYieldHistory = query({
    args: {
        userId: v.id("users"),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        groupBy: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate, groupBy, limit = 100 } = args;

        // Get all yield transactions
        let yieldTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("type"), "yield"))
            .order("desc")
            .take(limit * 2); // Get more for filtering

        // Filter by date range
        if (startDate && endDate) {
            yieldTransactions = yieldTransactions.filter(
                t => t.timestamp >= startDate && t.timestamp <= endDate
            );
        }

        // Get stake details for each transaction
        const transactionsWithDetails = await Promise.all(
            yieldTransactions.slice(0, limit).map(async (transaction) => {
                const stake = transaction.referenceId
                    ? await ctx.db.get(transaction.referenceId as Id<"stakes">)
                    : null;

                return {
                    _id: transaction._id,
                    date: new Date(transaction.timestamp).toISOString().split('T')[0],
                    timestamp: transaction.timestamp,
                    stakeId: transaction.referenceId,
                    stakeAmount: stake?.amount || 0,
                    cycle: stake?.cycleDays || 0,
                    rate: stake?.dailyRate || 0,
                    yieldAmount: transaction.amount,
                    description: transaction.description,
                };
            })
        );

        // Calculate cumulative yield
        let cumulative = 0;
        const transactionsWithCumulative = transactionsWithDetails
            .reverse()
            .map(t => {
                cumulative += t.yieldAmount;
                return { ...t, cumulativeYield: cumulative };
            })
            .reverse();

        // Group by period if requested
        let groupedData = null;
        if (groupBy) {
            const groups: Record<string, { yield: number, count: number }> = {};

            transactionsWithDetails.forEach(t => {
                const date = new Date(t.timestamp);
                let key: string;

                if (groupBy === "day") {
                    key = t.date;
                } else if (groupBy === "week") {
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                } else { // month
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                }

                if (!groups[key]) {
                    groups[key] = { yield: 0, count: 0 };
                }
                groups[key].yield += t.yieldAmount;
                groups[key].count += 1;
            });

            groupedData = Object.entries(groups)
                .map(([period, data]) => ({
                    period,
                    totalYield: data.yield,
                    transactionCount: data.count,
                    averageYield: data.yield / data.count,
                }))
                .sort((a, b) => b.period.localeCompare(a.period));
        }

        // Summary statistics
        const totalYield = transactionsWithDetails.reduce((sum, t) => sum + t.yieldAmount, 0);
        const transactionCount = transactionsWithDetails.length;
        const averageYield = transactionCount > 0 ? totalYield / transactionCount : 0;

        return {
            transactions: transactionsWithCumulative,
            grouped: groupedData,
            summary: {
                totalYield,
                transactionCount,
                averageYield,
                highestYield: transactionCount > 0
                    ? Math.max(...transactionsWithDetails.map(t => t.yieldAmount))
                    : 0,
                lowestYield: transactionCount > 0
                    ? Math.min(...transactionsWithDetails.map(t => t.yieldAmount))
                    : 0,
            },
        };
    },
});

/**
 * Get performance metrics for individual stakes
 */
export const getStakePerformance = query({
    args: {
        userId: v.id("users"),
        stakeId: v.optional(v.id("stakes")),
    },
    handler: async (ctx, args) => {
        const { userId, stakeId } = args;

        // Get stakes
        const stakes = stakeId
            ? [await ctx.db.get(stakeId)].filter(Boolean)
            : await ctx.db
                .query("stakes")
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .collect();

        const now = Date.now();

        // Calculate performance for each stake
        const performanceData = await Promise.all(
            stakes.map(async (stake) => {
                if (!stake) return null;

                // Get yield earned for this stake
                const yieldTransactions = await ctx.db
                    .query("transactions")
                    .withIndex("by_userId", (q) => q.eq("userId", userId))
                    .filter((q) =>
                        q.and(
                            q.eq(q.field("type"), "yield"),
                            q.eq(q.field("referenceId"), stake._id)
                        )
                    )
                    .collect();

                const yieldEarned = yieldTransactions.reduce((sum, t) => sum + t.amount, 0);

                // Calculate time metrics
                const totalDuration = stake.endDate - stake.startDate;
                const daysTotal = Math.ceil(totalDuration / (24 * 60 * 60 * 1000));
                const elapsed = now - stake.startDate;
                const daysElapsed = Math.min(
                    Math.ceil(elapsed / (24 * 60 * 60 * 1000)),
                    daysTotal
                );
                const daysRemaining = Math.max(0, daysTotal - daysElapsed);

                // Calculate projected yield
                const dailyYield = (stake.amount * stake.dailyRate) / 100;
                const projectedYield = dailyYield * daysTotal;
                const expectedYieldSoFar = dailyYield * daysElapsed;

                // Calculate ROI
                const currentROI = (yieldEarned / stake.amount) * 100;
                const expectedROI = (projectedYield / stake.amount) * 100;

                // Performance status
                let performance: "ahead" | "on-track" | "behind";
                const performanceRatio = yieldEarned / expectedYieldSoFar;
                if (performanceRatio > 1.05) performance = "ahead";
                else if (performanceRatio < 0.95) performance = "behind";
                else performance = "on-track";

                return {
                    stakeId: stake._id,
                    amount: stake.amount,
                    cycle: stake.cycleDays,
                    rate: stake.dailyRate,
                    status: stake.status,
                    startDate: stake.startDate,
                    endDate: stake.endDate,
                    daysTotal,
                    daysElapsed,
                    daysRemaining,
                    yieldEarned,
                    projectedYield,
                    expectedYieldSoFar,
                    currentROI,
                    expectedROI,
                    performance,
                    dailyYield,
                    completionPercentage: (daysElapsed / daysTotal) * 100,
                };
            })
        );

        return performanceData.filter(Boolean);
    },
});
