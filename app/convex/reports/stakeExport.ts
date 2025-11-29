import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Export stake report to CSV format
 */
export const exportStakeReportCSV = action({
    args: {
        userId: v.id("users"),
        reportType: v.union(
            v.literal("overview"),
            v.literal("history"),
            v.literal("performance"),
            v.literal("all")
        ),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, reportType, startDate, endDate } = args;

        let csvContent = "";
        const filename = `stake_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;

        if (reportType === "overview" || reportType === "all") {
            // Get overview data
            const overview = await ctx.runQuery((api as any)["reports/stakeReports"].getStakeOverview, {
                userId,
                startDate,
                endDate,
            });

            csvContent += "STAKE OVERVIEW REPORT\n";
            csvContent += `Generated: ${new Date().toISOString()}\n`;
            csvContent += `Period: ${new Date(overview.dateRange.start).toLocaleDateString()} - ${new Date(overview.dateRange.end).toLocaleDateString()}\n\n`;

            csvContent += "Metric,Value\n";
            csvContent += `Total Active Stakes,${overview.totalStakes.active}\n`;
            csvContent += `Total Completed Stakes,${overview.totalStakes.completed}\n`;
            csvContent += `Total Stake Amount,$${overview.totalAmount.total.toFixed(2)}\n`;
            csvContent += `Active Stake Amount,$${overview.totalAmount.active.toFixed(2)}\n`;
            csvContent += `Total Yield Earned,$${overview.totalYield.toFixed(2)}\n`;
            csvContent += `Average Daily Yield,$${overview.averageDailyYield.toFixed(2)}\n`;
            csvContent += `Average ROI,${overview.roi.average.toFixed(2)}%\n`;
            csvContent += `Best ROI,${overview.roi.best.toFixed(2)}%\n`;
            csvContent += `Most Popular Cycle,${overview.mostPopularCycle} days\n\n`;

            csvContent += "Cycle Distribution\n";
            csvContent += "Cycle (days),Stake Count\n";
            Object.entries(overview.cycleDistribution).forEach(([cycle, count]) => {
                csvContent += `${cycle},${count}\n`;
            });
            csvContent += "\n";
        }

        if (reportType === "history" || reportType === "all") {
            // Get yield history
            const history = await ctx.runQuery((api as any)["reports/stakeReports"].getYieldHistory, {
                userId,
                startDate,
                endDate,
                limit: 1000,
            });

            if (reportType === "all") csvContent += "\n";
            csvContent += "YIELD HISTORY\n\n";
            csvContent += "Date,Stake Amount,Cycle (days),Rate (%),Yield Amount,Cumulative Yield\n";

            history.transactions.forEach(t => {
                csvContent += `${t.date},$${t.stakeAmount.toFixed(2)},${t.cycle},${t.rate}%,$${t.yieldAmount.toFixed(2)},$${t.cumulativeYield.toFixed(2)}\n`;
            });

            csvContent += "\n";
            csvContent += "SUMMARY\n";
            csvContent += `Total Yield,$${history.summary.totalYield.toFixed(2)}\n`;
            csvContent += `Transaction Count,${history.summary.transactionCount}\n`;
            csvContent += `Average Yield,$${history.summary.averageYield.toFixed(2)}\n`;
            csvContent += `Highest Yield,$${history.summary.highestYield.toFixed(2)}\n`;
            csvContent += `Lowest Yield,$${history.summary.lowestYield.toFixed(2)}\n\n`;
        }

        if (reportType === "performance" || reportType === "all") {
            // Get stake performance
            const performance = await ctx.runQuery((api as any)["reports/stakeReports"].getStakePerformance, {
                userId,
            });

            if (reportType === "all") csvContent += "\n";
            csvContent += "STAKE PERFORMANCE\n\n";
            csvContent += "Stake ID,Amount,Cycle,Rate,Status,Days Elapsed,Days Remaining,Yield Earned,Projected Yield,Current ROI,Expected ROI,Performance\n";

            performance.forEach(p => {
                if (!p) return;
                csvContent += `${p.stakeId},$${p.amount.toFixed(2)},${p.cycle}d,${p.rate}%,${p.status},${p.daysElapsed},${p.daysRemaining},$${p.yieldEarned.toFixed(2)},$${p.projectedYield.toFixed(2)},${p.currentROI.toFixed(2)}%,${p.expectedROI.toFixed(2)}%,${p.performance}\n`;
            });
        }

        return {
            data: csvContent,
            filename,
            mimeType: "text/csv",
        };
    },
});

/**
 * Export tax report with all necessary information
 */
export const exportTaxReport = action({
    args: {
        userId: v.id("users"),
        taxYear: v.number(),
    },
    handler: async (ctx, args) => {
        const { userId, taxYear } = args;

        const startDate = new Date(taxYear, 0, 1).getTime();
        const endDate = new Date(taxYear, 11, 31, 23, 59, 59).getTime();

        // Get all yield for the tax year
        const history = await ctx.runQuery(api.reports.stakeReports.getYieldHistory, {
            userId,
            startDate,
            endDate,
            limit: 10000,
        });

        // Get user info
        const user = await ctx.runQuery(api.users.getProfile, { userId });

        let csvContent = "";
        csvContent += `TAX REPORT - ${taxYear}\n`;
        csvContent += `Generated: ${new Date().toISOString()}\n`;
        csvContent += `User: ${user?.name || 'N/A'} (${user?.email || 'N/A'})\n\n`;

        csvContent += "INCOME SUMMARY\n";
        csvContent += `Total Staking Income,$${history.summary.totalYield.toFixed(2)}\n`;
        csvContent += `Number of Transactions,${history.summary.transactionCount}\n`;
        csvContent += `Reporting Period,${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}\n\n`;

        csvContent += "DETAILED TRANSACTIONS\n";
        csvContent += "Date,Description,Income Amount,Transaction ID\n";

        history.transactions.forEach(t => {
            csvContent += `${t.date},"Staking Yield - ${t.cycle}d cycle @ ${t.rate}%",$${t.yieldAmount.toFixed(2)},${t._id}\n`;
        });

        csvContent += "\n";
        csvContent += "MONTHLY BREAKDOWN\n";
        csvContent += "Month,Income\n";

        // Group by month
        const monthlyIncome: Record<string, number> = {};
        history.transactions.forEach(t => {
            const month = t.date.substring(0, 7); // YYYY-MM
            monthlyIncome[month] = (monthlyIncome[month] || 0) + t.yieldAmount;
        });

        Object.entries(monthlyIncome)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([month, income]) => {
                csvContent += `${month},$${income.toFixed(2)}\n`;
            });

        csvContent += "\n";
        csvContent += "NOTES\n";
        csvContent += "- This report is for informational purposes only\n";
        csvContent += "- Consult with a tax professional for tax filing\n";
        csvContent += "- Staking income may be taxable in your jurisdiction\n";
        csvContent += "- Keep this report with your tax records\n";

        return {
            data: csvContent,
            filename: `tax_report_${taxYear}_${user?.email || 'user'}.csv`,
            mimeType: "text/csv",
        };
    },
});

/**
 * Export comprehensive stake summary
 */
export const exportComprehensiveReport = action({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        // Get all data
        const [overview, performance, analytics] = await Promise.all([
            ctx.runQuery((api as any)["reports/stakeReports"].getStakeOverview, { userId }),
            ctx.runQuery((api as any)["reports/stakeReports"].getStakePerformance, { userId }),
            ctx.runQuery((api as any)["reports/stakeAnalytics"].getPortfolioBreakdown, { userId }),
        ]);

        const user = await ctx.runQuery(api.users.getProfile, { userId });

        let csvContent = "";
        csvContent += "COMPREHENSIVE STAKE REPORT\n";
        csvContent += `User: ${user?.name || 'N/A'}\n`;
        csvContent += `Email: ${user?.email || 'N/A'}\n`;
        csvContent += `Generated: ${new Date().toISOString()}\n\n`;

        csvContent += "=== PORTFOLIO OVERVIEW ===\n\n";
        csvContent += "Total Active Stakes," + overview.totalStakes.active + "\n";
        csvContent += "Total Active Amount,$" + overview.totalAmount.active.toFixed(2) + "\n";
        csvContent += "Total Yield Earned,$" + overview.totalYield.toFixed(2) + "\n";
        csvContent += "Average ROI," + overview.roi.average.toFixed(2) + "%\n";
        csvContent += "Diversification Score," + analytics.diversificationScore + "/100\n\n";

        csvContent += "=== RISK PROFILE ===\n\n";
        csvContent += "Low Risk (90+ days),$" + analytics.riskProfile.low.amount.toFixed(2) + " (" + analytics.riskProfile.low.percentage.toFixed(1) + "%)\n";
        csvContent += "Medium Risk (30 days),$" + analytics.riskProfile.medium.amount.toFixed(2) + " (" + analytics.riskProfile.medium.percentage.toFixed(1) + "%)\n";
        csvContent += "High Risk (7 days),$" + analytics.riskProfile.high.amount.toFixed(2) + " (" + analytics.riskProfile.high.percentage.toFixed(1) + "%)\n\n";

        csvContent += "=== ACTIVE STAKES DETAIL ===\n\n";
        csvContent += "Stake ID,Amount,Cycle,Rate,Days Remaining,Yield Earned,Projected Yield,ROI,Performance\n";

        performance
            .filter(p => p && p.status === "active")
            .forEach(p => {
                if (!p) return;
                csvContent += `${p.stakeId},$${p.amount.toFixed(2)},${p.cycle}d,${p.rate}%,${p.daysRemaining},$${p.yieldEarned.toFixed(2)},$${p.projectedYield.toFixed(2)},${p.currentROI.toFixed(2)}%,${p.performance}\n`;
            });

        csvContent += "\n=== RECOMMENDATIONS ===\n\n";

        // Generate recommendations
        if (analytics.diversificationScore < 50) {
            csvContent += "- Consider diversifying across multiple cycle lengths\n";
        }
        if (analytics.riskProfile.high.percentage > 50) {
            csvContent += "- High concentration in short-term stakes - consider longer cycles for stability\n";
        }
        if (overview.roi.average < 10) {
            csvContent += "- Current ROI is below 10% - consider higher rate cycles\n";
        }
        if (overview.totalStakes.active < 3) {
            csvContent += "- Consider adding more stakes to increase diversification\n";
        }

        return {
            data: csvContent,
            filename: `comprehensive_report_${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: "text/csv",
        };
    },
});
