"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
    DollarSign, TrendingUp, Activity, Download,
    Calendar, PieChart as PieChartIcon, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import {
    LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

type DateRange = "today" | "week" | "month" | "all" | "custom";
type SortField = "userName" | "amount" | "cycleDays" | "dailyRate" | "totalPayout" | "startDate" | "status";
type SortDirection = "asc" | "desc";

export function SystemWideStakeReports() {
    const [dateRange, setDateRange] = useState<DateRange>("month");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");
    const [sortField, setSortField] = useState<SortField>("startDate");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    // Fetch stake report data
    const stakeReport = useQuery(api.admin.getSystemStakeReport, {
        dateRange,
        startDate: customStartDate ? new Date(customStartDate).getTime() : undefined,
        endDate: customEndDate ? new Date(customEndDate).getTime() : undefined,
    });

    const handleExportCSV = () => {
        if (!stakeReport) return;

        // Create CSV content
        const headers = ["Date", "New Stakes", "Stake Value", "Yield Paid"];
        const rows = stakeReport.stakesByDay.map(day => [
            day.date,
            day.newStakes,
            day.stakeValue.toFixed(2),
            day.yieldPaid.toFixed(2)
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        // Download CSV
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stake-report-${dateRange}-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const COLORS = ["#8b5cf6", "#ec4899", "#06b6d4", "#10b981", "#f59e0b"];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Date Range Selector */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white">System-Wide Stake Report</h3>
                        <p className="text-sm text-slate-400">Financial overview for the finance department</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setDateRange("today")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${dateRange === "today"
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setDateRange("week")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${dateRange === "week"
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                }`}
                        >
                            This Week
                        </button>
                        <button
                            onClick={() => setDateRange("month")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${dateRange === "month"
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                }`}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => setDateRange("all")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${dateRange === "all"
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                }`}
                        >
                            All Time
                        </button>
                        <button
                            onClick={handleExportCSV}
                            disabled={!stakeReport}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Custom Date Range */}
                {dateRange === "custom" && (
                    <div className="mt-4 flex gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Start Date</label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">End Date</label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                    </div>
                )}
            </div>

            {!stakeReport ? (
                <div className="flex items-center justify-center p-12 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div className="text-slate-400">Loading stake data...</div>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <SummaryCard
                            title="Total Stakes"
                            value={stakeReport.summary.totalStakes.toString()}
                            icon={<Activity className="w-5 h-5" />}
                            color="bg-purple-500"
                        />
                        <SummaryCard
                            title="Total Stake Value"
                            value={`$${stakeReport.summary.totalStakeValue.toLocaleString()}`}
                            icon={<DollarSign className="w-5 h-5" />}
                            color="bg-emerald-500"
                        />
                        <SummaryCard
                            title="Total Yield Paid"
                            value={`$${stakeReport.summary.totalYieldPaid.toLocaleString()}`}
                            icon={<TrendingUp className="w-5 h-5" />}
                            color="bg-blue-500"
                        />
                        <SummaryCard
                            title="Active Stakes"
                            value={stakeReport.summary.activeStakes.toString()}
                            icon={<Activity className="w-5 h-5" />}
                            color="bg-pink-500"
                        />
                        <SummaryCard
                            title="Expired Stakes"
                            value={stakeReport.summary.expiredStakes.toString()}
                            icon={<Calendar className="w-5 h-5" />}
                            color="bg-orange-500"
                        />
                        <SummaryCard
                            title="Average Stake"
                            value={`$${stakeReport.summary.averageStakeAmount.toLocaleString()}`}
                            icon={<DollarSign className="w-5 h-5" />}
                            color="bg-cyan-500"
                        />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Stakes Over Time */}
                        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                            <h3 className="text-lg font-bold text-white mb-6">Stakes Over Time</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stakeReport.stakesByDay}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} fontSize={12} />
                                        <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} fontSize={12} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="newStakes" stroke="#8b5cf6" strokeWidth={2} name="New Stakes" />
                                        <Line type="monotone" dataKey="stakeValue" stroke="#10b981" strokeWidth={2} name="Stake Value ($)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Stakes by Cycle */}
                        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                            <h3 className="text-lg font-bold text-white mb-6">Stakes by Cycle</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stakeReport.stakesByCycle}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ payload }: any) => {
                                                const days = payload?.days || 0;
                                                const count = payload?.count || 0;
                                                return `${days}d (${count})`;
                                            }}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="count"
                                        >
                                            {stakeReport.stakesByCycle.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Top Stakers */}
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Top Stakers</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900 border-b border-slate-800">
                                    <tr>
                                        <th className="p-4 font-medium text-slate-400">User</th>
                                        <th className="p-4 font-medium text-slate-400">Email</th>
                                        <th className="p-4 font-medium text-slate-400">Total Staked</th>
                                        <th className="p-4 font-medium text-slate-400">Active Stakes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stakeReport.topStakers.map((staker, index) => (
                                        <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="p-4 font-medium text-white">{staker.userName}</td>
                                            <td className="p-4 text-slate-400">{staker.userEmail}</td>
                                            <td className="p-4 font-bold text-emerald-400">${staker.totalStaked.toLocaleString()}</td>
                                            <td className="p-4 text-slate-300">{staker.activeStakes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Stakes */}
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Recent Stakes</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900 border-b border-slate-800">
                                    <tr>
                                        <th className="p-4 font-medium text-slate-400">User</th>
                                        <th className="p-4 font-medium text-slate-400">Amount</th>
                                        <th className="p-4 font-medium text-slate-400">Cycle</th>
                                        <th className="p-4 font-medium text-slate-400">Daily Rate</th>
                                        <th className="p-4 font-medium text-slate-400">Status</th>
                                        <th className="p-4 font-medium text-slate-400">Start Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stakeReport.recentStakes.map((stake) => (
                                        <tr key={stake._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="p-4">
                                                <div className="font-medium text-white">{stake.userName}</div>
                                                <div className="text-xs text-slate-500">{stake.userEmail}</div>
                                            </td>
                                            <td className="p-4 font-bold text-white">${stake.amount.toLocaleString()}</td>
                                            <td className="p-4 text-slate-300">{stake.cycleDays} days</td>
                                            <td className="p-4 text-slate-300">{stake.dailyRate}%</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs ${stake.status === "active"
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : "bg-slate-500/20 text-slate-400"
                                                    }`}>
                                                    {stake.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-slate-400">
                                                {new Date(stake.startDate).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detailed Sortable Stakes Table */}
                    <DetailedStakesTable
                        stakes={stakeReport.recentStakes}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={(field) => {
                            if (sortField === field) {
                                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                            } else {
                                setSortField(field);
                                setSortDirection("desc");
                            }
                        }}
                    />
                </>
            )}
        </div>
    );
}

function SummaryCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
                    <div className={`${color.replace('bg-', 'text-')}`}>
                        {icon}
                    </div>
                </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-sm text-slate-400">{title}</div>
        </div>
    );
}

