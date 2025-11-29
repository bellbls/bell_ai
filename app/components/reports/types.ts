import { Id } from "../../convex/_generated/dataModel";

export interface StakeReportProps {
    userId: Id<"users">;
}

export interface OverviewData {
    totalStakes: { active: number; completed: number; total: number };
    totalAmount: { active: number; completed: number; total: number };
    totalYield: number;
    averageDailyYield: number;
    cycleDistribution: Record<number, number>;
    roi: { average: number; best: number; worst: number };
    mostPopularCycle: number;
    dateRange: { start: number; end: number; days: number };
}

export interface HistoryData {
    transactions: Array<{
        _id: string;
        date: string;
        timestamp: number;
        stakeId: string | null;
        stakeAmount: number;
        cycle: number;
        rate: number;
        yieldAmount: number;
        description: string;
        cumulativeYield: number;
    }>;
    summary: {
        totalYield: number;
        transactionCount: number;
        averageYield: number;
        highestYield: number;
        lowestYield: number;
    };
}

export interface PerformanceData {
    stakeId: string;
    amount: number;
    cycle: number;
    rate: number;
    status: string;
    startDate: number;
    endDate: number;
    daysTotal: number;
    daysElapsed: number;
    daysRemaining: number;
    yieldEarned: number;
    projectedYield: number;
    expectedYieldSoFar: number;
    currentROI: number;
    expectedROI: number;
    performance: "ahead" | "on-track" | "behind";
    dailyYield: number;
    completionPercentage: number;
}

export interface AnalyticsData {
    daily: Array<{ date: string; yield: number }>;
    byCycle: Record<number, number>;
    summary: {
        totalYield: number;
        averageDailyYield: number;
        projectedMonthlyYield: number;
        growthRate: number;
        bestDay: { date: string; yield: number } | null;
        worstDay: { date: string; yield: number } | null;
    };
}

export interface PortfolioData {
    byCycle: Record<string, { amount: number; count: number; percentage: number }>;
    riskProfile: {
        low: { amount: number; percentage: number };
        medium: { amount: number; percentage: number };
        high: { amount: number; percentage: number };
    };
    diversificationScore: number;
}
