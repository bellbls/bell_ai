"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { DollarSign, Calendar, Filter, Download } from "lucide-react";

export function WithdrawalFeesReport() {
    const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all" | "custom">("month");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const report = useQuery(api.admin.getWithdrawalFeesReport, {
        dateRange: dateRange,
        startDate: startDate ? new Date(startDate).getTime() : undefined,
        endDate: endDate ? new Date(endDate).getTime() : undefined,
    });

    if (!report) {
        return <div className="p-8 text-center text-slate-400">Loading report data...</div>;
    }

    const { summary, withdrawals } = report;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Withdrawal Fees Report</h2>
                    <p className="text-slate-400 text-sm">Track withdrawal fees collected over time</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                    {(["today", "week", "month", "all", "custom"] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${dateRange === range
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Date Range Picker */}
            {dateRange === "custom" && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-4">Custom Date Range</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <DollarSign className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Total Fees Collected</p>
                            <h3 className="text-2xl font-bold text-white">${summary.totalFees.toFixed(2)}</h3>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Revenue from 5% withdrawal fee
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                            <DollarSign className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Total Withdrawals</p>
                            <h3 className="text-2xl font-bold text-white">${summary.totalAmount.toFixed(2)}</h3>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Total volume processed
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <Filter className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Request Count</p>
                            <h3 className="text-2xl font-bold text-white">{summary.count}</h3>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Total withdrawal requests
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-white">Detailed Breakdown</h3>
                    <button className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-sm">
                                <th className="p-4 font-medium">Date</th>
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium text-right">Amount</th>
                                <th className="p-4 font-medium text-right">Fee (5%)</th>
                                <th className="p-4 font-medium text-right">Net Amount</th>
                                <th className="p-4 font-medium text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {withdrawals.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No withdrawal records found for this period.
                                    </td>
                                </tr>
                            ) : (
                                withdrawals.map((item) => (
                                    <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 text-slate-300 text-sm">
                                            {new Date(item.requestDate).toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-white font-medium text-sm">{item.userName}</div>
                                            <div className="text-slate-500 text-xs">{item.userEmail}</div>
                                        </td>
                                        <td className="p-4 text-right text-slate-300 font-medium">
                                            ${item.amount.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right text-red-400 font-medium">
                                            -${item.fee.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right text-emerald-400 font-bold">
                                            ${item.netAmount.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.status === "completed" || item.status === "sent" || item.status === "approved"
                                                ? "bg-emerald-500/20 text-emerald-400"
                                                : item.status === "pending"
                                                    ? "bg-yellow-500/20 text-yellow-400"
                                                    : "bg-red-500/20 text-red-400"
                                                }`}>
                                                {item.status.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
