"use client";

import { useState } from "react";
import { Calendar, Download, DollarSign, TrendingUp, Hash } from "lucide-react";

export function BRankPayoutReport({ reportData }: any) {
    const [dateRange, setDateRange] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    if (!reportData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading...</div>
            </div>
        );
    }

    const { summary, transactions, isBLSEnabled } = reportData;

    // Filter transactions by search term
    const filteredTransactions = transactions.filter((t: any) =>
        t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sourceUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.rank.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const headers = ["Date", "User", "Email", "Rank", "Amount (USDT)"];
        if (isBLSEnabled) {
            headers.push("Amount (BLS)");
        }
        headers.push("Source User", "Running Total");
        
        const csv = [
            headers,
            ...filteredTransactions.map((t: any) => {
                const row = [
                    new Date(t.timestamp).toLocaleString(),
                    t.userName,
                    t.userEmail,
                    t.rank,
                    t.amount.toFixed(2),
                ];
                if (isBLSEnabled) {
                    row.push(t.blsAmount ? t.blsAmount.toFixed(2) : "0.00");
                }
                row.push(t.sourceUserName, t.runningTotal.toFixed(2));
                return row;
            })
        ].map(row => row.join(",")).join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `brank-payouts-${new Date().toISOString()}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">B-Rank Payout Report</h2>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium"
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <DollarSign className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">Total Paid</div>
                            <div className="text-2xl font-bold text-white">
                                ${summary.totalPaid.toFixed(2)}
                            </div>
                            {isBLSEnabled && summary.totalBLS && (
                                <div className="text-sm text-purple-400 mt-1">
                                    {summary.totalBLS.toFixed(2)} BLS
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <Hash className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">Total Transactions</div>
                            <div className="text-2xl font-bold text-white">
                                {summary.count}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">Average Payout</div>
                            <div className="text-2xl font-bold text-white">
                                ${summary.averagePayout.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-4">
                <input
                    type="text"
                    placeholder="Search by user name, email, source user, or rank..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>

            {/* Transactions Table */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-900 border-b border-slate-800">
                            <tr>
                                <th className="p-4 text-left font-medium text-slate-400">Date</th>
                                <th className="p-4 text-left font-medium text-slate-400">User</th>
                                <th className="p-4 text-left font-medium text-slate-400">Rank</th>
                                <th className="p-4 text-left font-medium text-slate-400">
                                    Amount{isBLSEnabled ? " (USDT / BLS)" : ""}
                                </th>
                                <th className="p-4 text-left font-medium text-slate-400">Source User</th>
                                <th className="p-4 text-left font-medium text-slate-400">Running Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No B-Rank payouts found
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t: any) => (
                                    <tr key={t._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                        <td className="p-4 text-sm text-slate-400">
                                            {new Date(t.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-white">{t.userName}</div>
                                            <div className="text-xs text-slate-500">{t.userEmail}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                                                {t.rank}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-emerald-400">
                                            <div>+${t.amount.toFixed(2)}</div>
                                            {isBLSEnabled && t.blsAmount && (
                                                <div className="text-sm text-purple-400 mt-1">
                                                    +{t.blsAmount.toFixed(2)} BLS
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-slate-300">
                                            {t.sourceUserName}
                                        </td>
                                        <td className="p-4 font-medium text-white">
                                            ${t.runningTotal.toFixed(2)}
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
