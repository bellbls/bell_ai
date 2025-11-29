"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Award, TrendingUp, AlertCircle } from "lucide-react";

interface BRankCapCardProps {
    userId: Id<"users">;
}

export function BRankCapCard({ userId }: BRankCapCardProps) {
    const capInfo = useQuery(api.rankQueries.getBRankCapInfo, { userId });

    if (!capInfo) {
        return (
            <div className="p-6 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 animate-pulse">
                <div className="h-6 bg-slate-800 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
            </div>
        );
    }

    const { currentRank, totalActiveStake, cappingMultiplier, currentCap, totalReceived, remainingCap, isCapReached } = capInfo;
    const progressPercentage = currentCap > 0 ? Math.min((totalReceived / currentCap) * 100, 100) : 0;

    const getStatusColor = () => {
        if (isCapReached) return "red";
        if (progressPercentage >= 90) return "yellow";
        if (progressPercentage >= 70) return "orange";
        return "emerald";
    };

    const statusColor = getStatusColor();

    return (
        <div className="p-6 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/10 rounded-xl">
                        <Award className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">B-Rank Bonus Status</h3>
                        <p className="text-sm text-slate-400">Rank: <span className="text-purple-400 font-bold">{currentRank}</span></p>
                    </div>
                </div>
                {isCapReached && (
                    <div className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        CAP REACHED
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-slate-800/50 rounded-xl">
                    <div className="text-xs text-slate-400 mb-1">Active Stake</div>
                    <div className="text-lg font-bold text-white">${totalActiveStake.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl">
                    <div className="text-xs text-slate-400 mb-1">Cap Multiplier</div>
                    <div className="text-lg font-bold text-purple-400">{cappingMultiplier}x</div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl">
                    <div className="text-xs text-slate-400 mb-1">Bonus Cap</div>
                    <div className="text-lg font-bold text-white">${currentCap.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl">
                    <div className="text-xs text-slate-400 mb-1">Remaining</div>
                    <div className={`text-lg font-bold text-${statusColor}-400`}>${remainingCap.toLocaleString()}</div>
                </div>
            </div>

            <div className="mb-3">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400">Bonuses Received</span>
                    <span className="text-xs font-bold text-white">${totalReceived.toLocaleString()} / ${currentCap.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r from-${statusColor}-500 to-${statusColor}-400 transition-all duration-500`}
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
                <div className="text-xs text-slate-500 mt-1 text-right">
                    {progressPercentage.toFixed(1)}% utilized
                </div>
            </div>

            {isCapReached ? (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-red-300">
                        You've reached your B-Rank bonus cap. <span className="font-bold">Stake more to increase your cap</span> and continue earning bonuses!
                    </div>
                </div>
            ) : progressPercentage >= 90 ? (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-yellow-300">
                        You're approaching your bonus cap. Consider staking more to increase your earning potential.
                    </div>
                </div>
            ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-emerald-300">
                        You have <span className="font-bold">${remainingCap.toLocaleString()}</span> remaining in your bonus cap. Keep earning!
                    </div>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-500">
                    💡 <span className="font-medium">How it works:</span> Your max bonus cap = Active Stake × {cappingMultiplier}x. Stake more to increase your cap!
                </div>
            </div>
        </div>
    );
}
