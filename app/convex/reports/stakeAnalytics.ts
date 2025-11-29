import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get yield trends and analytics data for charts
 */
export const getYieldTrends = query({
    args: {
        userId: v.id("users"),
        period: v.optional(v.union(
            v.literal("week"),
            v.literal("month"),
            v.literal("quarter"),
            v.literal("year")
        )),
    },
    handler: async (ctx, args) => {
        const { userId, period = "month" } = args;

        const now = Date.now();
        const periodMs = {
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000,
            quarter: 90 * 24 * 60 * 60 * 1000,
            year: 365 * 24 * 60 * 60 * 1000,
        };

        const startDate = now - periodMs[period];

        // Get yield transactions
        const yieldTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("type"), "yield"))
            .collect();

        const filteredTransactions = yieldTransactions.filter(
            t => t.timestamp >= startDate
        );

        // Daily yield data
        const dailyYield: Record<string, number> = {};
        filteredTransactions.forEach(t => {
            const date = new Date(t.timestamp).toISOString().split('T')[0];
            dailyYield[date] = (dailyYield[date] || 0) + t.amount;
        });

        const dailyData = Object.entries(dailyYield)
            .map(([date, yield_]) => ({ date, yield: yield_ }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Monthly yield data
        const monthlyYield: Record<string, number> = {};
        filteredTransactions.forEach(t => {
            const date = new Date(t.timestamp);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyYield[month] = (monthlyYield[month] || 0) + t.amount;
        });

        const monthlyData = Object.entries(monthlyYield)
            .map(([month, yield_]) => ({ month, yield: yield_ }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // Yield by cycle type
        const stakes = await ctx.db
            .query("stakes")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        const byCycle: Record<number, number> = {};
        for (const stake of stakes) {
            const stakeYield = filteredTransactions
                .filter(t => t.referenceId === stake._id)
                .reduce((sum, t) => sum + t.amount, 0);
            byCycle[stake.cycleDays] = (byCycle[stake.cycleDays] || 0) + stakeYield;
        }

        // Projection for next 30 days
        const activeStakes = stakes.filter(s => s.status === "active");
        const projectedDailyYield = activeStakes.reduce((sum, stake) => {
            return sum + (stake.amount * stake.dailyRate) / 100;
        }, 0);

        const projection = [];
        for (let i = 1; i <= 30; i++) {
            const futureDate = new Date(now + i * 24 * 60 * 60 * 1000);
            const dateStr = futureDate.toISOString().split('T')[0];
            projection.push({
                date: dateStr,
                projected: projectedDailyYield,
            });
        }

        // Cumulative yield over time
        let cumulative = 0;
        const cumulativeData = dailyData.map(d => {
            cumulative += d.yield;
            return { date: d.date, cumulative };
        });

        // Calculate growth rate
        const firstWeekYield = dailyData.slice(0, 7).reduce((sum, d) => sum + d.yield, 0);
        const lastWeekYield = dailyData.slice(-7).reduce((sum, d) => sum + d.yield, 0);
        const growthRate = firstWeekYield > 0
            ? ((lastWeekYield - firstWeekYield) / firstWeekYield) * 100
            : 0;

        return {
            daily: dailyData,
            monthly: monthlyData,
            byCycle,
            projection,
            cumulative: cumulativeData,
            summary: {
                totalYield: filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
                averageDailyYield: dailyData.length > 0
                    ? dailyData.reduce((sum, d) => sum + d.yield, 0) / dailyData.length
                    : 0,
                projectedMonthlyYield: projectedDailyYield * 30,
                growthRate,
                bestDay: dailyData.length > 0
                    ? dailyData.reduce((max, d) => d.yield > max.yield ? d : max)
                    : null,
                worstDay: dailyData.length > 0
                    ? dailyData.reduce((min, d) => d.yield < min.yield ? d : min)
                    : null,
            },
        };
    },
});

/**
 * Get comparison data between different cycles
 */
export const getCycleComparison = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        const stakes = await ctx.db
            .query("stakes")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        const yieldTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("type"), "yield"))
            .collect();

        // Group stakes by cycle
        const cycleGroups: Record<number, typeof stakes> = {};
        stakes.forEach(stake => {
            if (!cycleGroups[stake.cycleDays]) {
                cycleGroups[stake.cycleDays] = [];
            }
            cycleGroups[stake.cycleDays].push(stake);
        });

        // Calculate metrics for each cycle
        const comparison = Object.entries(cycleGroups).map(([cycle, cycleStakes]) => {
            const cycleNum = parseInt(cycle);
            const totalStaked = cycleStakes.reduce((sum, s) => sum + s.amount, 0);
            const activeCount = cycleStakes.filter(s => s.status === "active").length;
            const completedCount = cycleStakes.filter(s => s.status === "completed").length;

            // Calculate total yield for this cycle
            const totalYield = cycleStakes.reduce((sum, stake) => {
                const stakeYield = yieldTransactions
                    .filter(t => t.referenceId === stake._id)
                    .reduce((s, t) => s + t.amount, 0);
                return sum + stakeYield;
            }, 0);

            const averageROI = totalStaked > 0 ? (totalYield / totalStaked) * 100 : 0;
            const averageRate = cycleStakes.length > 0
                ? cycleStakes.reduce((sum, s) => sum + s.dailyRate, 0) / cycleStakes.length
                : 0;

            return {
                cycle: cycleNum,
                stakeCount: cycleStakes.length,
                activeCount,
                completedCount,
                totalStaked,
                totalYield,
                averageROI,
                averageRate,
                projectedYield: totalStaked * (averageRate / 100) * cycleNum,
            };
        });

        return comparison.sort((a, b) => a.cycle - b.cycle);
    },
});

