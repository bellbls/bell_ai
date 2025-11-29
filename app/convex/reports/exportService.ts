import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Export commission report to CSV
 */
export const exportCommissionReport = action({
    args: {
        userId: v.optional(v.id("users")),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Fetch data using the query
        const data = await ctx.runQuery(
            (api as any)["reports/commissionReports"].getCommissionReport,
            args
        );

        // Convert to CSV
        const csv = convertCommissionsToCSV(data);

        const filename = `commission_report_${Date.now()}.csv`;

        return {
            filename,
            data: csv,
            mimeType: "text/csv",
        };
    },
});

/**
 * Export stake report to CSV
 */
export const exportStakeReport = action({
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
        const data = await ctx.runQuery(
            (api as any)["reports/commissionReports"].getStakeReport,
            args
        );

        const csv = convertStakesToCSV(data.stakes);

        const filename = `stake_report_${Date.now()}.csv`;

        return {
            filename,
            data: csv,
            mimeType: "text/csv",
        };
    },
});

/**
 * Convert commission data to CSV format
 */
function convertCommissionsToCSV(commissions: any[]): string {
    const headers = [
        "Date",
        "Level",
        "Rate",
        "Yield Amount",
        "Commission Amount",
        "Source User",
        "Timestamp"
    ];

    const rows = commissions.map(c => [
        c.date,
        `L${c.level}`,
        `${(c.rate * 100).toFixed(1)}%`,
        `$${c.yieldAmount.toFixed(2)}`,
        `$${c.commissionAmount.toFixed(2)}`,
        c.sourceUserId,
        new Date(c.timestamp).toISOString()
    ]);

    return [
        headers.join(","),
        ...rows.map(row => row.join(","))
    ].join("\n");
}

/**
 * Convert stake data to CSV format
 */
function convertStakesToCSV(stakes: any[]): string {
    const headers = [
        "Amount",
        "Cycle Days",
        "Daily Rate",
        "Start Date",
        "End Date",
        "Status",
        "Last Yield Date"
    ];

    const rows = stakes.map(s => [
        `$${s.amount.toFixed(2)}`,
        s.cycleDays,
        `${s.dailyRate}%`,
        new Date(s.startDate).toISOString().split('T')[0],
        new Date(s.endDate).toISOString().split('T')[0],
        s.status,
        s.lastYieldDate ? new Date(s.lastYieldDate).toISOString().split('T')[0] : "N/A"
    ]);

    return [
        headers.join(","),
        ...rows.map(row => row.join(","))
    ].join("\n");
}
