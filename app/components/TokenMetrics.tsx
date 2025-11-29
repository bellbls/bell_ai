"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { TrendingUp, Users, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface TokenMetricsProps {
    network?: string;
}

export default function TokenMetrics({ network }: TokenMetricsProps) {
    const metrics = useQuery(api.contractInfo.getTokenMetrics, network ? { network } : {});

    if (!metrics) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-gray-500">Loading metrics...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Token Metrics</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-green-200 rounded-lg">
                            <ArrowDownCircle className="w-5 h-5 text-green-700" />
                        </div>
                        <span className="text-xs font-medium text-green-700">Total Deposits</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                        ${metrics.totalDeposits.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                        {metrics.depositCount} transactions
                    </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-200 rounded-lg">
                            <ArrowUpCircle className="w-5 h-5 text-blue-700" />
                        </div>
                        <span className="text-xs font-medium text-blue-700">Total Withdrawals</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                        ${metrics.totalWithdrawals.toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                        {metrics.totalWithdrawals > 0 ? "Active" : "No withdrawals yet"}
                    </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-purple-200 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-purple-700" />
                        </div>
                        <span className="text-xs font-medium text-purple-700">Total Staked</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">
                        ${metrics.totalStaked.toFixed(2)}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                        From staking system
                    </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-orange-200 rounded-lg">
                            <Users className="w-5 h-5 text-orange-700" />
                        </div>
                        <span className="text-xs font-medium text-orange-700">Active Users</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-900">
                        {metrics.activeUsers}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                        Users with deposits
                    </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-gray-200 rounded-lg">
                            <Wallet className="w-5 h-5 text-gray-700" />
                        </div>
                        <span className="text-xs font-medium text-gray-700">Net Flow</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        ${(metrics.totalDeposits - metrics.totalWithdrawals).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                        Deposits - Withdrawals
                    </p>
                </div>
            </div>

            {/* Top Depositors */}
            {metrics.topDepositors.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Depositors</h4>
                    <div className="space-y-2">
                        {metrics.topDepositors.map((depositor, index) => (
                            <div
                                key={depositor.address}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-xs font-medium text-gray-700">
                                        {index + 1}
                                    </span>
                                    <code className="text-xs font-mono text-gray-600">
                                        {depositor.address.substring(0, 10)}...{depositor.address.substring(34)}
                                    </code>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">
                                    ${depositor.total.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


