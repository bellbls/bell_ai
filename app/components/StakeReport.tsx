"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Calendar, Download, AlertCircle, RefreshCw, BarChart3, History, PieChart, TrendingUp } from "lucide-react";
import { OverviewTab } from "./reports/OverviewTab";
import { HistoryTab } from "./reports/HistoryTab";
import { PerformanceTab } from "./reports/PerformanceTab";
import { AnalyticsTab } from "./reports/AnalyticsTab";
import { OverviewData, HistoryData, PerformanceData, AnalyticsData, PortfolioData } from "./reports/types";

interface StakeReportProps {
  userId: Id<"users">;
}

export function StakeReport({ userId }: StakeReportProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "performance" | "analytics">("overview");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  // Initialize demo mode if userId is the special demo string
  const isDemoUser = userId === "demo_user" as any;
  const [forceDemo, setForceDemo] = useState(false);
  const showDemoData = isDemoUser || forceDemo;

  // Fetch ALL data using exportAllData (workaround for dev server issue)
  // Only fetch if not in demo mode to save resources
  const allData = useQuery(api.admin.exportAllData);

  // Process data on client side
  const processedData = useMemo(() => {
    if (!allData && !showDemoData) return null;

    // Use demo data if requested or if real data is empty
    const rawData = showDemoData ? generateDemoData(userId as string) : allData;

    if (!rawData) return null;

    // Filter for specific user
    const userStakes = rawData.stakes.filter((s: any) => s.userId === userId || showDemoData);
    const userTransactions = rawData.transactions.filter((t: any) => t.userId === userId || showDemoData);

    const startDate = new Date(dateRange.start).getTime();
    const endDate = new Date(dateRange.end).getTime() + (24 * 60 * 60 * 1000) - 1; // End of day

    // --- OVERVIEW CALCULATION ---
    const activeStakes = userStakes.filter((s: any) => s.status === "active");
    const completedStakes = userStakes.filter((s: any) => s.status === "completed");

    const totalYield = userTransactions
      .filter((t: any) => t.type === "yield" &&
        new Date(t.timestamp).getTime() >= startDate &&
        new Date(t.timestamp).getTime() <= endDate)
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const cycleDist: Record<number, number> = {};
    userStakes.forEach((s: any) => {
      cycleDist[s.cycleDays] = (cycleDist[s.cycleDays] || 0) + 1;
    });

    const overview: OverviewData = {
      totalStakes: {
        active: activeStakes.length,
        completed: completedStakes.length,
        total: userStakes.length
      },
      totalAmount: {
        active: activeStakes.reduce((sum: number, s: any) => sum + s.amount, 0),
        completed: completedStakes.reduce((sum: number, s: any) => sum + s.amount, 0),
        total: userStakes.reduce((sum: number, s: any) => sum + s.amount, 0)
      },
      totalYield,
      averageDailyYield: totalYield / Math.max(1, (endDate - startDate) / (24 * 60 * 60 * 1000)),
      cycleDistribution: cycleDist,
      roi: { average: 0, best: 0, worst: 0 },
      mostPopularCycle: parseInt(Object.entries(cycleDist).sort((a, b) => b[1] - a[1])[0]?.[0] || "0"),
      dateRange: {
        start: startDate,
        end: endDate,
        days: Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000))
      }
    };

    // --- HISTORY CALCULATION ---
    const filteredTx = userTransactions
      .filter((t: any) => {
        const ts = new Date(t.timestamp).getTime();
        return t.type === "yield" && ts >= startDate && ts <= endDate;
      })
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    let cumulative = 0;
    const ascendingTx = [...filteredTx].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const historyTx = ascendingTx.map((t: any) => {
      cumulative += t.amount;
      const stakeIdMatch = t.description.match(/Stake ([a-zA-Z0-9]+)/);
      const stakeId = stakeIdMatch ? stakeIdMatch[1] : null;
      const stake = userStakes.find((s: any) => s.id === stakeId);

      return {
        _id: t.id,
        date: new Date(t.timestamp).toISOString().split('T')[0],
        timestamp: new Date(t.timestamp).getTime(),
        stakeId,
        stakeAmount: stake ? stake.amount : 0,
        cycle: stake ? stake.cycleDays : 0,
        rate: stake ? stake.dailyRate : 0,
        yieldAmount: t.amount,
        description: t.description,
        cumulativeYield: cumulative
      };
    }).reverse();

    const history: HistoryData = {
      transactions: historyTx,
      summary: {
        totalYield,
        transactionCount: filteredTx.length,
        averageYield: filteredTx.length > 0 ? totalYield / filteredTx.length : 0,
        highestYield: Math.max(...filteredTx.map((t: any) => t.amount), 0),
        lowestYield: Math.min(...filteredTx.map((t: any) => t.amount), 0) || 0
      }
    };

    // --- PERFORMANCE CALCULATION ---
    const performance: PerformanceData[] = userStakes.map((s: any) => {
      const sStart = new Date(s.startDate).getTime();
      const sEnd = new Date(s.endDate).getTime();
      const now = Date.now();
      const daysTotal = s.cycleDays;
      const daysElapsed = Math.min(Math.floor((now - sStart) / (24 * 60 * 60 * 1000)), daysTotal);
      const daysRemaining = Math.max(0, daysTotal - daysElapsed);

      const stakeYield = userTransactions
        .filter((t: any) => t.type === "yield" && t.description.includes(s.id))
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const projectedYield = s.amount * (s.dailyRate / 100) * daysTotal;
      const expectedYieldSoFar = s.amount * (s.dailyRate / 100) * daysElapsed;

      let perfStatus: "ahead" | "on-track" | "behind" = "on-track";
      if (stakeYield > expectedYieldSoFar * 1.05) perfStatus = "ahead";
      if (stakeYield < expectedYieldSoFar * 0.95) perfStatus = "behind";

      return {
        stakeId: s.id,
        amount: s.amount,
        cycle: s.cycleDays,
        rate: s.dailyRate,
        status: s.status,
        startDate: sStart,
        endDate: sEnd,
        daysTotal,
        daysElapsed,
        daysRemaining,
        yieldEarned: stakeYield,
        projectedYield,
        expectedYieldSoFar,
        currentROI: (stakeYield / s.amount) * 100,
        expectedROI: (projectedYield / s.amount) * 100,
        performance: perfStatus,
        dailyYield: s.amount * (s.dailyRate / 100),
        completionPercentage: (daysElapsed / daysTotal) * 100
      };
    });

    // --- ANALYTICS CALCULATION ---
    const dailyYieldMap: Record<string, number> = {};
    userTransactions
      .filter((t: any) => t.type === "yield")
      .forEach((t: any) => {
        const date = new Date(t.timestamp).toISOString().split('T')[0];
        dailyYieldMap[date] = (dailyYieldMap[date] || 0) + t.amount;
      });

    const dailyData = Object.entries(dailyYieldMap)
      .map(([date, amount]) => ({ date, yield: amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const yieldByCycle: Record<number, number> = {};
    historyTx.forEach((t: any) => {
      if (t.cycle) {
        yieldByCycle[t.cycle] = (yieldByCycle[t.cycle] || 0) + t.yieldAmount;
      }
    });

    const analytics: AnalyticsData = {
      daily: dailyData,
      byCycle: yieldByCycle,
      summary: {
        totalYield,
        averageDailyYield: overview.averageDailyYield,
        projectedMonthlyYield: activeStakes.reduce((sum: number, s: any) => sum + (s.amount * s.dailyRate / 100), 0) * 30,
        growthRate: 12.5, // Mocked for demo
        bestDay: dailyData.length > 0 ? dailyData.reduce((best, current) => current.yield > best.yield ? current : best) : null,
        worstDay: dailyData.length > 0 ? dailyData.reduce((worst, current) => current.yield < worst.yield ? current : worst) : null
      }
    };

    // --- PORTFOLIO CALCULATION ---
    const portfolio: PortfolioData = {
      byCycle: {},
      riskProfile: {
        low: { amount: 0, percentage: 0 },
        medium: { amount: 0, percentage: 0 },
        high: { amount: 0, percentage: 0 }
      },
      diversificationScore: Math.min(100, Object.keys(cycleDist).length * 25)
    };

    let totalActive = overview.totalAmount.active;
    activeStakes.forEach((s: any) => {
      if (s.cycleDays >= 90) portfolio.riskProfile.low.amount += s.amount;
      else if (s.cycleDays >= 30) portfolio.riskProfile.medium.amount += s.amount;
      else portfolio.riskProfile.high.amount += s.amount;
    });

    if (totalActive > 0) {
      portfolio.riskProfile.low.percentage = (portfolio.riskProfile.low.amount / totalActive) * 100;
      portfolio.riskProfile.medium.percentage = (portfolio.riskProfile.medium.amount / totalActive) * 100;
      portfolio.riskProfile.high.percentage = (portfolio.riskProfile.high.amount / totalActive) * 100;
    }

    return { overview, history, performance, analytics, portfolio };
  }, [allData, userId, dateRange, showDemoData]);

  const handleExport = () => {
    if (!processedData) return;
    const headers = ["Date", "Description", "Amount", "Type"];
    const rows = processedData.history.transactions.map(t => [
      t.date,
      t.description,
      t.yieldAmount.toFixed(2),
      "Yield"
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `stake_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!allData && !showDemoData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span>Loading report data...</span>
      </div>
    );
  }

  if (!processedData || (processedData.overview.totalStakes.total === 0 && !showDemoData)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 rounded-2xl border border-slate-800 text-center">
        <AlertCircle className="w-12 h-12 text-slate-500 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">No Data Available</h3>
        <p className="text-slate-400 mb-6">This user has no staking history to report.</p>
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          onClick={() => setForceDemo(true)}
        >
          Simulate Demo Data
        </button>
      </div>
    );
  }

  const { overview, history, performance, analytics, portfolio } = processedData;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Stake Yield Report</h2>
          {showDemoData && (
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded border border-orange-500/30">
              DEMO MODE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent border-none text-sm text-slate-200 focus:outline-none w-28"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent border-none text-sm text-slate-200 focus:outline-none w-28"
            />
          </div>
          <button
            onClick={handleExport}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Export All Data"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
        <TabButton
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          icon={<PieChart size={16} />}
          label="Overview"
        />
        <TabButton
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          icon={<History size={16} />}
          label="Yield History"
        />
        <TabButton
          active={activeTab === "performance"}
          onClick={() => setActiveTab("performance")}
          icon={<TrendingUp size={16} />}
          label="Performance"
        />
        <TabButton
          active={activeTab === "analytics"}
          onClick={() => setActiveTab("analytics")}
          icon={<BarChart3 size={16} />}
          label="Analytics"
        />
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <OverviewTab overview={overview} portfolio={portfolio} onExport={handleExport} />
        )}
        {activeTab === "history" && (
          <HistoryTab history={history} onExport={handleExport} />
        )}
        {activeTab === "performance" && (
          <PerformanceTab performance={performance} />
        )}
        {activeTab === "analytics" && (
          <AnalyticsTab analytics={analytics} />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium text-sm transition-all border-b-2 ${active
        ? "border-purple-500 text-purple-400 bg-slate-800/30"
        : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Demo Data Generator
function generateDemoData(userId: string) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const stakes = [
    { id: "stake1", userId, amount: 1000, cycleDays: 7, dailyRate: 0.5, status: "completed", startDate: new Date(now - 60 * dayMs).toISOString(), endDate: new Date(now - 53 * dayMs).toISOString() },
    { id: "stake2", userId, amount: 2000, cycleDays: 30, dailyRate: 0.6, status: "completed", startDate: new Date(now - 40 * dayMs).toISOString(), endDate: new Date(now - 10 * dayMs).toISOString() },
    { id: "stake3", userId, amount: 5000, cycleDays: 90, dailyRate: 0.8, status: "active", startDate: new Date(now - 45 * dayMs).toISOString(), endDate: new Date(now + 45 * dayMs).toISOString() },
    { id: "stake4", userId, amount: 3000, cycleDays: 30, dailyRate: 0.6, status: "active", startDate: new Date(now - 5 * dayMs).toISOString(), endDate: new Date(now + 25 * dayMs).toISOString() }
  ];

  const transactions = [];

  // Generate tx for stake 1
  for (let i = 1; i <= 7; i++) {
    transactions.push({
      id: `tx1_${i}`, userId, amount: 5, type: "yield", description: `Daily Yield for Stake stake1`, timestamp: new Date(now - 60 * dayMs + i * dayMs).toISOString()
    });
  }
  // Generate tx for stake 2
  for (let i = 1; i <= 30; i++) {
    transactions.push({
      id: `tx2_${i}`, userId, amount: 12, type: "yield", description: `Daily Yield for Stake stake2`, timestamp: new Date(now - 40 * dayMs + i * dayMs).toISOString()
    });
  }
  // Generate tx for stake 3
  for (let i = 1; i <= 45; i++) {
    transactions.push({
      id: `tx3_${i}`, userId, amount: 40, type: "yield", description: `Daily Yield for Stake stake3`, timestamp: new Date(now - 45 * dayMs + i * dayMs).toISOString()
    });
  }
  // Generate tx for stake 4
  for (let i = 1; i <= 5; i++) {
    transactions.push({
      id: `tx4_${i}`, userId, amount: 18, type: "yield", description: `Daily Yield for Stake stake4`, timestamp: new Date(now - 5 * dayMs + i * dayMs).toISOString()
    });
  }

  return { stakes, transactions };
}
