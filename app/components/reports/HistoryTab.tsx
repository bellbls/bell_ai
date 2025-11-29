"use client";

import { Download } from "lucide-react";
import { HistoryData } from "./types";

interface HistoryTabProps {
    history: HistoryData;
    onExport: () => void;
}

export function HistoryTab({ history, onExport }: HistoryTabProps) {
    return (
        <div className="flex flex-col gap-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="Total Yield" value={`$${history.summary.totalYield.toFixed(2)}`} />
                <StatBox label="Transactions" value={history.summary.transactionCount.toString()} />
                <StatBox label="Avg Yield" value={`$${history.summary.averageYield.toFixed(2)}`} />
                <StatBox label="Highest Yield" value={`$${history.summary.highestYield.toFixed(2)}`} />
            </div>

            {/* Transactions Table */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-100">Transaction History</h3>
                    <button
                        onClick={onExport}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium">Stake Amount</th>
                                <th className="px-6 py-4 font-medium">Rate</th>
                                <th className="px-6 py-4 font-medium">Yield</th>
                                <th className="px-6 py-4 font-medium">Cumulative</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {history.transactions.length > 0 ? (
                                history.transactions.map((tx) => (
                                    <tr key={tx._id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-slate-300">{tx.date}</td>
                                        <td className="px-6 py-4 text-slate-300">{tx.description}</td>
                                        <td className="px-6 py-4 text-slate-300">${tx.stakeAmount.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-slate-300">{tx.rate}%</td>
                                        <td className="px-6 py-4 font-bold text-emerald-400">+${tx.yieldAmount.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-slate-300">${tx.cumulativeYield.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                        No transactions found for this period
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value }: { label: string, value: string }) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-4 text-center">
            <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">{label}</div>
            <div className="text-xl font-bold text-white">{value}</div>
        </div>
    );
}
