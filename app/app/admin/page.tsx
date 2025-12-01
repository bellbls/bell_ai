"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
    Save, Shield, Activity, Settings, Users,
    Wallet, TrendingUp, LayoutDashboard,
    FileText, PieChart, Bell, Search, Menu, X,
    CheckCircle, XCircle, AlertCircle, Plus, Edit, Trash2,
    Download, RefreshCw, BarChart3, DollarSign, Award, LogOut,
    Pause, Play, Coins
} from "lucide-react";
import Image from "next/image";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RePieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from "recharts";
import { ToastContainer } from "../../components/Toast";
import { ConfirmModal } from "../../components/ConfirmModal";
import { useToast } from "../../hooks/useToast";
import NetworkStatusDashboard from "../../components/NetworkStatusDashboard";
import { UnifiedReports } from "../../components/UnifiedReports";
import { AdminPresalePanel } from "../../components/AdminPresalePanel";
import { PresaleReportsPanel } from "../../components/PresaleReportsPanel";
import ContractOverview from "../../components/ContractOverview";
import BlockchainEventsFeed from "../../components/BlockchainEventsFeed";
import TokenMetrics from "../../components/TokenMetrics";
import BlockchainAdminControls from "../../components/BlockchainAdminControls";

const COLORS = ["#94a3b8", "#8b5cf6", "#6366f1", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899"];

export default function AdminPage() {
    const [passcode, setPasscode] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const toast = useToast();
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: "danger" | "warning" | "info" }>({ isOpen: false, title: "", message: "", onConfirm: () => { }, type: "info" });

    // Queries
    const systemOverview = useQuery(api.admin.getSystemOverview);
    const rankDistribution = useQuery(api.admin.getRankDistribution);
    const stakingAnalytics = useQuery(api.admin.getStakingAnalytics);
    const revenueTrends = useQuery(api.admin.getRevenueTrends, { days: 30 });
    const topPerformers = useQuery(api.admin.getTopPerformers, { limit: 10 });
    const recentActivities = useQuery(api.admin.getRecentActivities, { limit: 20 });
    const commissionBreakdown = useQuery(api.admin.getCommissionBreakdown);
    const userGrowth = useQuery(api.admin.getUserGrowth, { days: 30 });

    const rankRules = useQuery(api.config.get, { key: "rank_rules" });
    const stakingCycles = useQuery(api.config.get, { key: "staking_cycles" });
    const allUsers = useQuery(api.users.getAllUsers);
    const pendingWithdrawals = useQuery(api.wallet.getPendingWithdrawals);
    const cronLogs = useQuery(api.admin.getCronLogs, { limit: 10 });
    const pauseStates = useQuery(api.configs.getSystemPauseStates);
    const blsConfig = useQuery(api.bls.getBLSConfig);

    // Mutations
    const updateConfig = useMutation(api.config.update);
    const createVRank = useMutation(api.adminMutations.createVRank);
    const updateVRank = useMutation(api.adminMutations.updateVRank);
    const deleteVRank = useMutation(api.adminMutations.deleteVRank);
    const createStakingCycle = useMutation(api.adminMutations.createStakingCycle);
    const updateStakingCycle = useMutation(api.adminMutations.updateStakingCycle);
    const deleteStakingCycle = useMutation(api.adminMutations.deleteStakingCycle);
    const recalculateAllRanks = useMutation(api.adminMutations.recalculateAllRanks);
    const approveWithdrawal = useMutation(api.wallet.approveWithdrawal);
    const rejectWithdrawal = useMutation(api.wallet.rejectWithdrawal);
    const toggleStakingPause = useMutation(api.configs.toggleStakingPause);
    const toggleWithdrawalsPause = useMutation(api.configs.toggleWithdrawalsPause);
    const toggleReferralBonuses = useMutation(api.configs.toggleReferralBonuses);
    const toggleBLSSystem = useMutation(api.bls.toggleBLSSystem);
    const updateBLSConfig = useMutation(api.bls.updateBLSConfig);

    // Local state for forms
    const [showRankForm, setShowRankForm] = useState(false);
    const [showCycleForm, setShowCycleForm] = useState(false);
    const [editingRank, setEditingRank] = useState<any>(null);
    const [editingCycle, setEditingCycle] = useState<any>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const handleLogin = () => {
        if (passcode === "admin123") {
            setIsAuthenticated(true);
        } else {
            toast.error("Invalid passcode");
        }
    };

    const handleApproveWithdrawal = async (id: any) => {
        setConfirmModal({
            isOpen: true,
            title: "Approve Withdrawal",
            message: "Are you sure you want to approve this withdrawal?",
            type: "info",
            onConfirm: async () => {
                await approveWithdrawal({ withdrawalId: id, txHash: "manual_approval" });
                toast.success("Withdrawal approved successfully!");
            }
        });
    };

    const handleRejectWithdrawal = async (id: any) => {
        setConfirmModal({
            isOpen: true,
            title: "Reject Withdrawal",
            message: "Are you sure you want to reject this withdrawal?",
            type: "danger",
            onConfirm: async () => {
                await rejectWithdrawal({ withdrawalId: id });
                toast.success("Withdrawal rejected");
            }
        });
    };

    const handleExportData = async () => {
        const data = await fetch('/api/admin/export').then(r => r.json());
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anchorchain-export-${new Date().toISOString()}.json`;
        a.click();
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950" />
                <div className="p-8 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 max-w-sm w-full relative z-10 shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="w-32 h-32 rounded-2xl flex items-center justify-center overflow-hidden">
                            <Image
                                src="/images/logos/ailogo.png"
                                alt="BellAi Admin Logo"
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold mb-2 text-center">Admin Portal</h1>
                    <p className="text-slate-400 text-center mb-6 text-sm">Secure access required</p>
                    <input
                        type="password"
                        placeholder="Passcode"
                        className="w-full p-3 bg-slate-800/50 rounded-xl border border-slate-700 mb-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-center tracking-widest"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    />
                    <button
                        onClick={handleLogin}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all"
                    >
                        Unlock Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex font-sans">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 transition-transform duration-300 ease-in-out flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    } lg:relative lg:translate-x-0`}
            >
                <div className="p-6 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                        <Image
                            src="/images/logos/ailogo.png"
                            alt="BellAi Admin Logo"
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="px-4 space-y-2 mt-4 flex-1 overflow-y-auto">
                    <SidebarItem
                        icon={<LayoutDashboard />}
                        label="Dashboard"
                        active={activeTab === "dashboard"}
                        onClick={() => setActiveTab("dashboard")}
                    />
                    <SidebarItem
                        icon={<BarChart3 />}
                        label="Reports"
                        active={activeTab === "reports"}
                        onClick={() => setActiveTab("reports")}
                    />
                    <SidebarItem
                        icon={<Shield />}
                        label="Presale"
                        active={activeTab === "presale"}
                        onClick={() => setActiveTab("presale")}
                    />

                    <SidebarItem
                        icon={<Award />}
                        label="B-Ranks"
                        active={activeTab === "vranks"}
                        onClick={() => setActiveTab("vranks")}
                    />
                    <SidebarItem
                        icon={<Activity />}
                        label="Staking Cycles"
                        active={activeTab === "cycles"}
                        onClick={() => setActiveTab("cycles")}
                    />
                    <SidebarItem
                        icon={<Users />}
                        label="Users"
                        active={activeTab === "users"}
                        onClick={() => setActiveTab("users")}
                    />
                    <SidebarItem
                        icon={<Wallet />}
                        label="Withdrawals"
                        active={activeTab === "withdrawals"}
                        onClick={() => setActiveTab("withdrawals")}
                    />
                    <SidebarItem
                        icon={<Settings />}
                        label="System"
                        active={activeTab === "system"}
                        onClick={() => setActiveTab("system")}
                    />
                    <SidebarItem
                        icon={<Shield />}
                        label="Blockchain"
                        active={activeTab === "blockchain"}
                        onClick={() => setActiveTab("blockchain")}
                    />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Log Out</span>
                    </button>
                </div>
            </aside >

            {/* Main Content */}
            < main className="flex-1 overflow-y-auto h-screen relative" >
                <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-semibold capitalize">
                            {activeTab === "vranks" ? "B-Ranks" : activeTab}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportData}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-2 text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export Data
                        </button>
                    </div>
                </header>

                <div className="p-6 lg:p-8 max-w-7xl mx-auto">
                    {/* DASHBOARD TAB */}
                    {activeTab === "dashboard" && (
                        <DashboardTab
                            systemOverview={systemOverview}
                            rankDistribution={rankDistribution}
                            stakingAnalytics={stakingAnalytics}
                            commissionBreakdown={commissionBreakdown}
                        />
                    )}

                    {/* REPORTS TAB */}
                    {activeTab === "reports" && (
                        <UnifiedReports
                            revenueTrends={revenueTrends}
                            userGrowth={userGrowth}
                            topPerformers={topPerformers}
                            recentActivities={recentActivities}
                            allUsers={allUsers}
                            selectedUserId={selectedUserId}
                            onUserSelect={setSelectedUserId}
                            blsConfig={blsConfig}
                        />
                    )}

                    {/* PRESALE TAB */}
                    {activeTab === "presale" && (
                        <AdminPresalePanel />
                    )}

                    {/* B-RANKS TAB */}
                    {activeTab === "vranks" && (
                        <BRanksTab
                            rankRules={rankRules}
                            createVRank={createVRank}
                            updateVRank={updateVRank}
                            deleteVRank={deleteVRank}
                            toast={toast}
                            setConfirmModal={setConfirmModal}
                        />
                    )}

                    {/* STAKING CYCLES TAB */}
                    {activeTab === "cycles" && (
                        <StakingCyclesTab
                            stakingCycles={stakingCycles}
                            createStakingCycle={createStakingCycle}
                            updateStakingCycle={updateStakingCycle}
                            deleteStakingCycle={deleteStakingCycle}
                            toast={toast}
                            setConfirmModal={setConfirmModal}
                            pauseStates={pauseStates}
                            toggleStakingPause={toggleStakingPause}
                            toggleWithdrawalsPause={toggleWithdrawalsPause}
                            toggleReferralBonuses={toggleReferralBonuses}
                        />
                    )}

                    {/* USERS TAB */}
                    {activeTab === "users" && (
                        <UsersTab allUsers={allUsers} />
                    )}

                    {/* WITHDRAWALS TAB */}
                    {activeTab === "withdrawals" && (
                        <WithdrawalsTab
                            pendingWithdrawals={pendingWithdrawals}
                            handleApproveWithdrawal={handleApproveWithdrawal}
                            handleRejectWithdrawal={handleRejectWithdrawal}
                        />
                    )}

                    {/* SYSTEM TAB */}
                    {activeTab === "system" && (
                        <SystemTab
                            recalculateAllRanks={recalculateAllRanks}
                            cronLogs={cronLogs}
                            toast={toast}
                            setConfirmModal={setConfirmModal}
                            toggleBLSSystem={toggleBLSSystem}
                            updateBLSConfig={updateBLSConfig}
                        />
                    )}

                    {/* BLOCKCHAIN TAB */}
                    {activeTab === "blockchain" && (
                        <BlockchainTab />
                    )}
                </div>
            </main >
            <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                type={confirmModal.type}
            />
        </div >
    );
}