interface DetailedStakesTableProps {
    stakes: any[];
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;
}

function DetailedStakesTable({ stakes, sortField, sortDirection, onSort }: DetailedStakesTableProps) {
    // Use actual yield paid from system (not calculated)
    const stakesWithPayouts = useMemo(() => {
        return stakes.map(stake => {
            // Backend now provides actualYieldPaid and expectedTotal
            return {
                ...stake,
                totalPayout: stake.actualYieldPaid || 0 // Use actual from system
            };
        });
    }, [stakes]);

    // Sort stakes based on current sort field and direction
    const sortedStakes = useMemo(() => {
        const sorted = [...stakesWithPayouts].sort((a, b) => {
            let aValue: any = a[sortField];
            let bValue: any = b[sortField];

            // Handle nested userName
            if (sortField === "userName") {
                aValue = a.userName.toLowerCase();
                bValue = b.userName.toLowerCase();
            }

            if (typeof aValue === "string") {
                return sortDirection === "asc"
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            return sortDirection === "asc"
                ? aValue - bValue
                : bValue - aValue;
        });
        return sorted;
    }, [stakesWithPayouts, sortField, sortDirection]);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ArrowUpDown className="w-4 h-4 text-slate-500" />;
        }
        return sortDirection === "asc"
            ? <ArrowUp className="w-4 h-4 text-purple-400" />
            : <ArrowDown className="w-4 h-4 text-purple-400" />;
    };

    return (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Detailed Stakes Report</h3>
                    <p className="text-sm text-slate-400">Complete list of all stakes with sortable columns</p>
                </div>
                <div className="text-sm text-slate-400">
                    {sortedStakes.length} stakes total
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-900 border-b border-slate-800">
                        <tr>
                            <th
                                className="p-4 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors"
                                onClick={() => onSort("userName")}
                            >
                                <div className="flex items-center gap-2">
                                    User
                                    <SortIcon field="userName" />
                                </div>
                            </th>
                            <th
                                className="p-4 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors"
                                onClick={() => onSort("amount")}
                            >
                                <div className="flex items-center gap-2">
                                    Stake Amount
                                    <SortIcon field="amount" />
                                </div>
                            </th>
                            <th
                                className="p-4 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors"
                                onClick={() => onSort("cycleDays")}
                            >
                                <div className="flex items-center gap-2">
                                    Cycle
                                    <SortIcon field="cycleDays" />
                                </div>
                            </th>
                            <th
                                className="p-4 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors"
                                onClick={() => onSort("dailyRate")}
                            >
                                <div className="flex items-center gap-2">
                                    Daily Rate
                                    <SortIcon field="dailyRate" />
                                </div>
                            </th>
                            <th
                                className="p-4 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors"
                                onClick={() => onSort("totalPayout")}
                            >
                                <div className="flex items-center gap-2">
                                    Yield Paid
                                    <SortIcon field="totalPayout" />
                                </div>
                            </th>
                            <th className="p-4 font-medium text-slate-400">Expected Total</th>
                            <th className="p-4 font-medium text-slate-400">Progress</th>
                            <th
                                className="p-4 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors"
                                onClick={() => onSort("status")}
                            >
                                <div className="flex items-center gap-2">
                                    Status
                                    <SortIcon field="status" />
                                </div>
                            </th>
                            <th
                                className="p-4 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors"
                                onClick={() => onSort("startDate")}
                            >
                                <div className="flex items-center gap-2">
                                    Start Date
                                    <SortIcon field="startDate" />
                                </div>
                            </th>
                            <th className="p-4 font-medium text-slate-400">End Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedStakes.map((stake) => (
                            <tr key={stake._id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                <td className="p-4">
                                    <div className="font-medium text-white">{stake.userName}</div>
                                    <div className="text-xs text-slate-500">{stake.userEmail}</div>
                                </td>
                                <td className="p-4 font-bold text-white">
                                    ${stake.amount.toLocaleString()}
                                </td>
                                <td className="p-4 text-slate-300">
                                    {stake.cycleDays} days
                                </td>
                                <td className="p-4 text-slate-300">
                                    {stake.dailyRate}%
                                </td>
                                <td className="p-4 font-bold text-emerald-400">
                                    ${stake.totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-slate-300">
                                    ${(stake.expectedTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                                                style={{ width: `${stake.expectedTotal > 0 ? Math.min((stake.totalPayout / stake.expectedTotal) * 100, 100) : 0}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 min-w-[3rem] text-right">
                                            {stake.expectedTotal > 0 ? Math.min(Math.round((stake.totalPayout / stake.expectedTotal) * 100), 100) : 0}%
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${stake.status === "active"
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : stake.status === "completed"
                                            ? "bg-blue-500/20 text-blue-400"
                                            : "bg-slate-500/20 text-slate-400"
                                        }`}>
                                        {stake.status}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-400">
                                    {new Date(stake.startDate).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-sm text-slate-400">
                                    {new Date(stake.endDate).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div >
    );
}
