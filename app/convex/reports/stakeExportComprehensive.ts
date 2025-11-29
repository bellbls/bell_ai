import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Comprehensive Stake Report Export
 * Industry-standard CSV/Excel exports for finance teams
 */

/**
 * Export detailed yield payout report to CSV
 */
export const exportYieldPayoutReport = action({
    args: {
        userId: v.optional(v.id("users")),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        stakeId: v.optional(v.id("stakes")),
        format: v.optional(v.union(v.literal("csv"), v.literal("excel"))),
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate, stakeId, format = "csv" } = args;

        // Get comprehensive payout data
        const payoutReport = await ctx.runQuery(
            (api as any)["reports/comprehensiveStakeReport"].getDetailedYieldPayoutReport,
            {
                userId,
                startDate,
                endDate,
                stakeId,
                includeBLS: true,
            }
        );

        // Build CSV content
        let csvContent = "";

        // Header
        csvContent += "COMPREHENSIVE YIELD PAYOUT REPORT\n";
        csvContent += `Generated: ${new Date().toISOString()}\n`;
        csvContent += `Date Range: ${new Date(startDate || 0).toISOString()} to ${new Date(endDate || Date.now()).toISOString()}\n`;
        csvContent += `Total Payouts: ${payoutReport.summary.totalPayouts}\n`;
        csvContent += `Total Amount: ${payoutReport.summary.totalAmount.toFixed(2)} (BLS: ${payoutReport.summary.totalBLS.toFixed(2)}, USDT: ${payoutReport.summary.totalUSDT.toFixed(2)})\n\n`;

        // Summary Section
        csvContent += "=== SUMMARY ===\n";
        csvContent += `Total Payouts,${payoutReport.summary.totalPayouts}\n`;
        csvContent += `Total Amount,${payoutReport.summary.totalAmount.toFixed(2)}\n`;
        csvContent += `Total BLS,${payoutReport.summary.totalBLS.toFixed(2)}\n`;
        csvContent += `Total USDT,${payoutReport.summary.totalUSDT.toFixed(2)}\n`;
        csvContent += `Average Payout,${payoutReport.summary.averagePayout.toFixed(2)}\n`;
        csvContent += `Highest Payout,${payoutReport.summary.highestPayout.toFixed(2)}\n`;
        csvContent += `Lowest Payout,${payoutReport.summary.lowestPayout.toFixed(2)}\n`;
        csvContent += `Average Variance,${payoutReport.summary.averageVariance.toFixed(2)}\n\n`;

        // Detailed Payouts Section
        csvContent += "=== DETAILED PAYOUTS ===\n";
        csvContent += "Payout ID,Transaction ID,User Name,User Email,Stake ID,Stake Amount,Cycle Days,Daily Rate,Stake Status,Payout Date,Payout Amount,Currency,Is BLS,Description,Expected Daily Yield,Variance,Variance %,Status\n";

        payoutReport.payouts.forEach((payout) => {
            csvContent += [
                payout.payoutId,
                payout.transactionId,
                `"${payout.userName}"`,
                `"${payout.userEmail}"`,
                payout.stakeId || "",
                payout.stakeAmount.toFixed(2),
                payout.stakeCycleDays,
                payout.stakeDailyRate.toFixed(4),
                payout.stakeStatus,
                payout.payoutDateFormatted,
                payout.payoutAmount.toFixed(2),
                payout.currency,
                payout.isBLS ? "Yes" : "No",
                `"${payout.description}"`,
                payout.expectedDailyYield.toFixed(2),
                payout.variance.toFixed(2),
                payout.variancePercentage.toFixed(2) + "%",
                payout.status,
            ].join(",") + "\n";
        });

        return {
            content: csvContent,
            filename: `yield_payout_report_${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: "text/csv",
        };
    },
});

/**
 * Export comprehensive staking report to CSV
 */
export const exportStakingReport = action({
    args: {
        userId: v.optional(v.id("users")),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        status: v.optional(v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled"))),
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate, status } = args;

        // Get comprehensive staking data
        const stakingReport = await ctx.runQuery(
            (api as any)["reports/comprehensiveStakeReport"].getComprehensiveStakingReport,
            {
                userId,
                startDate,
                endDate,
                status,
            }
        );

        // Build CSV content
        let csvContent = "";

        // Header
        csvContent += "COMPREHENSIVE STAKING REPORT\n";
        csvContent += `Generated: ${new Date().toISOString()}\n`;
        csvContent += `Total Stakes: ${stakingReport.summary.totalStakes}\n`;
        csvContent += `Total Stake Amount: ${stakingReport.summary.totalStakeAmount.toFixed(2)}\n`;
        csvContent += `Total Yield Paid: ${stakingReport.summary.totalYieldPaid.toFixed(2)}\n`;
        csvContent += `Average ROI: ${stakingReport.summary.averageROI.toFixed(2)}%\n\n`;

        // Summary Section
        csvContent += "=== SUMMARY ===\n";
        csvContent += `Total Stakes,${stakingReport.summary.totalStakes}\n`;
        csvContent += `Total Stake Amount,${stakingReport.summary.totalStakeAmount.toFixed(2)}\n`;
        csvContent += `Total Yield Paid,${stakingReport.summary.totalYieldPaid.toFixed(2)}\n`;
        csvContent += `Total BLS Yield,${stakingReport.summary.totalBLSYield.toFixed(2)}\n`;
        csvContent += `Total USDT Yield,${stakingReport.summary.totalUSDTYield.toFixed(2)}\n`;
        csvContent += `Total Payouts,${stakingReport.summary.totalPayouts}\n`;
        csvContent += `Average ROI,${stakingReport.summary.averageROI.toFixed(2)}%\n`;
        csvContent += `Average Stake Amount,${stakingReport.summary.averageStakeAmount.toFixed(2)}\n\n`;

        csvContent += "=== STATUS BREAKDOWN ===\n";
        csvContent += `Active,${stakingReport.summary.statusBreakdown.active}\n`;
        csvContent += `Completed,${stakingReport.summary.statusBreakdown.completed}\n`;
        csvContent += `Cancelled,${stakingReport.summary.statusBreakdown.cancelled}\n\n`;

        csvContent += "=== PERFORMANCE BREAKDOWN ===\n";
        csvContent += `Ahead,${stakingReport.summary.performanceBreakdown.ahead}\n`;
        csvContent += `On Track,${stakingReport.summary.performanceBreakdown.onTrack}\n`;
        csvContent += `Behind,${stakingReport.summary.performanceBreakdown.behind}\n\n`;

        // Detailed Stakes Section
        csvContent += "=== DETAILED STAKES ===\n";
        csvContent += "Stake ID,User Name,User Email,Stake Amount,Cycle Days,Daily Rate,Status,Start Date,End Date,Days Total,Days Elapsed,Days Remaining,Completion %,Total Yield Paid,BLS Yield,USDT Yield,Payout Count,Daily Yield,Projected Total Yield,Expected Yield So Far,Remaining Projected Yield,Current ROI,Projected ROI,Annualized ROI,Performance Status,Performance Ratio,Last Payout Date,Days Since Last Payout,Next Payout Date,Created At\n";

        stakingReport.stakes.forEach((stake) => {
            csvContent += [
                stake.stakeId,
                `"${stake.userName}"`,
                `"${stake.userEmail}"`,
                stake.stakeAmount.toFixed(2),
                stake.cycleDays,
                stake.dailyRate.toFixed(4),
                stake.status,
                new Date(stake.startDate).toISOString(),
                new Date(stake.endDate).toISOString(),
                stake.daysTotal,
                stake.daysElapsed,
                stake.daysRemaining,
                stake.completionPercentage.toFixed(2) + "%",
                stake.totalYieldPaid.toFixed(2),
                stake.blsYieldPaid.toFixed(2),
                stake.usdtYieldPaid.toFixed(2),
                stake.payoutCount,
                stake.dailyYield.toFixed(2),
                stake.projectedTotalYield.toFixed(2),
                stake.expectedYieldSoFar.toFixed(2),
                stake.remainingProjectedYield.toFixed(2),
                stake.currentROI.toFixed(2) + "%",
                stake.projectedROI.toFixed(2) + "%",
                stake.annualizedROI.toFixed(2) + "%",
                stake.performanceStatus,
                stake.performanceRatio.toFixed(4),
                stake.lastPayoutDate ? new Date(stake.lastPayoutDate).toISOString() : "",
                stake.daysSinceLastPayout,
                stake.nextPayoutDate ? new Date(stake.nextPayoutDate).toISOString() : "",
                new Date(stake.createdAt).toISOString(),
            ].join(",") + "\n";
        });

        return {
            content: csvContent,
            filename: `staking_report_${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: "text/csv",
        };
    },
});

