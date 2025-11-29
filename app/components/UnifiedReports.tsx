import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import {
    BarChart3,
    TrendingUp,
    Users,
    Download,
    Activity,
    Rocket
} from "lucide-react";
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import { SystemWideStakeReports } from "./SystemWideStakeReports";
import { UnilevelSystemReport } from "./UnilevelSystemReport";
import { WithdrawalFeesReport } from "./WithdrawalFeesReport";
import { BRankPayoutReport } from "./BRankPayoutReport";
import { PresaleReportsPanel } from "./PresaleReportsPanel";
import { ComprehensiveStakeReport } from "./ComprehensiveStakeReport";

type TabId = "analytics" | "stake" | "comprehensive" | "unilevel" | "fees" | "brank" | "presale";

interface ReportTab {
    id: TabId;
    icon: React.ReactElement;
    label: string;
    description: string;
}

export function UnifiedReports({
    revenueTrends,
    userGrowth,
    topPerformers,
    recentActivities,
    allUsers,
    selectedUserId,
    onUserSelect,
    blsConfig
}: any) {
    const [activeTab, setActiveTab] = useState<TabId>("analytics");

    const reportTabs: ReportTab[] = [
        { id: "analytics", icon: <BarChart3 size={20} />, label: "Platform Analytics", description: "Growth & Revenue" },
        { id: "stake", icon: <TrendingUp size={20} />, label: "Stake Reports", description: "System-wide Stakes" },
        { id: "comprehensive", icon: <BarChart3 size={20} />, label: "Comprehensive Report", description: "Finance Team Report" },
        { id: "unilevel", icon: <Users size={20} />, label: "Unilevel System", description: "Network Structure" },
        { id: "fees", icon: <Download size={20} />, label: "Withdrawal Fees", description: "Fee Analytics" },
        { id: "brank", icon: <Activity size={20} />, label: "B-Rank Payouts", description: "Rank Bonuses" },
        { id: "presale", icon: <Rocket size={20} />, label: "Presale Reports", description: "Detailed Analytics" }
    ];

    return (
        <div className="space-y-6">
            {/* Horizontal Tab Navigation */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-2">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {reportTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap relative group ${
                                activeTab === tab.id
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                            }`}
                        >
                            <div className={`transition-colors ${
                                activeTab === tab.id ? "text-white" : "text-slate-500 group-hover:text-purple-400"
                            }`}>
                                {tab.icon}
                            </div>
                            <span className="font-semibold">{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="min-w-0">
                {/* Platform Analytics Tab */}
                {activeTab === "analytics" && (
                    <AnalyticsTabContent
                        revenueTrends={revenueTrends}
                        userGrowth={userGrowth}
                        topPerformers={topPerformers}
                        recentActivities={recentActivities}
                        blsConfig={blsConfig}
                    />
                )}

                {/* Stake Reports Tab */}
                {activeTab === "stake" && (
                    <SystemWideStakeReports />
                )}

                {/* Comprehensive Stake Report Tab */}
                {activeTab === "comprehensive" && (
                    <ComprehensiveStakeReport isAdmin={true} />
                )}

                {/* Unilevel System Tab */}
                {activeTab === "unilevel" && (
                    <UnilevelSystemReport
                        allUsers={allUsers}
                        selectedUserId={selectedUserId}
                        onUserSelect={onUserSelect}
                    />
                )}

                {/* Withdrawal Fees Tab */}
                {activeTab === "fees" && (
                    <WithdrawalFeesReport />
                )}

                {/* B-Rank Payouts Tab */}
                {activeTab === "brank" && (
                    <BRankPayoutsTab />
                )}

                {/* Presale Tab */}
                {activeTab === "presale" && (
                    <PresaleReportsPanel />
                )}
            </div>
        </div>
    );
}

function AnalyticsTabContent({ revenueTrends, userGrowth, topPerformers, recentActivities, blsConfig }: any) {
    // Calculate quick stats
    const totalRevenue = revenueTrends?.reduce((sum: number, day: any) => sum + (day.total || 0), 0) || 0;
    const totalBLS = revenueTrends?.reduce((sum: number, day: any) => sum + (day.totalBLS || 0), 0) || 0;
    const totalUsers = userGrowth?.[userGrowth.length - 1]?.totalUsers || 0;
    const newUsers = userGrowth?.reduce((sum: number, day: any) => sum + (day.newUsers || 0), 0) || 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-xl border border-purple-500/30 p-4">
                    <div className="text-xs text-purple-300 mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold text-white">
                        ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    {blsConfig?.isEnabled && totalBLS > 0 && (
                        <div className="text-sm text-purple-400 mt-1">
                            {totalBLS.toFixed(2)} BLS
                        </div>
                    )}
                </div>
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-xl border border-blue-500/30 p-4">
                    <div className="text-xs text-blue-300 mb-1">Total Users</div>
                    <div className="text-2xl font-bold text-white">{totalUsers.toLocaleString()}</div>
                    <div className="text-sm text-blue-400 mt-1">+{newUsers} new</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 backdrop-blur-sm rounded-xl border border-emerald-500/30 p-4">
                    <div className="text-xs text-emerald-300 mb-1">Top Performers</div>
                    <div className="text-2xl font-bold text-white">
                        {topPerformers?.byVolume?.length || 0}
                    </div>
                    <div className="text-sm text-emerald-400 mt-1">Active leaders</div>
                </div>
                <div className="bg-gradient-to-br from-pink-600/20 to-pink-800/20 backdrop-blur-sm rounded-xl border border-pink-500/30 p-4">
                    <div className="text-xs text-pink-300 mb-1">Recent Activities</div>
                    <div className="text-2xl font-bold text-white">
                        {recentActivities?.length || 0}
                    </div>
                    <div className="text-sm text-pink-400 mt-1">Last 20 transactions</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trends */}
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Revenue Trends</h3>
                            <p className="text-xs text-slate-400">Daily yield & commission distribution</p>
                        </div>
                        <select className="bg-slate-800/50 border border-slate-700 text-xs text-slate-300 rounded-lg px-3 py-2 hover:bg-slate-800 transition-colors">
                            <option>Last 30 Days</option>
                            <option>Last 90 Days</option>
                        </select>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueTrends || []}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} fontSize={12} />
                                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} fontSize={12} tickFormatter={(val) => `$${val}`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                                <Area type="monotone" dataKey="total" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* User Growth */}
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">User Growth</h3>
                            <p className="text-xs text-slate-400">New registrations & total users</p>
                        </div>
                        <select className="bg-slate-800/50 border border-slate-700 text-xs text-slate-300 rounded-lg px-3 py-2 hover:bg-slate-800 transition-colors">
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={userGrowth || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} fontSize={12} />
                                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                                <Line type="monotone" dataKey="totalUsers" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="newUsers" stroke="#ec4899" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TopPerformersList title="Top by Volume" data={topPerformers?.byVolume || []} metric="teamVolume" />
                <TopPerformersList title="Top by Earnings" data={topPerformers?.byEarnings || []} metric="walletBalance" />
                <TopPerformersList title="Top by Referrals" data={topPerformers?.byReferrals || []} metric="directReferrals" />
            </div>

            {/* Recent Activities */}
            <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6">Recent Activities</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {(recentActivities || []).map((activity: any) => (
                        <div key={activity._id} className="flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/60 rounded-xl transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50 hover:shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${activity.amount >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    <Activity size={16} />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-200">{activity.userName}</div>
                                    <div className="text-xs text-slate-400">{activity.description}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`font-bold ${activity.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    <div>{activity.amount >= 0 ? '+' : ''}${activity.amount.toFixed(2)}</div>
                                    {blsConfig?.isEnabled && activity.blsAmount && (
                                        <div className="text-sm text-purple-400 mt-0.5">
                                            {activity.amount >= 0 ? '+' : ''}{activity.blsAmount.toFixed(2)} BLS
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {new Date(activity.timestamp).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function TopPerformersList({ title, data, metric }: { title: string, data: any[], metric: string }) {
    return (
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>
            <div className="space-y-3">
                {data.slice(0, 5).map((user, index) => (
                    <div key={user._id} className="flex items-center gap-3 p-2 hover:bg-slate-800/30 rounded-lg transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                index === 1 ? 'bg-slate-400/20 text-slate-400 border border-slate-400/30' :
                                    index === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                        'bg-slate-800 text-slate-500'
                            }`}>
                            {index + 1}
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-sm text-slate-200">{user.name}</div>
                            <div className="text-xs text-slate-500">{user.rank}</div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-purple-400">
                                {metric === 'teamVolume' || metric === 'walletBalance'
                                    ? `$${user[metric].toLocaleString()}`
                                    : user[metric]}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BRankPayoutsTab() {
    const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all" | "custom">("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const reportData = useQuery(api.admin.getBRankPayoutReport, {
        dateRange,
        startDate: startDate ? new Date(startDate).getTime() : undefined,
        endDate: endDate ? new Date(endDate).getTime() : undefined,
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Date Range Filters */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold mb-4">Date Range</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                    <button
                        onClick={() => setDateRange("today")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${dateRange === "today" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setDateRange("week")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${dateRange === "week" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                    >
                        Last 7 Days
                    </button>
                    <button
                        onClick={() => setDateRange("month")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${dateRange === "month" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                    >
                        Last 30 Days
                    </button>
                    <button
                        onClick={() => setDateRange("all")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${dateRange === "all" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                    >
                        All Time
                    </button>
                    <button
                        onClick={() => setDateRange("custom")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${dateRange === "custom" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            }`}
                    >
                        Custom Range
                    </button>
                </div>

                {dateRange === "custom" && (
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
                )}
            </div>

            {/* Report Component */}
            <BRankPayoutReport reportData={reportData} />
        </div>
    );
}

