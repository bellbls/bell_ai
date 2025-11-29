"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
    Calendar, Download, Filter, TrendingUp, Users, 
    DollarSign, Package, Clock, CheckCircle, XCircle,
    AlertCircle, BarChart3, PieChart, Activity, FileText,
    Search, ArrowUpDown, Lock, Unlock, Award
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    PieChart as RePieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

type DateRange = "today" | "week" | "month" | "all" | "custom";
type OrderStatus = "all" | "pending" | "confirmed" | "converted" | "cancelled";
type ReportTab = "purchases" | "vesting" | "analytics" | "audit";

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export function PresaleReportsPanel() {
    const [activeTab, setActiveTab] = useState<ReportTab>("purchases");
    const [dateRange, setDateRange] = useState<DateRange>("month");
    const [orderStatus, setOrderStatus] = useState<OrderStatus>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch reports data
    const detailedReport = useQuery(api.admin.getDetailedPresaleReport, {
        dateRange,
        startDate: startDate ? new Date(startDate).getTime() : undefined,
        endDate: endDate ? new Date(endDate).getTime() : undefined,
        status: orderStatus,
    });

    const vestingReport = useQuery(api.admin.getVestingScheduleReport);
    const userAnalytics = useQuery(api.admin.getPresaleUserAnalytics);
    const auditLog = useQuery(api.admin.getPresaleAuditLog, { limit: 100 });

    const handleExportCSV = () => {
        if (!detailedReport) return;
        
        const csvData = detailedReport.orders.map(order => ({
            "Order ID": order.orderId,
            "User Name": order.userName,
            "User Email": order.userEmail,
            "User Rank": order.userRank,
            "Quantity": order.quantity,
            "Total Amount": order.totalAmount,
            "Status": order.status,
            "Purchase Date": new Date(order.purchaseDate).toLocaleString(),
            "Converted Date": order.convertedDate ? new Date(order.convertedDate).toLocaleString() : "N/A",
            "Payment TX": order.paymentTxId,
            "Vesting Unlocked %": order.vestingProgress.percentageUnlocked.toFixed(2),
        }));

        const csvContent = [
            Object.keys(csvData[0]).join(","),
            ...csvData.map(row => Object.values(row).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `presale-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handleExportJSON = () => {
        if (!detailedReport) return;
        
        const jsonData = JSON.stringify({
            exportDate: new Date().toISOString(),
            dateRange,
            status: orderStatus,
            summary: detailedReport.summary,
            orders: detailedReport.orders,
        }, null, 2);

        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `presale-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const reportTabs = [
        { id: "purchases" as const, label: "Purchase Details", icon: <Package className="w-4 h-4" /> },
        { id: "vesting" as const, label: "Vesting Schedule", icon: <Clock className="w-4 h-4" /> },
        { id: "analytics" as const, label: "User Analytics", icon: <PieChart className="w-4 h-4" /> },
        { id: "audit" as const, label: "Audit Log", icon: <FileText className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-6">
            {/* Header with Filters */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-purple-400" />
                        Presale Detailed Reports
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 transition-all"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                        <button
                            onClick={handleExportJSON}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-all"
                        >
                            <Download className="w-4 h-4" />
                            Export JSON
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Date Range
                        </label>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as DateRange)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="today">Today</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                            <option value="all">All Time</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {/* Order Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            <Filter className="w-4 h-4 inline mr-2" />
                            Order Status
                        </label>
                        <select
                            value={orderStatus}
                            onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="all">All Orders</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="converted">Converted</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Custom Date Range */}
                    {dateRange === "custom" && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Summary Stats */}
            {detailedReport && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Orders"
                        value={detailedReport.summary.totalOrders.toString()}
                        subtitle={`${detailedReport.summary.uniqueBuyers} unique buyers`}
                        icon={<Package className="w-6 h-6 text-purple-400" />}
                        color="purple"
                    />
                    <StatCard
                        title="Total Revenue"
                        value={`$${detailedReport.summary.totalRevenue.toLocaleString()}`}
                        subtitle={`Avg: $${detailedReport.summary.avgOrderValue.toFixed(2)} | Per User: $${(detailedReport.summary.totalRevenue / Math.max(detailedReport.summary.uniqueBuyers, 1)).toFixed(2)}`}
                        icon={<DollarSign className="w-6 h-6 text-emerald-400" />}
                        color="emerald"
                    />
                    <StatCard
                        title="Nodes Sold"
                        value={detailedReport.summary.totalNodes.toString()}
                        subtitle={`Avg: ${detailedReport.summary.avgNodesPerOrder.toFixed(1)}/order`}
                        icon={<Activity className="w-6 h-6 text-blue-400" />}
                        color="blue"
                    />
                    <StatCard
                        title="Conversion Rate"
                        value={`${((detailedReport.summary.statusBreakdown.confirmed + detailedReport.summary.statusBreakdown.converted) / Math.max(detailedReport.summary.totalOrders, 1) * 100).toFixed(1)}%`}
                        subtitle={`${detailedReport.summary.statusBreakdown.confirmed + detailedReport.summary.statusBreakdown.converted} confirmed`}
                        icon={<TrendingUp className="w-6 h-6 text-pink-400" />}
                        color="pink"
                    />
                </div>
            )}

            {/* Enhanced Metrics Row */}
            {detailedReport && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-4">
                        <div className="text-xs text-slate-400 mb-1">Avg Time to Convert</div>
                        <div className="text-lg font-bold text-white">
                            {detailedReport.summary.avgTimeToConversion ? `${detailedReport.summary.avgTimeToConversion.toFixed(1)} days` : 'N/A'}
                        </div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-4">
                        <div className="text-xs text-slate-400 mb-1">Revenue Growth (7d)</div>
                        <div className={`text-lg font-bold ${detailedReport.summary.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {detailedReport.summary.revenueGrowth >= 0 ? '+' : ''}{detailedReport.summary.revenueGrowth.toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-4">
                        <div className="text-xs text-slate-400 mb-1">Orders Growth (7d)</div>
                        <div className={`text-lg font-bold ${detailedReport.summary.nodesGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {detailedReport.summary.nodesGrowth >= 0 ? '+' : ''}{detailedReport.summary.nodesGrowth.toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-4">
                        <div className="text-xs text-slate-400 mb-1">Converted Stakes</div>
                        <div className="text-lg font-bold text-indigo-400">
                            {detailedReport.summary.convertedStakesCount || 0}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            ${(detailedReport.summary.totalConvertedStakeValue || 0).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-4">
                        <div className="text-xs text-slate-400 mb-1">Pending Orders</div>
                        <div className="text-lg font-bold text-yellow-400">
                            {detailedReport.summary.statusBreakdown.pending || 0}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {reportTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                            activeTab === tab.id
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[600px]">
                {activeTab === "purchases" && detailedReport && (
                    <PurchaseDetailsTab 
                        data={detailedReport} 
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                    />
                )}
                {activeTab === "vesting" && vestingReport && (
                    <VestingScheduleTab data={vestingReport} />
                )}
                {activeTab === "analytics" && userAnalytics && (
                    <UserAnalyticsTab data={userAnalytics} />
                )}
                {activeTab === "audit" && auditLog && (
                    <AuditLogTab data={auditLog} />
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, subtitle, icon, color }: any) {
    const colorClasses = {
        purple: "from-purple-500/10 to-purple-600/10 border-purple-500/20",
        emerald: "from-emerald-500/10 to-emerald-600/10 border-emerald-500/20",
        blue: "from-blue-500/10 to-blue-600/10 border-blue-500/20",
        pink: "from-pink-500/10 to-pink-600/10 border-pink-500/20",
    };

    const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.purple;
    return (
        <div className={`p-6 bg-gradient-to-br ${colorClass} backdrop-blur-sm rounded-2xl border`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="text-sm font-medium text-slate-400 mb-1">{title}</div>
                    <div className="text-3xl font-bold text-white">{value}</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-xl">
                    {icon}
                </div>
            </div>
            <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
    );
}

function PurchaseDetailsTab({ data, searchTerm, setSearchTerm }: any) {
    const [sortField, setSortField] = useState<string>("purchaseDate");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    const filteredOrders = data.orders.filter((order: any) =>
        order.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderId.includes(searchTerm)
    );

    const sortedOrders = [...filteredOrders].sort((a: any, b: any) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        return sortDirection === "asc" 
            ? (aVal > bVal ? 1 : -1)
            : (aVal < bVal ? 1 : -1);
    });

    return (
        <div className="space-y-6">
            {/* Time Series Chart */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold mb-6">Order Trends</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.timeSeriesData}>
                            <defs>
                                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                stroke="#94a3b8" 
                                fontSize={12}
                                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            />
                            <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} />
                            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <Legend />
                            <Area 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="orders" 
                                stroke="#8b5cf6" 
                                fillOpacity={1} 
                                fill="url(#colorOrders)"
                                name="Orders"
                            />
                            <Area 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="revenue" 
                                stroke="#10b981" 
                                fillOpacity={1} 
                                fill="url(#colorRevenue)"
                                name="Revenue ($)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by user name, email, or order ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-950 border-b border-slate-800">
                            <tr>
                                <th className="p-4 text-left text-sm font-medium text-slate-400">User</th>
                                <th className="p-4 text-left text-sm font-medium text-slate-400">Rank</th>
                                <th className="p-4 text-right text-sm font-medium text-slate-400">Nodes</th>
                                <th className="p-4 text-right text-sm font-medium text-slate-400">Amount</th>
                                <th className="p-4 text-center text-sm font-medium text-slate-400">Status</th>
                                <th className="p-4 text-center text-sm font-medium text-slate-400">Vesting Progress</th>
                                <th className="p-4 text-right text-sm font-medium text-slate-400">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {sortedOrders.map((order: any) => (
                                <tr key={order.orderId} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-white">{order.userName}</div>
                                        <div className="text-xs text-slate-500">{order.userEmail}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                                            {order.userRank}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-white">{order.quantity}</td>
                                    <td className="p-4 text-right font-bold text-emerald-400">
                                        ${order.totalAmount.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-full bg-slate-800 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${order.vestingProgress.percentageUnlocked}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {order.vestingProgress.percentageUnlocked.toFixed(0)}% unlocked
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-sm text-slate-400">
                                        {new Date(order.purchaseDate).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function VestingScheduleTab({ data }: any) {
    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-400">Total Vesting</h4>
                        <Package className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">${data.summary.totalVesting.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-400">Locked</h4>
                        <Lock className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">${data.summary.totalLocked.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">{data.summary.percentageLocked.toFixed(1)}%</div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-400">Unlocked</h4>
                        <Unlock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">${data.summary.totalUnlocked.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">{data.summary.percentageUnlocked.toFixed(1)}%</div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-400">Claimed</h4>
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">${data.summary.totalClaimed.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">{data.summary.percentageClaimed.toFixed(1)}%</div>
                </div>
            </div>

            {/* Vesting Timeline Chart */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold mb-6">Vesting Timeline</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.vestingTimeline}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                stroke="#94a3b8" 
                                fontSize={12}
                                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <Legend />
                            <Bar dataKey="locked" stackId="a" fill="#ef4444" name="Locked" />
                            <Bar dataKey="unlocked" stackId="a" fill="#f59e0b" name="Unlocked" />
                            <Bar dataKey="claimed" stackId="a" fill="#10b981" name="Claimed" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* User Vesting Details */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-lg font-bold">User Vesting Details</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-950 border-b border-slate-800">
                            <tr>
                                <th className="p-4 text-left text-sm font-medium text-slate-400">User</th>
                                <th className="p-4 text-right text-sm font-medium text-slate-400">Total Purchased</th>
                                <th className="p-4 text-right text-sm font-medium text-slate-400">Locked</th>
                                <th className="p-4 text-right text-sm font-medium text-slate-400">Unlocked</th>
                                <th className="p-4 text-right text-sm font-medium text-slate-400">Claimed</th>
                                <th className="p-4 text-center text-sm font-medium text-slate-400">Next Unlock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {data.userVesting.map((user: any) => (
                                <tr key={user.userId} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-white">{user.userName}</div>
                                        <div className="text-xs text-slate-500">{user.userEmail}</div>
                                    </td>
                                    <td className="p-4 text-right font-bold text-white">
                                        ${user.totalPurchased.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right text-red-400">
                                        ${user.totalLocked.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right text-yellow-400">
                                        ${user.totalUnlocked.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right text-emerald-400">
                                        ${user.totalClaimed.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        {user.nextUnlockDate ? (
                                            <div>
                                                <div className="text-sm text-white">
                                                    {new Date(user.nextUnlockDate).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    ${user.nextUnlockAmount.toFixed(2)}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function UserAnalyticsTab({ data }: any) {
    return (
        <div className="space-y-6">
            {/* Top Buyers */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold mb-6">Top 20 Buyers</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-950 border-b border-slate-800">
                            <tr>
                                <th className="p-4 text-left text-sm font-medium text-slate-400">Rank</th>
                                <th className="p-4 text-left text-sm font-medium text-slate-400">User</th>
                                <th className="p-4 text-center text-sm font-medium text-slate-400">User Rank</th>
                                <th className="p-4 text-right text-sm font-medium text-slate-400">Total Spent</th>
                                <th className="p-4 text-right text-sm font-medium text-slate-400">Nodes</th>
                                <th className="p-4 text-right text-sm font-medium text-slate-400">Orders</th>
                                <th className="p-4 text-right text-sm font-medium text-slate-400">Avg Order</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {data.topBuyers.map((buyer: any, index: number) => (
                                <tr key={buyer.userId} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                            index === 0 ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30' :
                                            index === 1 ? 'bg-slate-400/20 text-slate-400 border-2 border-slate-400/30' :
                                            index === 2 ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/30' :
                                            'bg-slate-800 text-slate-400'
                                        }`}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-white">{buyer.userName}</div>
                                        <div className="text-xs text-slate-500">{buyer.userEmail}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                                            {buyer.userRank}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-emerald-400">
                                        ${buyer.totalSpent.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right font-bold text-white">{buyer.totalNodes}</td>
                                    <td className="p-4 text-right text-slate-300">{buyer.orderCount}</td>
                                    <td className="p-4 text-right text-slate-400">
                                        ${buyer.avgOrderValue.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Purchase Size Distribution */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-6">Purchase Size Distribution</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.distributionBuckets}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                                />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Rank Distribution */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-6">Buyer Rank Distribution</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={data.rankDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ payload, percent }: any) => {
                                        const rank = payload?.rank || 'Unknown';
                                        const pct = percent ? (percent * 100).toFixed(0) : '0';
                                        return `${rank}: ${pct}%`;
                                    }}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {data.rankDistribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">{data.totalBuyers}</div>
                    <div className="text-sm text-slate-400">Total Unique Buyers</div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">{data.totalOrders}</div>
                    <div className="text-sm text-slate-400">Total Orders</div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 text-center">
                    <div className="text-3xl font-bold text-emerald-400 mb-2">
                        {data.avgOrdersPerBuyer.toFixed(1)}
                    </div>
                    <div className="text-sm text-slate-400">Avg Orders per Buyer</div>
                </div>
            </div>
        </div>
    );
}

function AuditLogTab({ data }: any) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-bold">System Audit Log</h3>
                <p className="text-sm text-slate-400 mt-1">Last 100 presale system actions</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-950 border-b border-slate-800">
                        <tr>
                            <th className="p-4 text-left text-sm font-medium text-slate-400">Timestamp</th>
                            <th className="p-4 text-left text-sm font-medium text-slate-400">Action</th>
                            <th className="p-4 text-left text-sm font-medium text-slate-400">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {data.map((log: any) => (
                            <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="p-4 text-sm text-slate-400">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="p-4">
                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                                        {log.action}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-300">
                                    <pre className="text-xs">{JSON.stringify(log.details, null, 2)}</pre>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
        pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", icon: <AlertCircle className="w-3 h-3" /> },
        confirmed: { bg: "bg-emerald-500/20", text: "text-emerald-400", icon: <CheckCircle className="w-3 h-3" /> },
        converted: { bg: "bg-blue-500/20", text: "text-blue-400", icon: <Activity className="w-3 h-3" /> },
        cancelled: { bg: "bg-red-500/20", text: "text-red-400", icon: <XCircle className="w-3 h-3" /> },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {config.icon}
            {status.toUpperCase()}
        </span>
    );
}

