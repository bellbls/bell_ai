import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get commission report with flexible filters
 * Supports filtering by user, date range, and grouping
 */
export const getCommissionReport = query({
    args: {
        userId: v.optional(v.id("users")),
        startDate: v.optional(v.string()),  // "YYYY-MM-DD"
        endDate: v.optional(v.string()),    // "YYYY-MM-DD"
        groupBy: v.optional(v.union(
            v.literal("day"),
            v.literal("week"),
            v.literal("month"),
            v.literal("year")
        )),
    },
    handler: async (ctx, args) => {
        let query = ctx.db.query("commission_history");

        // Filter by user
        if (args.userId) {
            query = query.withIndex("by_userId", (q) =>
                q.eq("userId", args.userId)
            );
        }

        let commissions = await query.collect();

        // Filter by date range
        if (args.startDate) {
            commissions = commissions.filter(c => c.date >= args.startDate!);
        }
        if (args.endDate) {
            commissions = commissions.filter(c => c.date <= args.endDate!);
        }

        // Group by period if requested
        if (args.groupBy) {
            return groupCommissions(commissions, args.groupBy);
        }

        return commissions;
    },
});

/**
 * Get commission summary for a user
 */
export const getCommissionSummary = query({
    args: {
        userId: v.id("users"),
        period: v.optional(v.union(
            v.literal("today"),
            v.literal("week"),
            v.literal("month"),
            v.literal("year"),
            v.literal("all")
        )),
    },
    handler: async (ctx, args) => {
        const now = new Date();
        let startDate: string | undefined;

        // Calculate start date based on period
        if (args.period === "today") {
            startDate = now.toISOString().split('T')[0];
        } else if (args.period === "week") {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate = weekAgo.toISOString().split('T')[0];
        } else if (args.period === "month") {
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            startDate = monthAgo.toISOString().split('T')[0];
        } else if (args.period === "year") {
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            startDate = yearAgo.toISOString().split('T')[0];
        }

        let commissions = await ctx.db
            .query("commission_history")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();

        if (startDate) {
            commissions = commissions.filter(c => c.date >= startDate!);
        }

        // Calculate summary
        const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
        const byLevel = commissions.reduce((acc, c) => {
            acc[c.level] = (acc[c.level] || 0) + c.commissionAmount;
            return acc;
        }, {} as Record<number, number>);

        return {
            totalCommission,
            commissionCount: commissions.length,
            byLevel,
            commissions: commissions.slice(0, 100), // Latest 100
        };
    },
});

/**
 * Get stake report with filters
 */
export const getStakeReport = query({
    args: {
        userId: v.optional(v.id("users")),
        status: v.optional(v.union(
            v.literal("active"),
            v.literal("completed"),
            v.literal("all")
        )),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let query = ctx.db.query("stakes");

        if (args.userId) {
            query = query.withIndex("by_userId", (q) =>
                q.eq("userId", args.userId)
            );
        }

        let stakes = await query.collect();

        // Filter by status
        if (args.status && args.status !== "all") {
            stakes = stakes.filter(s => s.status === args.status);
        }

        // Filter by date range
        if (args.startDate) {
            stakes = stakes.filter(s => s.startDate >= args.startDate!);
        }
        if (args.endDate) {
            stakes = stakes.filter(s => s.startDate <= args.endDate!);
        }

        // Calculate summary
        const totalStaked = stakes.reduce((sum, s) => sum + s.amount, 0);
        const activeStakes = stakes.filter(s => s.status === "active");
        const completedStakes = stakes.filter(s => s.status === "completed");

        return {
            stakes,
            summary: {
                total: stakes.length,
                active: activeStakes.length,
                completed: completedStakes.length,
                totalStaked,
                totalActive: activeStakes.reduce((sum, s) => sum + s.amount, 0),
            },
        };
    },
});

/**
 * Helper function to group commissions by period
 */
function groupCommissions(
    commissions: any[],
    groupBy: "day" | "week" | "month" | "year"
) {
    const grouped: Record<string, {
        period: string;
        totalCommission: number;
        count: number;
        byLevel: Record<number, number>;
    }> = {};

    for (const commission of commissions) {
        let key: string;
        if (groupBy === "day") key = commission.date;
        else if (groupBy === "week") key = commission.week;
        else if (groupBy === "month") key = commission.month;
        else key = commission.year.toString();

        if (!grouped[key]) {
            grouped[key] = {
                period: key,
                totalCommission: 0,
                count: 0,
                byLevel: {},
            };
        }

        grouped[key].totalCommission += commission.commissionAmount;
        grouped[key].count++;
        grouped[key].byLevel[commission.level] =
            (grouped[key].byLevel[commission.level] || 0) + commission.commissionAmount;
    }

    return Object.values(grouped).sort((a, b) =>
        b.period.localeCompare(a.period)
    );
}
