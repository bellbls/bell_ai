"use client";

import { OverviewData, PortfolioData } from "./types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface OverviewTabProps {
    overview: OverviewData;
    portfolio: PortfolioData;
    onExport: () => void;
}

const COLORS = ["#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#6366f1", "#06b6d4"];

export function OverviewTab({ overview, portfolio, onExport }: OverviewTabProps) {
    const cycleData = Object.entries(overview.cycleDistribution).map(([cycle, count]) => ({
        name: `${cycle} Days`,
        value: count
    }));

    return (
        <div className="flex flex-col gap-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Active Stakes"
                    value={overview.totalStakes.active.toString()}
                    subtext={`Volume: $${overview.totalAmount.active.toLocaleString()}`}
                />
                <StatCard
                    label="Total Yield Earned"
                    value={`$${overview.totalYield.toFixed(2)}`}
                    valueColor="text-emerald-400"
                    subtext={`Avg Daily: $${overview.averageDailyYield.toFixed(2)}`}
                />
                <StatCard
                    label="Completed Stakes"
                    value={overview.totalStakes.completed.toString()}
                    subtext={`Volume: $${overview.totalAmount.completed.toLocaleString()}`}
                />
                <StatCard
                    label="Diversification Score"
                    value={`${portfolio.diversificationScore}/100`}
                    valueColor={portfolio.diversificationScore > 70 ? "text-emerald-400" : "text-yellow-400"}
                    subtext="Based on cycle mix"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cycle Distribution Chart */}
                <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-6 text-slate-100">Active Stake Distribution</h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {cycleData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={cycleData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {cycleData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                        formatter={(value: number) => [value, "Stakes"]}
                                    />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-slate-500 italic">No active stakes</div>
                        )}
                    </div>
                </div>

                {/* Risk Profile */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-6 text-slate-100">Risk Profile</h3>
                    <div className="space-y-6">
                        <RiskBar
                            label="Low Risk (90+ Days)"
                            amount={portfolio.riskProfile.low.amount}
                            percentage={portfolio.riskProfile.low.percentage}
                            color="bg-emerald-500"
                        />
                        <RiskBar
                            label="Medium Risk (30-89 Days)"
                            amount={portfolio.riskProfile.medium.amount}
                            percentage={portfolio.riskProfile.medium.percentage}
                            color="bg-blue-500"
                        />
                        <RiskBar
                            label="High Risk (<30 Days)"
                            amount={portfolio.riskProfile.high.amount}
                            percentage={portfolio.riskProfile.high.percentage}
                            color="bg-orange-500"
                        />
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Total Portfolio Value</span>
                            <span className="font-bold text-white text-lg">${overview.totalAmount.active.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, subtext, valueColor = "text-white" }: { label: string, value: string, subtext?: string, valueColor?: string }) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-5">
            <div className="text-sm text-slate-400 mb-2">{label}</div>
            <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
            {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
        </div>
    );
}

function RiskBar({ label, amount, percentage, color }: { label: string, amount: number, percentage: number, color: string }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-2 text-sm">
                <span className="text-slate-300">{label}</span>
                <span className="font-medium text-slate-200">${amount.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="text-right text-xs text-slate-500 mt-1">{percentage.toFixed(1)}%</div>
        </div>
    );
}
