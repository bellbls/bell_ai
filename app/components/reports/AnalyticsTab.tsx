"use client";

import { AnalyticsData } from "./types";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from "recharts";

interface AnalyticsTabProps {
    analytics: AnalyticsData;
}

const COLORS = ["#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#6366f1", "#06b6d4"];

export function AnalyticsTab({ analytics }: AnalyticsTabProps) {
    // Prepare data for charts
    const dailyData = analytics.daily.map(d => ({
        ...d,
        date: d.date.split('-').slice(1).join('/') // Format MM/DD
    }));

    const cycleData = Object.entries(analytics.byCycle).map(([cycle, amount]) => ({
        name: `${cycle} Days`,
        value: amount
    }));

    return (
        <div className="flex flex-col gap-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    label="Projected Monthly Yield"
                    value={`$${analytics.summary.projectedMonthlyYield.toFixed(2)}`}
                    subtext="Based on active stakes"
                />
                <SummaryCard
                    label="Growth Rate (30d)"
                    value={`${analytics.summary.growthRate > 0 ? "+" : ""}${analytics.summary.growthRate.toFixed(1)}%`}
                    valueColor={analytics.summary.growthRate >= 0 ? "text-emerald-400" : "text-red-400"}
                    subtext="Vs previous 30 days"
                />
                <SummaryCard
                    label="Best Day"
                    value={analytics.summary.bestDay ? `+$${analytics.summary.bestDay.yield.toFixed(2)}` : "N/A"}
                    subtext={analytics.summary.bestDay?.date || "-"}
                    valueColor="text-emerald-400"
                />
                <SummaryCard
                    label="Worst Day"
                    value={analytics.summary.worstDay ? `+$${analytics.summary.worstDay.yield.toFixed(2)}` : "N/A"}
                    subtext={analytics.summary.worstDay?.date || "-"}
                    valueColor="text-slate-200"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Yield Trend */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-6 text-slate-100">Daily Yield Trend</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData}>
                                <defs>
                                    <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Yield"]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="yield"
                                    stroke="#8b5cf6"
                                    fillOpacity={1}
                                    fill="url(#colorYield)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Yield by Cycle */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-6 text-slate-100">Yield Distribution by Cycle</h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {cycleData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={cycleData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {cycleData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                        formatter={(value: number) => [`$${value.toFixed(2)}`, "Total Yield"]}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-slate-500 italic">No data available</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, subtext, valueColor = "text-white" }: { label: string, value: string, subtext?: string, valueColor?: string }) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-5">
            <div className="text-sm text-slate-400 mb-2">{label}</div>
            <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
            {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
        </div>
    );
}