/**
 * Export financial summary report to CSV
 */
export const exportFinancialSummaryReport = action({
    args: {
        userId: v.optional(v.id("users")),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate } = args;

        // Get financial summary data
        const financialReport = await ctx.runQuery(
            (api as any)["reports/comprehensiveStakeReport"].getFinancialSummaryReport,
            {
                userId,
                startDate,
                endDate,
            }
        );

        // Build CSV content
        let csvContent = "";

        // Header
        csvContent += "FINANCIAL SUMMARY REPORT\n";
        csvContent += `Generated: ${new Date().toISOString()}\n`;
        csvContent += `Date Range: ${new Date(startDate || 0).toISOString()} to ${new Date(endDate || Date.now()).toISOString()}\n\n`;

        // Historical Metrics
        csvContent += "=== HISTORICAL METRICS ===\n";
        csvContent += `Total Yield Paid,${financialReport.historical.totalYieldPaid.toFixed(2)}\n`;
        csvContent += `BLS Yield Paid,${financialReport.historical.blsYieldPaid.toFixed(2)}\n`;
        csvContent += `USDT Yield Paid,${financialReport.historical.usdtYieldPaid.toFixed(2)}\n`;
        csvContent += `Total Stake Amount,${financialReport.historical.totalStakeAmount.toFixed(2)}\n`;
        csvContent += `Overall ROI,${financialReport.historical.overallROI.toFixed(2)}%\n`;
        csvContent += `Average Daily Yield,${financialReport.historical.averageDailyYield.toFixed(2)}\n\n`;

        // Projections
        csvContent += "=== PROJECTIONS ===\n";
        csvContent += `Total Projected Remaining Yield,${financialReport.projections.totalProjectedRemainingYield.toFixed(2)}\n`;
        csvContent += `Projected Monthly Yield,${financialReport.projections.projectedMonthlyYield.toFixed(2)}\n`;
        csvContent += `Projected Annual Yield,${financialReport.projections.projectedAnnualYield.toFixed(2)}\n`;
        csvContent += `Projected Overall ROI,${financialReport.projections.projectedOverallROI.toFixed(2)}%\n`;
        csvContent += `Total Active Stake Amount,${financialReport.projections.totalActiveStakeAmount.toFixed(2)}\n`;
        csvContent += `Total Daily Yield,${financialReport.projections.totalDailyYield.toFixed(2)}\n`;
        csvContent += `Active Stakes Count,${financialReport.projections.activeStakesCount}\n\n`;

        // Breakdown
        csvContent += "=== BREAKDOWN BY CURRENCY ===\n";
        csvContent += `BLS,${financialReport.breakdown.byCurrency.BLS.toFixed(2)}\n`;
        csvContent += `USDT,${financialReport.breakdown.byCurrency.USDT.toFixed(2)}\n\n`;

        csvContent += "=== BREAKDOWN BY STATUS ===\n";
        csvContent += `Active,${financialReport.breakdown.byStatus.active}\n`;
        csvContent += `Completed,${financialReport.breakdown.byStatus.completed}\n`;
        csvContent += `Cancelled,${financialReport.breakdown.byStatus.cancelled}\n`;

        return {
            content: csvContent,
            filename: `financial_summary_report_${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: "text/csv",
        };
    },
});

/**
 * Export all-in-one comprehensive report
 */
export const exportComprehensiveReport = action({
    args: {
        userId: v.optional(v.id("users")),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, startDate, endDate } = args;

        // Get all report data
        const [payoutReport, stakingReport, financialReport] = await Promise.all([
            ctx.runQuery(
                (api as any)["reports/comprehensiveStakeReport"].getDetailedYieldPayoutReport,
                { userId, startDate, endDate, includeBLS: true }
            ),
            ctx.runQuery(
                (api as any)["reports/comprehensiveStakeReport"].getComprehensiveStakingReport,
                { userId, startDate, endDate }
            ),
            ctx.runQuery(
                (api as any)["reports/comprehensiveStakeReport"].getFinancialSummaryReport,
                { userId, startDate, endDate }
            ),
        ]);

        // Build comprehensive CSV
        let csvContent = "";

        // Executive Summary
        csvContent += "=".repeat(80) + "\n";
        csvContent += "COMPREHENSIVE STAKE REPORT - EXECUTIVE SUMMARY\n";
        csvContent += "=".repeat(80) + "\n";
        csvContent += `Generated: ${new Date().toISOString()}\n`;
        csvContent += `Report Period: ${new Date(startDate || 0).toISOString()} to ${new Date(endDate || Date.now()).toISOString()}\n\n`;

        csvContent += "KEY METRICS\n";
        csvContent += `Total Stakes: ${stakingReport.summary.totalStakes}\n`;
        csvContent += `Total Stake Amount: $${stakingReport.summary.totalStakeAmount.toFixed(2)}\n`;
        csvContent += `Total Yield Paid: $${payoutReport.summary.totalAmount.toFixed(2)}\n`;
        csvContent += `Average ROI: ${stakingReport.summary.averageROI.toFixed(2)}%\n`;
        csvContent += `Projected Remaining Yield: $${financialReport.projections.totalProjectedRemainingYield.toFixed(2)}\n`;
        csvContent += `Projected Annual Yield: $${financialReport.projections.projectedAnnualYield.toFixed(2)}\n\n`;

        // Include all sections from individual reports
        csvContent += "\n" + "=".repeat(80) + "\n";
        csvContent += "SECTION 1: YIELD PAYOUT DETAILS\n";
        csvContent += "=".repeat(80) + "\n\n";

        csvContent += "Payout ID,User Name,Stake ID,Payout Date,Payout Amount,Currency,Status\n";
        payoutReport.payouts.slice(0, 1000).forEach((payout) => {
            csvContent += [
                payout.payoutId,
                `"${payout.userName}"`,
                payout.stakeId || "",
                payout.payoutDateFormatted,
                payout.payoutAmount.toFixed(2),
                payout.currency,
                payout.status,
            ].join(",") + "\n";
        });

        csvContent += "\n" + "=".repeat(80) + "\n";
        csvContent += "SECTION 2: STAKING DETAILS\n";
        csvContent += "=".repeat(80) + "\n\n";

        csvContent += "Stake ID,User Name,Stake Amount,Cycle Days,Daily Rate,Status,Total Yield Paid,Current ROI,Performance\n";
        stakingReport.stakes.forEach((stake) => {
            csvContent += [
                stake.stakeId,
                `"${stake.userName}"`,
                stake.stakeAmount.toFixed(2),
                stake.cycleDays,
                stake.dailyRate.toFixed(4),
                stake.status,
                stake.totalYieldPaid.toFixed(2),
                stake.currentROI.toFixed(2) + "%",
                stake.performanceStatus,
            ].join(",") + "\n";
        });

        csvContent += "\n" + "=".repeat(80) + "\n";
        csvContent += "SECTION 3: FINANCIAL SUMMARY\n";
        csvContent += "=".repeat(80) + "\n\n";

        csvContent += "Metric,Value\n";
        csvContent += `Total Yield Paid,${financialReport.historical.totalYieldPaid.toFixed(2)}\n`;
        csvContent += `BLS Yield,${financialReport.historical.blsYieldPaid.toFixed(2)}\n`;
        csvContent += `USDT Yield,${financialReport.historical.usdtYieldPaid.toFixed(2)}\n`;
        csvContent += `Projected Monthly Yield,${financialReport.projections.projectedMonthlyYield.toFixed(2)}\n`;
        csvContent += `Projected Annual Yield,${financialReport.projections.projectedAnnualYield.toFixed(2)}\n`;
        csvContent += `Overall ROI,${financialReport.historical.overallROI.toFixed(2)}%\n`;

        return {
            content: csvContent,
            filename: `comprehensive_stake_report_${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: "text/csv",
        };
    },
});