// ==================== TAB COMPONENTS ====================

function DashboardTab({ systemOverview, rankDistribution, stakingAnalytics, commissionBreakdown, blsConfig }: any) {
    return (
        <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Users"
                    value={systemOverview?.users.total.toString() || "0"}
                    change={`${systemOverview?.users.withActiveStakes || 0} active`}
                    icon={<Users className="text-purple-400" />}
                    color="border-purple-500"
                />
                <StatsCard
                    title="Active Stakes"
                    value={systemOverview?.stakes.active.toString() || "0"}
                    change={`$${(systemOverview?.stakes.activeVolume || 0).toLocaleString()}`}
                    icon={<Activity className="text-blue-400" />}
                    color="border-blue-500"
                />
                <StatsCard
                    title="Total Volume"
                    value={`$${(systemOverview?.stakes.activeVolume || 0).toLocaleString()}`}
                    change={`${systemOverview?.stakes.total || 0} total stakes`}
                    icon={<TrendingUp className="text-pink-400" />}
                    color="border-pink-500"
                />
                <StatsCard
                    title="Pending Withdrawals"
                    value={systemOverview?.financial.pendingWithdrawals.toString() || "0"}
                    change={`$${(systemOverview?.financial.pendingWithdrawalAmount || 0).toLocaleString()}`}
                    icon={<Wallet className="text-emerald-400" />}
                    color="border-emerald-500"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Rank Distribution */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-4">Rank Distribution</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={rankDistribution || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {(rankDistribution || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                                <Legend verticalAlign="bottom" height={36} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Commission Breakdown */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-4">Commission Breakdown</h3>
                    <div className="space-y-4">
                        <CommissionBar
                            label="Direct (L1)"
                            amount={commissionBreakdown?.breakdown.direct || 0}
                            percentage={commissionBreakdown?.percentages.direct || "0"}
                            color="bg-purple-500"
                            blsAmount={commissionBreakdown?.blsBreakdown?.direct}
                            isBLSEnabled={commissionBreakdown?.isBLSEnabled}
                        />
                        <CommissionBar
                            label="Indirect (L2)"
                            amount={commissionBreakdown?.breakdown.indirect || 0}
                            percentage={commissionBreakdown?.percentages.indirect || "0"}
                            color="bg-blue-500"
                            blsAmount={commissionBreakdown?.blsBreakdown?.indirect}
                            isBLSEnabled={commissionBreakdown?.isBLSEnabled}
                        />
                        <CommissionBar
                            label="B-Rank Bonus"
                            amount={commissionBreakdown?.breakdown.vrank || 0}
                            percentage={commissionBreakdown?.percentages.vrank || "0"}
                            color="bg-pink-500"
                            blsAmount={commissionBreakdown?.blsBreakdown?.vrank}
                            isBLSEnabled={commissionBreakdown?.isBLSEnabled}
                        />
                        <CommissionBar
                            label="Binary"
                            amount={commissionBreakdown?.breakdown.binary || 0}
                            percentage={commissionBreakdown?.percentages.binary || "0"}
                            color="bg-emerald-500"
                            blsAmount={commissionBreakdown?.blsBreakdown?.binary}
                            isBLSEnabled={commissionBreakdown?.isBLSEnabled}
                        />
                        <div className="pt-4 border-t border-slate-700">
                            <div className="flex justify-between items-center">
                                <span className="font-bold">Total Commissions</span>
                                <div className="text-xl font-bold text-purple-400">
                                    <span>${(commissionBreakdown?.total || 0).toLocaleString()}</span>
                                    {commissionBreakdown?.isBLSEnabled && commissionBreakdown?.blsTotal && (
                                        <>
                                            <span className="text-slate-400 mx-1">/</span>
                                            <span className="text-purple-400">{commissionBreakdown.blsTotal.toFixed(2)} BLS</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Staking Analytics */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold mb-4">Staking by Cycle</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stakingAnalytics || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="cycle" stroke="#94a3b8" axisLine={false} tickLine={false} />
                            <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                            <Bar dataKey="volume" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function BRanksTab({ rankRules, createVRank, updateVRank, deleteVRank, toast, setConfirmModal }: any) {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [formData, setFormData] = useState({
        rank: "",
        minTeamVolume: 0,
        minDirectReferrals: 5,
        requiredRankDirects: { count: 0, rank: "" },
        commissionRate: 0,
        cappingMultiplier: 2, // Default 2x multiplier
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) {
                await updateVRank(formData);
                toast.success("B-Rank updated successfully!");
            } else {
                await createVRank(formData);
                toast.success("B-Rank created successfully!");
            }
            setShowForm(false);
            setEditing(null);
            setFormData({
                rank: "",
                minTeamVolume: 0,
                minDirectReferrals: 5,
                requiredRankDirects: { count: 0, rank: "" },
                commissionRate: 0,
                cappingMultiplier: 2,
            });
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleEdit = (rank: any) => {
        setEditing(rank);
        setFormData(rank);
        setShowForm(true);
    };

    const handleDelete = async (rank: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete B-Rank",
            message: `Are you sure you want to delete rank ${rank}? This action cannot be undone.`,
            type: "danger",
            onConfirm: async () => {
                try {
                    await deleteVRank({ rank });
                    toast.success("B-Rank deleted successfully!");
                } catch (error: any) {
                    toast.error(error.message);
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">B-Rank Management</h2>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setEditing(null);
                        setFormData({
                            rank: "",
                            minTeamVolume: 0,
                            minDirectReferrals: 5,
                            requiredRankDirects: { count: 0, rank: "" },
                            commissionRate: 0,
                            cappingMultiplier: 2,
                        });
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create New Rank
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-4">{editing ? "Edit" : "Create"} B-Rank</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Rank Name</label>
                                <input
                                    type="text"
                                    value={formData.rank}
                                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                                    className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700"
                                    placeholder="B10"
                                    required
                                    disabled={!!editing}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Min Team Volume ($)</label>
                                <input
                                    type="number"
                                    value={formData.minTeamVolume || ""}
                                    onChange={(e) => setFormData({ ...formData, minTeamVolume: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Min Direct Referrals</label>
                                <input
                                    type="number"
                                    value={formData.minDirectReferrals || ""}
                                    onChange={(e) => setFormData({ ...formData, minDirectReferrals: parseInt(e.target.value) || 0 })}
                                    className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Commission Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.commissionRate || ""}
                                    onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Required Rank</label>
                                <input
                                    type="text"
                                    value={formData.requiredRankDirects.rank}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        requiredRankDirects: { ...formData.requiredRankDirects, rank: e.target.value }
                                    })}
                                    className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700"
                                    placeholder="B1 (leave empty for B1)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Required Count</label>
                                <input
                                    type="number"
                                    value={formData.requiredRankDirects.count || ""}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        requiredRankDirects: { ...formData.requiredRankDirects, count: parseInt(e.target.value) || 0 }
                                    })}
                                    className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Capping Multiplier (x)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.cappingMultiplier || ""}
                                    onChange={(e) => setFormData({ ...formData, cappingMultiplier: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700"
                                    placeholder="2 (for 2x of active stake)"
                                    required
                                />
                                <p className="text-xs text-slate-400 mt-1">Max bonus = Active Stake × Multiplier</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold"
                            >
                                {editing ? "Update" : "Create"} Rank
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-900 border-b border-slate-800">
                        <tr>
                            <th className="p-4 text-left font-medium text-slate-400">Rank</th>
                            <th className="p-4 text-left font-medium text-slate-400">Min Volume</th>
                            <th className="p-4 text-left font-medium text-slate-400">Min Directs</th>
                            <th className="p-4 text-left font-medium text-slate-400">Structure</th>
                            <th className="p-4 text-left font-medium text-slate-400">Commission</th>
                            <th className="p-4 text-left font-medium text-slate-400">Cap Multiplier</th>
                            <th className="p-4 text-left font-medium text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(rankRules || []).map((rank: any) => (
                            <tr key={rank.rank} className="border-b border-slate-800 hover:bg-slate-800/50">
                                <td className="p-4 font-bold text-purple-400">{rank.rank}</td>
                                <td className="p-4">${rank.minTeamVolume.toLocaleString()}</td>
                                <td className="p-4">{rank.minDirectReferrals}</td>
                                <td className="p-4">
                                    {rank.requiredRankDirects.count > 0
                                        ? `${rank.requiredRankDirects.count} × ${rank.requiredRankDirects.rank}`
                                        : "-"}
                                </td>
                                <td className="p-4">{rank.commissionRate}%</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm">
                                        {rank.cappingMultiplier || 0}x
                                    </span>
                                </td>
                                <td className="p-4 flex gap-2">
                                    <button
                                        onClick={() => handleEdit(rank)}
                                        className="p-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(rank.rank)}
                                        className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StakingCyclesTab({ stakingCycles, createStakingCycle, updateStakingCycle, deleteStakingCycle, toast, setConfirmModal, pauseStates, toggleStakingPause, toggleWithdrawalsPause, toggleReferralBonuses }: any) {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [formData, setFormData] = useState({
        days: 0,
        dailyRate: 0,
    });
    const [isTogglingStaking, setIsTogglingStaking] = useState(false);
    const [isTogglingWithdrawals, setIsTogglingWithdrawals] = useState(false);
    const [isTogglingReferralBonuses, setIsTogglingReferralBonuses] = useState(false);

    const handleToggleStaking = async () => {
        setConfirmModal({
            isOpen: true,
            title: `${pauseStates?.stakingPaused ? 'Resume' : 'Pause'} Staking`,
            message: `Are you sure you want to ${pauseStates?.stakingPaused ? 'resume' : 'pause'} all staking operations? All users will be notified.`,
            type: pauseStates?.stakingPaused ? 'info' : 'warning',
            onConfirm: async () => {
                setIsTogglingStaking(true);
                try {
                    await toggleStakingPause();
                    toast.success(`Staking ${pauseStates?.stakingPaused ? 'resumed' : 'paused'} successfully!`);
                } catch (error: any) {
                    toast.error(error.message || 'Failed to toggle staking');
                } finally {
                    setIsTogglingStaking(false);
                }
            }
        });
    };

    const handleToggleWithdrawals = async () => {
        setConfirmModal({
            isOpen: true,
            title: `${pauseStates?.withdrawalsPaused ? 'Resume' : 'Pause'} Withdrawals`,
            message: `Are you sure you want to ${pauseStates?.withdrawalsPaused ? 'resume' : 'pause'} all withdrawal operations? All users will be notified.`,
            type: pauseStates?.withdrawalsPaused ? 'info' : 'warning',
            onConfirm: async () => {
                setIsTogglingWithdrawals(true);
                try {
                    await toggleWithdrawalsPause();
                    toast.success(`Withdrawals ${pauseStates?.withdrawalsPaused ? 'resumed' : 'paused'} successfully!`);
                } catch (error: any) {
                    toast.error(error.message || 'Failed to toggle withdrawals');
                } finally {
                    setIsTogglingWithdrawals(false);
                }
            }
        });
    };

    const handleToggleReferralBonuses = async () => {
        setConfirmModal({
            isOpen: true,
            title: `${pauseStates?.referralBonusesEnabled ? 'Disable' : 'Enable'} Referral Bonuses`,
            message: `Are you sure you want to ${pauseStates?.referralBonusesEnabled ? 'disable' : 'enable'} L1 and L2 referral bonuses? All users will be notified.`,
            type: pauseStates?.referralBonusesEnabled ? 'warning' : 'info',
            onConfirm: async () => {
                setIsTogglingReferralBonuses(true);
                try {
                    await toggleReferralBonuses();
                    toast.success(`Referral bonuses ${pauseStates?.referralBonusesEnabled ? 'disabled' : 'enabled'} successfully!`);
                } catch (error: any) {
                    toast.error(error.message || 'Failed to toggle referral bonuses');
                } finally {
                    setIsTogglingReferralBonuses(false);
                }
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) {
                await updateStakingCycle(formData);
                toast.success("Staking cycle updated successfully!");
            } else {
                await createStakingCycle(formData);
                toast.success("Staking cycle created successfully!");
            }
            setShowForm(false);
            setEditing(null);
            setFormData({ days: 0, dailyRate: 0 });
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleEdit = (cycle: any) => {
        setEditing(cycle);
        setFormData(cycle);
        setShowForm(true);
    };

    const handleDelete = async (days: number) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Staking Cycle",
            message: `Are you sure you want to delete the ${days} days cycle? This action cannot be undone.`,
            type: "danger",
            onConfirm: async () => {
                try {
                    await deleteStakingCycle({ days });
                    toast.success("Staking cycle deleted successfully!");
                } catch (error: any) {
                    toast.error(error.message);
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* System Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Staking Control */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold">Staking System</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Status: <span className={`font-bold ${pauseStates?.stakingPaused ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {pauseStates?.stakingPaused ? 'PAUSED' : 'ACTIVE'}
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={handleToggleStaking}
                            disabled={isTogglingStaking}
                            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${pauseStates?.stakingPaused
                                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                } ${isTogglingStaking ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {pauseStates?.stakingPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            {pauseStates?.stakingPaused ? 'Resume Staking' : 'Pause Staking'}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">
                        {pauseStates?.stakingPaused
                            ? 'Users cannot create new stakes. Existing stakes continue earning.'
                            : 'Users can create new stakes normally.'}
                    </p>
                </div>

                {/* Withdrawals Control */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold">Withdrawal System</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Status: <span className={`font-bold ${pauseStates?.withdrawalsPaused ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {pauseStates?.withdrawalsPaused ? 'PAUSED' : 'ACTIVE'}
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={handleToggleWithdrawals}
                            disabled={isTogglingWithdrawals}
                            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${pauseStates?.withdrawalsPaused
                                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                } ${isTogglingWithdrawals ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {pauseStates?.withdrawalsPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            {pauseStates?.withdrawalsPaused ? 'Resume Withdrawals' : 'Pause Withdrawals'}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">
                        {pauseStates?.withdrawalsPaused
                            ? 'Users cannot request new withdrawals. Pending withdrawals can still be processed.'
                            : 'Users can request withdrawals normally.'}
                    </p>
                </div>

                {/* Referral Bonuses Control */}
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold">Referral Bonuses</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Status: <span className={`font-bold ${pauseStates?.referralBonusesEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {pauseStates?.referralBonusesEnabled ? 'ENABLED' : 'DISABLED'}
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={handleToggleReferralBonuses}
                            disabled={isTogglingReferralBonuses}
                            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${pauseStates?.referralBonusesEnabled
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                } ${isTogglingReferralBonuses ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {pauseStates?.referralBonusesEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {pauseStates?.referralBonusesEnabled ? 'Disable Bonuses' : 'Enable Bonuses'}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">
                        {pauseStates?.referralBonusesEnabled
                            ? 'L1 (15%) and L2 (10%) referral bonuses are active. Unilevel commissions also available.'
                            : 'L1 and L2 referral bonuses are disabled. Only Unilevel commissions are active.'}
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Staking Cycles Management</h2>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setEditing(null);
                        setFormData({ days: 0, dailyRate: 0 });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create New Cycle
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-4">{editing ? "Edit" : "Create"} Staking Cycle</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Duration (Days)</label>
                                <input
                                    type="number"
                                    value={formData.days || ""}
                                    onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 0 })}
                                    className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700"
                                    required
                                    disabled={!!editing}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Daily Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.dailyRate || ""}
                                    onChange={(e) => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold"
                            >
                                {editing ? "Update" : "Create"} Cycle
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(stakingCycles || []).map((cycle: any) => (
                    <div key={cycle.days} className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-3xl font-bold text-purple-400">{cycle.days}</div>
                                <div className="text-slate-400 text-sm">Days</div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(cycle)}
                                    className="p-2 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(cycle.days)}
                                    className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="text-2xl font-bold mb-1">{cycle.dailyRate}%</div>
                        <div className="text-slate-400 text-sm">Daily Rate</div>
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <div className="text-sm text-slate-400">Total Return</div>
                            <div className="text-lg font-bold text-emerald-400">
                                {(cycle.days * cycle.dailyRate).toFixed(2)}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function UsersTab({ allUsers }: any) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredUsers = (allUsers || []).filter((user: any) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">User Management</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-slate-800 rounded-lg border border-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900 border-b border-slate-800">
                        <tr>
                            <th className="p-4 font-medium text-slate-400">User</th>
                            <th className="p-4 font-medium text-slate-400">Email</th>
                            <th className="p-4 font-medium text-slate-400">Rank</th>
                            <th className="p-4 font-medium text-slate-400">Team Volume</th>
                            <th className="p-4 font-medium text-slate-400">Directs</th>
                            <th className="p-4 font-medium text-slate-400">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user: any) => (
                            <tr key={user._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                <td className="p-4 font-medium">{user.name}</td>
                                <td className="p-4 text-slate-400">{user.email}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                                        {user.currentRank}
                                    </span>
                                </td>
                                <td className="p-4">${(user.teamVolume || 0).toLocaleString()}</td>
                                <td className="p-4">{user.directReferralsCount || 0}</td>
                                <td className="p-4 font-bold text-emerald-400">${(user.walletBalance || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function WithdrawalsTab({ pendingWithdrawals, handleApproveWithdrawal, handleRejectWithdrawal }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Pending Withdrawals</h2>
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                {(!pendingWithdrawals || pendingWithdrawals.length === 0) ? (
                    <div className="p-8 text-center text-slate-500">No pending withdrawals</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 border-b border-slate-800">
                            <tr>
                                <th className="p-4 font-medium text-slate-400">User</th>
                                <th className="p-4 font-medium text-slate-400">Amount</th>
                                <th className="p-4 font-medium text-slate-400">Address</th>
                                <th className="p-4 font-medium text-slate-400">Date</th>
                                <th className="p-4 font-medium text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingWithdrawals.map((w: any) => (
                                <tr key={w._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                    <td className="p-4">
                                        <div className="font-medium">{w.userName}</div>
                                        <div className="text-xs text-slate-500">{w.userEmail}</div>
                                    </td>
                                    <td className="p-4 font-bold text-white">${w.amount}</td>
                                    <td className="p-4 font-mono text-xs text-slate-400">{w.address}</td>
                                    <td className="p-4 text-sm text-slate-500">{new Date(w.requestDate).toLocaleDateString()}</td>
                                    <td className="p-4 flex gap-2">
                                        <button
                                            onClick={() => handleApproveWithdrawal(w._id)}
                                            className="p-2 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"
                                            title="Approve"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleRejectWithdrawal(w._id)}
                                            className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                                            title="Reject"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function SystemTab({ recalculateAllRanks, cronLogs, toast, setConfirmModal, toggleBLSSystem, updateBLSConfig }: any) {
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [timeUntilDistribution, setTimeUntilDistribution] = useState("");
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [isEditingBLS, setIsEditingBLS] = useState(false);

    // Fetch system configs
    const systemConfigs = useQuery(api.configs.getAllConfigs);
    const setConfig = useMutation(api.configs.setConfig);

    // BLS System
    const blsConfig = useQuery(api.bls.getBLSConfig);
    const blsStats = useQuery(api.bls.getBLSStats);

    const [blsSettings, setBlsSettings] = useState({
        conversionRate: 1.0,
        minSwapAmount: 1.0,
    });

    const [platformSettings, setPlatformSettings] = useState({
        platformName: "BellAi",
        maintenanceMode: false,
        minWithdrawal: 50,
        maxWithdrawal: 10000,
        withdrawalFee: 0,
    });

    // Populate state from configs when loaded
    useEffect(() => {
        if (systemConfigs) {
            const configMap = systemConfigs.reduce((acc: any, curr: any) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {});

            setPlatformSettings(prev => ({
                ...prev,
                platformName: configMap.platform_name ?? prev.platformName,
                maintenanceMode: configMap.maintenance_mode ?? prev.maintenanceMode,
                minWithdrawal: configMap.min_withdrawal_amount ?? prev.minWithdrawal,
                maxWithdrawal: configMap.max_withdrawal_amount ?? prev.maxWithdrawal,
                withdrawalFee: configMap.withdrawal_fee_percentage ?? prev.withdrawalFee,
            }));
        }
    }, [systemConfigs]);

    // Populate BLS settings when loaded
    useEffect(() => {
        if (blsConfig) {
            setBlsSettings({
                conversionRate: blsConfig.conversionRate || 1.0,
                minSwapAmount: blsConfig.minSwapAmount || 1.0,
            });
        }
    }, [blsConfig]);

    // Countdown timer to next midnight UTC
    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const midnight = new Date();
            midnight.setUTCHours(24, 0, 0, 0);

            const diff = midnight.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeUntilDistribution(`${hours}h ${minutes}m ${seconds}s`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleRecalculate = async () => {
        setConfirmModal({
            isOpen: true,
            title: "Recalculate All Ranks",
            message: "Are you sure you want to recalculate all ranks? This may take a while.",
            type: "warning",
            onConfirm: async () => {
                setIsRecalculating(true);
                try {
                    await recalculateAllRanks();
                    toast.success("Ranks recalculation started.");
                } catch (e: any) {
                    toast.error("Failed to recalculate ranks.");
                } finally {
                    setIsRecalculating(false);
                }
            }
        });
    };

    const handleSaveSettings = () => {
        setConfirmModal({
            isOpen: true,
            title: "Save Platform Settings",
            message: "Are you sure you want to save these platform settings?",
            type: "info",
            onConfirm: async () => {
                try {
                    await Promise.all([
                        setConfig({ key: "platform_name", value: platformSettings.platformName }),
                        setConfig({ key: "maintenance_mode", value: platformSettings.maintenanceMode }),
                        setConfig({ key: "min_withdrawal_amount", value: platformSettings.minWithdrawal }),
                        setConfig({ key: "max_withdrawal_amount", value: platformSettings.maxWithdrawal }),
                        setConfig({ key: "withdrawal_fee_percentage", value: platformSettings.withdrawalFee }),
                    ]);
                    toast.success("Platform settings saved successfully!");
                    setIsEditingSettings(false);
                } catch (error) {
                    toast.error("Failed to save settings");
                    console.error(error);
                }
            }
        });
    };

    const handleResetSettings = () => {
        setConfirmModal({
            isOpen: true,
            title: "Reset Platform Settings",
            message: "Are you sure you want to reset all settings to default values?",
            type: "warning",
            onConfirm: async () => {
                const defaults = {
                    platformName: "BellAi",
                    maintenanceMode: false,
                    minWithdrawal: 50,
                    maxWithdrawal: 10000,
                    withdrawalFee: 0,
                };

                setPlatformSettings(defaults);

                try {
                    await Promise.all([
                        setConfig({ key: "platform_name", value: defaults.platformName }),
                        setConfig({ key: "maintenance_mode", value: defaults.maintenanceMode }),
                        setConfig({ key: "min_withdrawal_amount", value: defaults.minWithdrawal }),
                        setConfig({ key: "max_withdrawal_amount", value: defaults.maxWithdrawal }),
                        setConfig({ key: "withdrawal_fee_percentage", value: defaults.withdrawalFee }),
                    ]);
                    toast.success("Settings reset to defaults!");
                    setIsEditingSettings(false);
                } catch (error) {
                    toast.error("Failed to reset settings");
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">System Management</h2>
            </div>

            {/* Countdown Timer */}
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold mb-1">Next Reward Distribution</h3>
                        <p className="text-sm text-slate-400">Daily rewards are distributed at midnight UTC</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {timeUntilDistribution}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Time Remaining</div>
                    </div>
                </div>
            </div>

            {/* Platform Settings */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Platform Settings</h3>
                    <div className="flex gap-2">
                        {isEditingSettings ? (
                            <>
                                <button
                                    onClick={handleSaveSettings}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-sm"
                                >
                                    <Save className="w-4 h-4" />
                                    Save
                                </button>
                                <button
                                    onClick={handleResetSettings}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Reset
                                </button>
                                <button
                                    onClick={() => setIsEditingSettings(false)}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditingSettings(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold text-sm"
                            >
                                <Edit className="w-4 h-4" />
                                Edit Settings
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Platform Name</label>
                        <input
                            type="text"
                            value={platformSettings.platformName}
                            onChange={(e) => setPlatformSettings({ ...platformSettings, platformName: e.target.value })}
                            disabled={!isEditingSettings}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Maintenance Mode</label>
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg">
                            <input
                                type="checkbox"
                                checked={platformSettings.maintenanceMode}
                                onChange={(e) => setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })}
                                disabled={!isEditingSettings}
                                className="w-5 h-5 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-white">{platformSettings.maintenanceMode ? "Enabled" : "Disabled"}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Min Withdrawal ($)</label>
                        <input
                            type="number"
                            value={platformSettings.minWithdrawal}
                            onChange={(e) => setPlatformSettings({ ...platformSettings, minWithdrawal: parseFloat(e.target.value) })}
                            disabled={!isEditingSettings}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Max Withdrawal ($)</label>
                        <input
                            type="number"
                            value={platformSettings.maxWithdrawal}
                            onChange={(e) => setPlatformSettings({ ...platformSettings, maxWithdrawal: parseFloat(e.target.value) })}
                            disabled={!isEditingSettings}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Withdrawal Fee (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={platformSettings.withdrawalFee}
                            onChange={(e) => setPlatformSettings({ ...platformSettings, withdrawalFee: parseFloat(e.target.value) })}
                            disabled={!isEditingSettings}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>
            </div>

            {/* BLS System Control */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Coins className="w-5 h-5 text-purple-400" />
                            BellCoin Stable (BLS) System
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Control the internal stable unit system for rewards
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${blsConfig?.isEnabled
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-700 text-slate-400"
                            }`}>
                            {blsConfig?.isEnabled ? "ENABLED" : "DISABLED"}
                        </span>
                        <button
                            onClick={() => {
                                setConfirmModal({
                                    isOpen: true,
                                    title: blsConfig?.isEnabled ? "Disable BLS System" : "Enable BLS System",
                                    message: blsConfig?.isEnabled
                                        ? "Are you sure you want to disable the BLS system? Future rewards will be paid directly in USDT."
                                        : "Are you sure you want to enable the BLS system? Future rewards will be paid in BLS instead of USDT.",
                                    type: "warning",
                                    onConfirm: async () => {
                                        try {
                                            await toggleBLSSystem();
                                            toast.success(`BLS system ${blsConfig?.isEnabled ? "disabled" : "enabled"} successfully!`);
                                        } catch (error: any) {
                                            toast.error(error.message || "Failed to toggle BLS system");
                                        }
                                    }
                                });
                            }}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${blsConfig?.isEnabled
                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                }`}
                        >
                            {blsConfig?.isEnabled ? "Disable" : "Enable"}
                        </button>
                    </div>
                </div>

                {blsConfig?.isEnabled && (
                    <>
                        {/* BLS Statistics */}
                        {blsStats && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                    <div className="text-xs text-slate-400 mb-1">Total BLS Issued</div>
                                    <div className="text-xl font-bold text-purple-400">
                                        {blsStats.totalBLSIssued.toFixed(2)} BLS
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                    <div className="text-xs text-slate-400 mb-1">Users with BLS</div>
                                    <div className="text-xl font-bold text-blue-400">
                                        {blsStats.usersWithBLS}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                    <div className="text-xs text-slate-400 mb-1">Total Swaps</div>
                                    <div className="text-xl font-bold text-emerald-400">
                                        {blsStats.totalSwaps}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                    <div className="text-xs text-slate-400 mb-1">USDT Credited</div>
                                    <div className="text-xl font-bold text-pink-400">
                                        ${blsStats.totalUSDTCredited.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BLS Configuration */}
                        <div className="border-t border-slate-800 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-slate-300">Configuration</h4>
                                <div className="flex gap-2">
                                    {isEditingBLS ? (
                                        <>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await updateBLSConfig({
                                                            conversionRate: blsSettings.conversionRate,
                                                            minSwapAmount: blsSettings.minSwapAmount,
                                                        });
                                                        toast.success("BLS configuration updated!");
                                                        setIsEditingBLS(false);
                                                    } catch (error: any) {
                                                        toast.error(error.message || "Failed to update BLS config");
                                                    }
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-sm"
                                            >
                                                <Save className="w-4 h-4" />
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBlsSettings({
                                                        conversionRate: blsConfig?.conversionRate || 1.0,
                                                        minSwapAmount: blsConfig?.minSwapAmount || 1.0,
                                                    });
                                                    setIsEditingBLS(false);
                                                }}
                                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditingBLS(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold text-sm"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit Config
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Conversion Rate (BLS to USDT)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={blsSettings.conversionRate}
                                        onChange={(e) => setBlsSettings({ ...blsSettings, conversionRate: parseFloat(e.target.value) })}
                                        disabled={!isEditingBLS}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">1 BLS = {blsSettings.conversionRate} USDT</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        Minimum Swap Amount (BLS)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={blsSettings.minSwapAmount}
                                        onChange={(e) => setBlsSettings({ ...blsSettings, minSwapAmount: parseFloat(e.target.value) })}
                                        disabled={!isEditingBLS}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Minimum amount users can swap</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Maintenance Section */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold mb-4">Maintenance</h3>
                <button
                    onClick={handleRecalculate}
                    disabled={isRecalculating}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isRecalculating ? "animate-spin" : ""}`} />
                    Recalculate All Ranks
                </button>
            </div>

            {/* Cron Logs */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-lg font-bold">Cron Job Logs</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-900 border-b border-slate-800">
                        <tr>
                            <th className="p-4 font-medium text-slate-400">Job</th>
                            <th className="p-4 font-medium text-slate-400">Status</th>
                            <th className="p-4 font-medium text-slate-400">Time</th>
                            <th className="p-4 font-medium text-slate-400">Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(cronLogs || []).map((log: any) => (
                            <tr key={log._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                <td className="p-4">{log.jobName}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs ${log.status === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                        }`}>
                                        {log.status}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="p-4 text-sm text-slate-400">{log.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function BlockchainTab() {
    const dummyUserId = "admin" as Id<"users">;
    const [selectedNetwork, setSelectedNetwork] = useState<string>("polygon");
    const [activeSection, setActiveSection] = useState<"overview" | "events" | "metrics" | "controls">("overview");

    const networks = useQuery(api.networkManagement.getAllNetworks, {});
    const selectedNetworkDoc = networks?.find((n: any) => n.network === selectedNetwork);

    return (
        <div className="space-y-6">
            {/* Network Status Dashboard */}
            <div className="bg-slate-100 rounded-2xl border border-slate-200 p-6 text-slate-900">
                <NetworkStatusDashboard userId={dummyUserId} isAdmin={true} />
            </div>

            {/* Network Selector */}
            {networks && networks.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Select Network
                    </label>
                    <div className="flex gap-2 flex-wrap">
                        {networks
                            .filter((n: any) => n.isActive && n.contractAddress)
                            .map((network: any) => (
                                <button
                                    key={network.network}
                                    onClick={() => setSelectedNetwork(network.network)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedNetwork === network.network
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                >
                                    {network.name}
                                </button>
                            ))}
                    </div>
                </div>
            )}

            {/* Section Tabs */}
            {selectedNetworkDoc && selectedNetworkDoc.isActive && selectedNetworkDoc.contractAddress && (
                <>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
                        <div className="flex gap-2">
                            {[
                                { id: "overview", label: "Contract Overview" },
                                { id: "events", label: "Live Events" },
                                { id: "metrics", label: "Token Metrics" },
                                { id: "controls", label: "Admin Controls" },
                            ].map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id as any)}
                                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${activeSection === section.id
                                            ? "bg-blue-600 text-white"
                                            : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    {section.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-6">
                        {activeSection === "overview" && (
                            <ContractOverview network={selectedNetwork} />
                        )}
                        {activeSection === "events" && (
                            <BlockchainEventsFeed network={selectedNetwork} />
                        )}
                        {activeSection === "metrics" && (
                            <TokenMetrics network={selectedNetwork} />
                        )}
                        {activeSection === "controls" && selectedNetworkDoc && (
                            <BlockchainAdminControls
                                network={selectedNetwork}
                                contractAddress={selectedNetworkDoc.contractAddress}
                                decimals={selectedNetworkDoc.decimals}
                                blockExplorer={selectedNetworkDoc.blockExplorer}
                            />
                        )}
                    </div>
                </>
            )}

            {(!selectedNetworkDoc || !selectedNetworkDoc.isActive || !selectedNetworkDoc.contractAddress) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                    <p className="text-gray-500">
                        {!selectedNetworkDoc
                            ? "No network selected"
                            : !selectedNetworkDoc.isActive
                                ? "Network is not active"
                                : "Contract not deployed"}
                    </p>
                </div>
            )}
        </div>
    );
}

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
        >
            <div className={`${active ? "text-white" : "text-slate-500 group-hover:text-white"}`}>
                {icon}
            </div>
            <span className="font-medium">{label}</span>
        </button>
    );
}

function StatsCard({ title, value, change, icon, color }: { title: string, value: string, change: string, icon: any, color: string }) {
    return (
        <div className={`p-6 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all`}>
            <div className={`absolute top-0 left-0 w-1 h-full ${color.replace('border', 'bg')}`}></div>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="text-slate-400 text-sm font-medium mb-1">{title}</div>
                    <div className="text-2xl font-bold text-white">{value}</div>
                </div>
                <div className="p-3 bg-slate-800 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
            </div>
            <div className="text-xs text-slate-500">{change}</div>
        </div>
    );
}

function CommissionBar({ label, amount, percentage, color, blsAmount, isBLSEnabled }: {
    label: string,
    amount: number,
    percentage: string,
    color: string,
    blsAmount?: number | null,
    isBLSEnabled?: boolean
}) {
    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">{label}</span>
                <div className="text-sm font-bold">
                    <span>${amount.toLocaleString()}</span>
                    {isBLSEnabled && blsAmount !== null && blsAmount !== undefined && (
                        <>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-purple-400">{blsAmount.toFixed(2)} BLS</span>
                        </>
                    )}
                </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
                <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
}
