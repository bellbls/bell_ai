"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Users, Network, TrendingUp, DollarSign, Award, ChevronDown, ChevronUp } from "lucide-react";
import { UnilevelTreeViewer } from "./UnilevelTreeViewer";

interface UnilevelSystemReportProps {
    allUsers?: any[];
    selectedUserId?: Id<"users"> | null;
    onUserSelect?: (userId: Id<"users"> | null) => void;
}

export function UnilevelSystemReport({
    allUsers = [],
    selectedUserId = null,
    onUserSelect
}: UnilevelSystemReportProps) {
    const [showTreeViewer, setShowTreeViewer] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "referrals" | "levels">("referrals");

    // Fetch unilevel statistics
    const unilevelStats = useQuery(api.admin.getUnilevelSystemStats);

    // Filter and sort users
    const filteredUsers = allUsers
        .filter(user => 
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case "name":
                    return (a.name || "").localeCompare(b.name || "");
                case "referrals":
                    return (b.directReferrals || 0) - (a.directReferrals || 0);
                case "levels":
                    return (b.unlockedLevels || 0) - (a.unlockedLevels || 0);
                default:
                    return 0;
            }
        });

    if (!unilevelStats) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8 text-center">
                <Network className="w-16 h-16 mx-auto mb-4 text-slate-600 animate-pulse" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">Loading Unilevel Statistics...</h3>
                <p className="text-slate-500">Analyzing network structure and commissions</p>
            </div>
        );
    }

    const {
        totalUsers = 0,
        usersWithReferrals = 0,
        totalCommissionsPaid = 0,
        averageUnlockedLevels = 0,
        topRecruiters = [],
        levelDistribution = []
    } = unilevelStats;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* System Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-400">Total Network Users</h4>
                        <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{totalUsers.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">
                        {usersWithReferrals} with referrals
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-400">Commissions Paid</h4>
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">${totalCommissionsPaid.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">All-time earnings</div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-400">Avg Levels Unlocked</h4>
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{averageUnlockedLevels.toFixed(1)}</div>
                    <div className="text-xs text-slate-500 mt-1">Out of 10 levels</div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-400">Network Activity</h4>
                        <Network className="w-5 h-5 text-pink-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {((usersWithReferrals / totalUsers) * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Active recruitment rate</div>
                </div>
            </div>

            {/* Level Distribution Chart */}
            {levelDistribution && levelDistribution.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-6">Level Unlock Distribution</h3>
                    <div className="space-y-3">
                        {levelDistribution.map((item: any) => (
                            <div key={item.level} className="flex items-center gap-4">
                                <div className="w-24 text-sm font-medium text-slate-300">
                                    Level {item.level}
                                </div>
                                <div className="flex-1">
                                    <div className="relative w-full h-8 bg-slate-800 rounded-lg overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 flex items-center justify-end px-3"
                                            style={{ width: `${(item.count / totalUsers) * 100}%` }}
                                        >
                                            <span className="text-xs font-bold text-white">
                                                {item.count}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-20 text-right text-sm font-medium text-slate-400">
                                    {((item.count / totalUsers) * 100).toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Recruiters */}
            {topRecruiters && topRecruiters.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-6">Top Recruiters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {topRecruiters.slice(0, 6).map((user: any, index: number) => (
                            <div
                                key={user._id}
                                className="flex items-center gap-4 p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl transition-colors border border-slate-800/50 cursor-pointer"
                                onClick={() => onUserSelect && onUserSelect(user._id)}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                                    index === 0 ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30' :
                                    index === 1 ? 'bg-slate-400/20 text-slate-400 border-2 border-slate-400/30' :
                                    index === 2 ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/30' :
                                    'bg-slate-700 text-slate-400'
                                }`}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-slate-200">{user.name}</div>
                                    <div className="text-xs text-slate-500">{user.email}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-purple-400">{user.directReferrals}</div>
                                    <div className="text-xs text-slate-500">referrals</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* User List with Tree Viewer */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">All Users Network View</h3>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="referrals">Sort by Referrals</option>
                            <option value="levels">Sort by Levels</option>
                            <option value="name">Sort by Name</option>
                        </select>
                    </div>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto mb-6">
                    <table className="w-full">
                        <thead className="border-b border-slate-800">
                            <tr>
                                <th className="text-left p-3 text-sm font-medium text-slate-400">User</th>
                                <th className="text-center p-3 text-sm font-medium text-slate-400">Direct Referrals</th>
                                <th className="text-center p-3 text-sm font-medium text-slate-400">Active Directs</th>
                                <th className="text-center p-3 text-sm font-medium text-slate-400">Unlocked Levels</th>
                                <th className="text-right p-3 text-sm font-medium text-slate-400">Total Earned</th>
                                <th className="text-center p-3 text-sm font-medium text-slate-400">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user: any) => (
                                <tr key={user._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                    <td className="p-3">
                                        <div className="font-medium text-slate-200">{user.name}</div>
                                        <div className="text-xs text-slate-500">{user.email}</div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="text-slate-300 font-medium">
                                            {user.directReferrals || 0}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="text-emerald-400 font-medium">
                                            {user.activeDirectReferrals || 0}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="text-purple-400 font-medium">
                                            {user.unlockedLevels || 0} / 10
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className="text-emerald-400 font-bold">
                                            ${(user.walletBalance || 0).toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => {
                                                if (onUserSelect) {
                                                    if (selectedUserId === user._id) {
                                                        onUserSelect(null);
                                                        setShowTreeViewer(false);
                                                    } else {
                                                        onUserSelect(user._id);
                                                        setShowTreeViewer(true);
                                                    }
                                                }
                                            }}
                                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                                selectedUserId === user._id
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                            }`}
                                        >
                                            {selectedUserId === user._id ? "Hide Tree" : "View Tree"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Tree Viewer for Selected User */}
                {showTreeViewer && selectedUserId && (
                    <div className="border-t border-slate-800 pt-6 mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold">Network Tree for Selected User</h4>
                            <button
                                onClick={() => {
                                    setShowTreeViewer(false);
                                    if (onUserSelect) onUserSelect(null);
                                }}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all"
                            >
                                Close Tree View
                            </button>
                        </div>
                        <UnilevelTreeViewer userId={selectedUserId} />
                    </div>
                )}
            </div>

            {/* Commission Rates Reference */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold mb-4">Unilevel Commission Structure</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { levels: "L1", rate: "3%", color: "from-purple-500 to-purple-600" },
                        { levels: "L2", rate: "2%", color: "from-blue-500 to-blue-600" },
                        { levels: "L3-L8", rate: "1%", color: "from-emerald-500 to-emerald-600" },
                        { levels: "L9", rate: "2%", color: "from-pink-500 to-pink-600" },
                        { levels: "L10", rate: "3%", color: "from-orange-500 to-orange-600" }
                    ].map((item) => (
                        <div key={item.levels} className="text-center">
                            <div className={`py-3 rounded-lg bg-gradient-to-r ${item.color} mb-2`}>
                                <div className="text-2xl font-bold text-white">{item.rate}</div>
                            </div>
                            <div className="text-sm text-slate-400">{item.levels}</div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 p-4 bg-slate-800/30 rounded-lg">
                    <p className="text-sm text-slate-400">
                        <Award className="inline w-4 h-4 mr-2 text-yellow-400" />
                        Levels unlock based on active direct referrals: 1 for L1-L2, 2 for L3-L4, 3 for L5-L6, 4 for L7-L8, and 5 for L9-L10
                    </p>
                </div>
            </div>
        </div>
    );
}