/**
 * Get stake distribution and portfolio breakdown
 */
export const getPortfolioBreakdown = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        const stakes = await ctx.db
            .query("stakes")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        const activeStakes = stakes.filter(s => s.status === "active");
        const totalActiveAmount = activeStakes.reduce((sum, s) => sum + s.amount, 0);

        // Distribution by cycle
        const byCycle = activeStakes.reduce((acc, stake) => {
            const key = `${stake.cycleDays}d`;
            if (!acc[key]) {
                acc[key] = { amount: 0, count: 0, percentage: 0 };
            }
            acc[key].amount += stake.amount;
            acc[key].count += 1;
            return acc;
        }, {} as Record<string, { amount: number, count: number, percentage: number }>);

        // Calculate percentages
        Object.values(byCycle).forEach(item => {
            item.percentage = totalActiveAmount > 0
                ? (item.amount / totalActiveAmount) * 100
                : 0;
        });

        // Distribution by status
        const byStatus = {
            active: {
                count: activeStakes.length,
                amount: totalActiveAmount,
            },
            completed: {
                count: stakes.filter(s => s.status === "completed").length,
                amount: stakes
                    .filter(s => s.status === "completed")
                    .reduce((sum, s) => sum + s.amount, 0),
            },
        };

        // Risk distribution (by cycle length)
        const riskProfile = {
            low: activeStakes.filter(s => s.cycleDays >= 90).reduce((sum, s) => sum + s.amount, 0),
            medium: activeStakes.filter(s => s.cycleDays === 30).reduce((sum, s) => sum + s.amount, 0),
            high: activeStakes.filter(s => s.cycleDays === 7).reduce((sum, s) => sum + s.amount, 0),
        };

        return {
            byCycle,
            byStatus,
            riskProfile: {
                low: { amount: riskProfile.low, percentage: (riskProfile.low / totalActiveAmount) * 100 || 0 },
                medium: { amount: riskProfile.medium, percentage: (riskProfile.medium / totalActiveAmount) * 100 || 0 },
                high: { amount: riskProfile.high, percentage: (riskProfile.high / totalActiveAmount) * 100 || 0 },
            },
            totalActive: totalActiveAmount,
            diversificationScore: Object.keys(byCycle).length * 25, // 0-100 score
        };
    },
});
