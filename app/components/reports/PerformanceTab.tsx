"use client";

import { PerformanceData } from "./types";

interface PerformanceTabProps {
    performance: PerformanceData[];
}

export function PerformanceTab({ performance }: PerformanceTabProps) {
    const activeStakes = performance.filter((p) => p.status === "active");
    const completedStakes = performance.filter((p) => p.status === "completed");

    return (
        <div className="flex flex-col gap-8">
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    Active Stakes
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-full">{activeStakes.length}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeStakes.length > 0 ? (
                        activeStakes.map((stake) => (
                            <StakeCard key={stake.stakeId} stake={stake} />
                        ))
                    ) : (
                        <div className="col-span-full p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500 italic">
                            No active stakes found
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    Completed Stakes
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-full">{completedStakes.length}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedStakes.length > 0 ? (
                        completedStakes.map((stake) => (
                            <StakeCard key={stake.stakeId} stake={stake} />
                        ))
                    ) : (
                        <div className="col-span-full p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500 italic">
                            No completed stakes found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StakeCard({ stake }: { stake: PerformanceData }) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "ahead": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
            case "behind": return "bg-red-500/20 text-red-400 border-red-500/30";
            default: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
        }
    };

    const statusClass = getStatusColor(stake.performance);

    return (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="text-3xl font-bold text-white mb-1">${stake.amount.toLocaleString()}</div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Stake Amount</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${statusClass} uppercase tracking-wide`}>
                    {stake.performance}
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <DetailRow label="Cycle Duration" value={`${stake.cycle} Days`} />
                <DetailRow label="Daily Rate" value={`${stake.rate}%`} />
                <DetailRow label="Yield Earned" value={`+$${stake.yieldEarned.toFixed(2)}`} valueColor="text-emerald-400" />
                <DetailRow label="Projected Total" value={`$${stake.projectedYield.toFixed(2)}`} />
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                    <span>Progress</span>
                    <span>{stake.completionPercentage.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${stake.completionPercentage}%` }}
                    />
                </div>
                <div className="text-right text-xs text-slate-500">
                    {stake.daysRemaining > 0
                        ? `${stake.daysRemaining} days remaining`
                        : "Completed"}
                </div>
            </div>
        </div>
    );
}

function DetailRow({ label, value, valueColor = "text-slate-200" }: { label: string, value: string, valueColor?: string }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">{label}</span>
            <span className={`font-medium ${valueColor}`}>{value}</span>
        </div>
    );
}
