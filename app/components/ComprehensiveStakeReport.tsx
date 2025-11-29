"use client";

import { useState, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
    Download, Calendar, TrendingUp, DollarSign, PieChart, BarChart3,
    FileText, Filter, RefreshCw, AlertCircle, CheckCircle, XCircle,
    ArrowUp, ArrowDown, ArrowRight, Clock, Target, Activity
} from "lucide-react";

interface ComprehensiveStakeReportProps {
    userId?: Id<"users">;
    isAdmin?: boolean;
}

type DateRangePreset = "today" | "yesterday" | "thisWeek" | "thisMonth" | "custom";

export function ComprehensiveStakeReport({ userId, isAdmin = false }: ComprehensiveStakeReportProps) {
    const [activeTab, setActiveTab] = useState<"payouts" | "staking" | "financial">("payouts");
    const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("thisMonth");
    const [startDate, setStartDate] = useState<string>(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [stakeFilter, setStakeFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "cancelled">("all");
    const [sortField, setSortField] = useState<string>("date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    // Update date range based on preset
    const updateDateRange = (preset: DateRangePreset) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start: Date, end: Date;

        switch (preset) {
            case "today":
                start = new Date(today);
                end = new Date(today);
                end.setHours(23, 59, 59, 999);
                break;
            case "yesterday":
                start = new Date(today);
                start.setDate(start.getDate() - 1);
                end = new Date(today);
                end.setDate(end.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case "thisWeek":
                start = new Date(today);
                start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
                end = new Date(today);
                end.setHours(23, 59, 59, 999);
                break;
            case "thisMonth":
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(today);
                end.setHours(23, 59, 59, 999);
                break;
            case "custom":
                // Keep current dates, just switch to custom mode
                return;
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
        setDateRangePreset(preset);
    };

    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1;

    // Fetch comprehensive reports
    const payoutReport = useQuery(
        (api as any)["reports/comprehensiveStakeReport"].getDetailedYieldPayoutReport,
        userId || isAdmin
            ? {
                userId: userId,
                startDate: startTimestamp,
                endDate: endTimestamp,
                includeBLS: true,
            }
            : "skip"
    );

    const stakingReport = useQuery(
        (api as any)["reports/comprehensiveStakeReport"].getComprehensiveStakingReport,
        userId || isAdmin
            ? {
                userId: userId,
                startDate: startTimestamp,
                endDate: endTimestamp,
                status: statusFilter !== "all" ? statusFilter : undefined,
            }
            : "skip"
    );

    const financialReport = useQuery(
        (api as any)["reports/comprehensiveStakeReport"].getFinancialSummaryReport,
        userId || isAdmin
            ? {
                userId: userId,
                startDate: startTimestamp,
                endDate: endTimestamp,
            }
            : "skip"
    );

    // Export actions
    const exportPayoutReport = useAction((api as any)["reports/stakeExportComprehensive"].exportYieldPayoutReport);
    const exportStakingReport = useAction((api as any)["reports/stakeExportComprehensive"].exportStakingReport);
    const exportFinancialReport = useAction((api as any)["reports/stakeExportComprehensive"].exportFinancialSummaryReport);
    const exportComprehensive = useAction((api as any)["reports/stakeExportComprehensive"].exportComprehensiveReport);

    const handleExport = async (type: "payouts" | "staking" | "financial" | "all") => {
        try {
            let result;
            const params = {
                userId: userId,
                startDate: startTimestamp,
                endDate: endTimestamp,
            };

            switch (type) {
                case "payouts":
                    result = await exportPayoutReport(params);
                    break;
                case "staking":
                    result = await exportStakingReport(params);
                    break;
                case "financial":
                    result = await exportFinancialReport(params);
                    break;
                case "all":
                    result = await exportComprehensive(params);
                    break;
            }

            // Download file
            const blob = new Blob([result.content], { type: result.mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export report. Please try again.");
        }
    };

    // Filter and sort payouts
    const filteredPayouts = useMemo(() => {
        if (!payoutReport?.payouts) return [];
        let filtered = [...payoutReport.payouts];

        if (stakeFilter !== "all") {
            filtered = filtered.filter(p => p.stakeId === stakeFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal: any, bVal: any;
            switch (sortField) {
                case "date":
                    aVal = a.payoutDate;
                    bVal = b.payoutDate;
                    break;
                case "amount":
                    aVal = a.payoutAmount;
                    bVal = b.payoutAmount;
                    break;
                case "user":
                    aVal = a.userName;
                    bVal = b.userName;
                    break;
                default:
                    aVal = a.payoutDate;
                    bVal = b.payoutDate;
            }

            if (sortDirection === "asc") {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return filtered;
    }, [payoutReport, stakeFilter, sortField, sortDirection]);

    if (!payoutReport && !stakingReport && !financialReport) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                <span>Loading comprehensive report...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Comprehensive Stake Report</h2>
                        <p className="text-slate-400">Industry-standard financial reporting for finance teams</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleExport("all")}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <Download size={16} />
                            Export All
                        </button>
                    </div>
                </div>

                {/* Date Range Selector */}
                <div className="mt-4 space-y-3">
                    {/* Preset Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => updateDateRange("today")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                dateRangePreset === "today"
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                            }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => updateDateRange("yesterday")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                dateRangePreset === "yesterday"
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                            }`}
                        >
                            Yesterday
                        </button>
                        <button
                            onClick={() => updateDateRange("thisWeek")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                dateRangePreset === "thisWeek"
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                            }`}
                        >
                            This Week
                        </button>
                        <button
                            onClick={() => updateDateRange("thisMonth")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                dateRangePreset === "thisMonth"
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                            }`}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => {
                                setDateRangePreset("custom");
                            }}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                dateRangePreset === "custom"
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                            }`}
                        >
                            Custom
                        </button>
                    </div>

                    {/* Custom Date Inputs */}
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setDateRangePreset("custom");
                            }}
                            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setDateRangePreset("custom");
                            }}
                            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {dateRangePreset === "custom" && (
                            <span className="text-xs text-slate-500">Custom range selected</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
                <TabButton
                    active={activeTab === "payouts"}
                    onClick={() => setActiveTab("payouts")}
                    icon={<DollarSign size={16} />}
                    label="Yield Payouts"
                    count={payoutReport?.summary.totalPayouts}
                />
                <TabButton
                    active={activeTab === "staking"}
                    onClick={() => setActiveTab("staking")}
                    icon={<Activity size={16} />}
                    label="Staking Details"
                    count={stakingReport?.summary.totalStakes}
                />
                <TabButton
                    active={activeTab === "financial"}
                    onClick={() => setActiveTab("financial")}
                    icon={<BarChart3 size={16} />}
                    label="Financial Summary"
                />
            </div>

            {/* Content */}
            <div className="min-h-[600px]">
                {activeTab === "payouts" && (
                    <PayoutsTab
                        payoutReport={payoutReport}
                        filteredPayouts={filteredPayouts}
                        stakeFilter={stakeFilter}
                        setStakeFilter={setStakeFilter}
                        sortField={sortField}
                        setSortField={setSortField}
                        sortDirection={sortDirection}
                        setSortDirection={setSortDirection}
                        onExport={() => handleExport("payouts")}
                    />
                )}
                {activeTab === "staking" && (
                    <StakingTab
                        stakingReport={stakingReport}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        onExport={() => handleExport("staking")}
                    />
                )}
                {activeTab === "financial" && (
                    <FinancialTab
                        financialReport={financialReport}
                        onExport={() => handleExport("financial")}
                    />
                )}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label, count }: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    count?: number;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium text-sm transition-all border-b-2 ${
                active
                    ? "border-purple-500 text-purple-400 bg-slate-800/30"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
            }`}
        >
            {icon}
            {label}
            {count !== undefined && (
                <span className={`px-2 py-0.5 rounded text-xs ${active ? "bg-purple-500/20 text-purple-300" : "bg-slate-700 text-slate-400"}`}>
                    {count}
                </span>
            )}
        </button>
    );
}

function PayoutsTab({ payoutReport, filteredPayouts, stakeFilter, setStakeFilter, sortField, setSortField, sortDirection, setSortDirection, onExport }: any) {
    if (!payoutReport) return <div className="text-center text-slate-400 py-8">Loading payouts...</div>;

    const summary = payoutReport.summary;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Payouts"
                    value={summary.totalPayouts.toLocaleString()}
                    icon={<DollarSign />}
                    color="purple"
                />
                <SummaryCard
                    title="Total Amount"
                    value={`$${summary.totalAmount.toFixed(2)}`}
                    icon={<TrendingUp />}
                    color="emerald"
                />
                <SummaryCard
                    title="BLS Yield"
                    value={`${summary.totalBLS.toFixed(2)} BLS`}
                    icon={<PieChart />}
                    color="blue"
                />
                <SummaryCard
                    title="USDT Yield"
                    value={`$${summary.totalUSDT.toFixed(2)}`}
                    icon={<DollarSign />}
                    color="pink"
                />
            </div>

            {/* Filters and Controls */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-400">Sort by:</span>
                        <select
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value)}
                            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="date">Date</option>
                            <option value="amount">Amount</option>
                            <option value="user">User</option>
                        </select>
                        <button
                            onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            {sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        </button>
                    </div>
                    <button
                        onClick={onExport}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Payouts Table */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 border-b border-slate-800">
                            <tr>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Date</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">User</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Stake Amount</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Payout Amount</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Currency</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">
                                    Expected
                                    <span className="ml-1 text-xs text-slate-500" title="Expected daily yield = Stake Amount × Daily Rate">
                                        (?)
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">
                                    Variance
                                    <span className="ml-1 text-xs text-slate-500" title="Variance = Actual Payout - Expected Yield. Negative means payout was less than expected.">
                                        (?)
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayouts.slice(0, 100).map((payout: any) => (
                                <tr key={payout.payoutId} className="border-b border-slate-800 hover:bg-slate-800/30">
                                    <td className="p-4 text-sm text-slate-300">
                                        {new Date(payout.payoutDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-sm text-slate-300">
                                        <div>
                                            <div className="font-medium">{payout.userName}</div>
                                            <div className="text-xs text-slate-500">{payout.userEmail}</div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-300">
                                        ${payout.stakeAmount.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-sm font-medium text-emerald-400">
                                        {payout.payoutAmount.toFixed(2)} {payout.currency}
                                    </td>
                                    <td className="p-4 text-sm">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            payout.isBLS ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                                        }`}>
                                            {payout.currency}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-400">
                                        {payout.expectedDailyYield > 0 ? payout.expectedDailyYield.toFixed(2) : "N/A"}
                                    </td>
                                    <td className="p-4 text-sm">
                                        {payout.expectedDailyYield > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                <span className={`${payout.variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    {payout.variance >= 0 ? "+" : ""}{payout.variance.toFixed(2)} ({payout.variancePercentage.toFixed(1)}%)
                                                </span>
                                                {payout.varianceReason && (
                                                    <span className="text-xs text-slate-500 italic" title={payout.varianceReason}>
                                                        {payout.varianceReason.length > 30 
                                                            ? payout.varianceReason.substring(0, 30) + "..." 
                                                            : payout.varianceReason}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-500 text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm">
                                        {payout.status === "completed" ? (
                                            <CheckCircle size={16} className="text-emerald-400" />
                                        ) : (
                                            <Clock size={16} className="text-yellow-400" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredPayouts.length > 100 && (
                    <div className="p-4 text-center text-slate-400 text-sm">
                        Showing first 100 of {filteredPayouts.length} payouts. Export to see all.
                    </div>
                )}
            </div>
        </div>
    );
}

function StakingTab({ stakingReport, statusFilter, setStatusFilter, onExport }: any) {
    if (!stakingReport) return <div className="text-center text-slate-400 py-8">Loading staking details...</div>;

    const summary = stakingReport.summary;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Stakes"
                    value={summary.totalStakes.toLocaleString()}
                    icon={<Activity />}
                    color="purple"
                />
                <SummaryCard
                    title="Total Stake Amount"
                    value={`$${summary.totalStakeAmount.toFixed(2)}`}
                    icon={<DollarSign />}
                    color="emerald"
                />
                <SummaryCard
                    title="Total Yield Paid"
                    value={`$${summary.totalYieldPaid.toFixed(2)}`}
                    icon={<TrendingUp />}
                    color="blue"
                />
                <SummaryCard
                    title="Average ROI"
                    value={`${summary.averageROI.toFixed(2)}%`}
                    icon={<Target />}
                    color="pink"
                />
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-4">
                    <div className="text-sm text-slate-400 mb-1">Active Stakes</div>
                    <div className="text-2xl font-bold text-emerald-400">{summary.statusBreakdown.active}</div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-4">
                    <div className="text-sm text-slate-400 mb-1">Completed Stakes</div>
                    <div className="text-2xl font-bold text-blue-400">{summary.statusBreakdown.completed}</div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-4">
                    <div className="text-sm text-slate-400 mb-1">Cancelled Stakes</div>
                    <div className="text-2xl font-bold text-red-400">{summary.statusBreakdown.cancelled}</div>
                </div>
            </div>

            {/* Stakes Table */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-white">Detailed Stakes</h3>
                    <button
                        onClick={onExport}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 border-b border-slate-800">
                            <tr>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">User</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Stake Amount</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Cycle</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Daily Rate</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Status</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Yield Paid</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">ROI</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Performance</th>
                                <th className="p-4 font-medium text-slate-400 text-xs uppercase">Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stakingReport.stakes.slice(0, 50).map((stake: any) => (
                                <tr key={stake.stakeId} className="border-b border-slate-800 hover:bg-slate-800/30">
                                    <td className="p-4 text-sm text-slate-300">
                                        <div>
                                            <div className="font-medium">{stake.userName}</div>
                                            <div className="text-xs text-slate-500">{stake.userEmail}</div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-300">
                                        ${stake.stakeAmount.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-sm text-slate-300">
                                        {stake.cycleDays} days
                                    </td>
                                    <td className="p-4 text-sm text-slate-300">
                                        {stake.dailyRate.toFixed(4)}%
                                    </td>
                                    <td className="p-4 text-sm">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            stake.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                                            stake.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                                            "bg-red-500/20 text-red-400"
                                        }`}>
                                            {stake.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm font-medium text-emerald-400">
                                        ${stake.totalYieldPaid.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-sm text-slate-300">
                                        {stake.currentROI.toFixed(2)}%
                                    </td>
                                    <td className="p-4 text-sm">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            stake.performanceStatus === "ahead" ? "bg-emerald-500/20 text-emerald-400" :
                                            stake.performanceStatus === "on-track" ? "bg-blue-500/20 text-blue-400" :
                                            "bg-yellow-500/20 text-yellow-400"
                                        }`}>
                                            {stake.performanceStatus}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-800 rounded-full h-2">
                                                <div
                                                    className="bg-purple-500 h-2 rounded-full"
                                                    style={{ width: `${stake.completionPercentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-400">{stake.completionPercentage.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {stakingReport.stakes.length > 50 && (
                    <div className="p-4 text-center text-slate-400 text-sm">
                        Showing first 50 of {stakingReport.stakes.length} stakes. Export to see all.
                    </div>
                )}
            </div>
        </div>
    );
}

function FinancialTab({ financialReport, onExport }: any) {
    if (!financialReport) return <div className="text-center text-slate-400 py-8">Loading financial summary...</div>;

    return (
        <div className="space-y-6">
            {/* Historical Metrics */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Historical Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MetricCard label="Total Yield Paid" value={`$${financialReport.historical.totalYieldPaid.toFixed(2)}`} />
                    <MetricCard label="BLS Yield" value={`${financialReport.historical.blsYieldPaid.toFixed(2)} BLS`} />
                    <MetricCard label="USDT Yield" value={`$${financialReport.historical.usdtYieldPaid.toFixed(2)}`} />
                    <MetricCard label="Total Stake Amount" value={`$${financialReport.historical.totalStakeAmount.toFixed(2)}`} />
                    <MetricCard label="Overall ROI" value={`${financialReport.historical.overallROI.toFixed(2)}%`} />
                    <MetricCard label="Average Daily Yield" value={`$${financialReport.historical.averageDailyYield.toFixed(2)}`} />
                </div>
            </div>

            {/* Projections */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Projections</h3>
                    <button
                        onClick={onExport}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MetricCard label="Projected Remaining Yield" value={`$${financialReport.projections.totalProjectedRemainingYield.toFixed(2)}`} />
                    <MetricCard label="Projected Monthly Yield" value={`$${financialReport.projections.projectedMonthlyYield.toFixed(2)}`} />
                    <MetricCard label="Projected Annual Yield" value={`$${financialReport.projections.projectedAnnualYield.toFixed(2)}`} />
                    <MetricCard label="Projected Overall ROI" value={`${financialReport.projections.projectedOverallROI.toFixed(2)}%`} />
                    <MetricCard label="Active Stake Amount" value={`$${financialReport.projections.totalActiveStakeAmount.toFixed(2)}`} />
                    <MetricCard label="Total Daily Yield" value={`$${financialReport.projections.totalDailyYield.toFixed(2)}`} />
                </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Breakdown by Currency</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">BLS</span>
                            <span className="font-bold text-blue-400">{financialReport.breakdown.byCurrency.BLS.toFixed(2)} BLS</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">USDT</span>
                            <span className="font-bold text-emerald-400">${financialReport.breakdown.byCurrency.USDT.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Breakdown by Status</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Active</span>
                            <span className="font-bold text-emerald-400">{financialReport.breakdown.byStatus.active}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Completed</span>
                            <span className="font-bold text-blue-400">{financialReport.breakdown.byStatus.completed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Cancelled</span>
                            <span className="font-bold text-red-400">{financialReport.breakdown.byStatus.cancelled}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ title, value, icon, color }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: "purple" | "emerald" | "blue" | "pink";
}) {
    const colorClasses = {
        purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        pink: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    };

    return (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="text-sm text-slate-400 mb-1">{title}</div>
            <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[1]}`}>{value}</div>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">{label}</div>
            <div className="text-xl font-bold text-white">{value}</div>
        </div>
    );
}

