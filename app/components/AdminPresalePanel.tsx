import { useState, useEffect } from "react";
import { useCachedQuery } from "../hooks/useCachedQuery";
import { useCachedMutation } from "../hooks/useCachedMutation";
import { api } from "../convex/_generated/api";
import {
    Shield, Users, DollarSign, Activity,
    Play, Pause, Lock, Unlock, RefreshCw,
    AlertTriangle, CheckCircle, XCircle
} from "lucide-react";
import { useToast } from "../hooks/useToast";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts";

export function AdminPresalePanel() {
    const toast = useToast();
    const stats = useCachedQuery(api.admin.getPresaleStats);

    const togglePresale = useCachedMutation(api.admin.togglePresale);
    const openStaking = useCachedMutation(api.admin.openStaking);
    const convertAllOrders = useCachedMutation(api.admin.convertAllOrders);
    const initialize = useCachedMutation(api.presale.initializeConfig);
    const updatePresaleConfig = useCachedMutation(api.presale.updatePresaleConfig);

    const [isToggling, setIsToggling] = useState(false);
    const [isOpeningStaking, setIsOpeningStaking] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const [isEditingSupply, setIsEditingSupply] = useState(false);
    const [supplyAmount, setSupplyAmount] = useState(0);

    // Initialization State
    const [initConfig, setInitConfig] = useState({
        totalNodes: 10000,
        pricePerNode: 50,
        perUserLimit: 100,
        vestingImmediate: 20,
        vestingMonthly: 80,
        vestingMonths: 10,
        stakingCycleDays: 360,
        stakingDailyRate: 1.0,
    });

    // Initialize supply amount when stats load - MUST be before any conditional returns
    useEffect(() => {
        if (stats?.config && supplyAmount === 0) {
            setSupplyAmount(stats.config.totalNodes);
        }
    }, [stats?.config, supplyAmount]);

    if (stats === undefined) return <div className="p-8 text-center text-slate-500">Loading presale stats...</div>;

    if (stats === null) {
        const handleInit = async () => {
            setIsInitializing(true);
            try {
                const now = Date.now();
                await initialize({
                    totalNodes: initConfig.totalNodes,
                    pricePerNode: initConfig.pricePerNode,
                    perUserLimit: initConfig.perUserLimit,
                    startDate: now,
                    endDate: now + (30 * 24 * 60 * 60 * 1000),
                    vestingSchedule: {
                        immediate: initConfig.vestingImmediate,
                        monthly: initConfig.vestingMonthly,
                        months: initConfig.vestingMonths,
                    },
                    stakingCycleDays: initConfig.stakingCycleDays,
                    stakingDailyRate: initConfig.stakingDailyRate,
                });
                toast.success("Presale initialized successfully!");
            } catch (err: any) {
                toast.error(err.message || "Initialization failed");
            } finally {
                setIsInitializing(false);
            }
        };

        return (
            <div className="max-w-2xl mx-auto p-8 bg-slate-900/50 rounded-2xl border border-slate-800">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Shield className="w-8 h-8 text-purple-400" />
                    Initialize Presale System
                </h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Total Nodes</label>
                            <input
                                type="number"
                                value={initConfig.totalNodes}
                                onChange={(e) => setInitConfig({ ...initConfig, totalNodes: Number(e.target.value) })}
                                className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Price (USDT)</label>
                            <input
                                type="number"
                                value={initConfig.pricePerNode}
                                onChange={(e) => setInitConfig({ ...initConfig, pricePerNode: Number(e.target.value) })}
                                className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">User Limit</label>
                            <input
                                type="number"
                                value={initConfig.perUserLimit}
                                onChange={(e) => setInitConfig({ ...initConfig, perUserLimit: Number(e.target.value) })}
                                className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 text-white"
                            />
                        </div>
                    </div>

                    <div className="h-px bg-slate-800 my-4"></div>
                    <h3 className="font-bold text-slate-300">Vesting Schedule</h3>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Immediate %</label>
                            <input
                                type="number"
                                value={initConfig.vestingImmediate}
                                onChange={(e) => setInitConfig({ ...initConfig, vestingImmediate: Number(e.target.value) })}
                                className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Monthly %</label>
                            <input
                                type="number"
                                value={initConfig.vestingMonthly}
                                onChange={(e) => setInitConfig({ ...initConfig, vestingMonthly: Number(e.target.value) })}
                                className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Months</label>
                            <input
                                type="number"
                                value={initConfig.vestingMonths}
                                onChange={(e) => setInitConfig({ ...initConfig, vestingMonths: Number(e.target.value) })}
                                className="w-full p-3 bg-slate-800 rounded-lg border border-slate-700 text-white"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleInit}
                        disabled={isInitializing}
                        className="w-full py-4 mt-6 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-white transition-all"
                    >
                        {isInitializing ? "Initializing..." : "Initialize Presale"}
                    </button>
                </div>
            </div>
        );
    }

    const { config, totalRevenue, soldNodes, totalNodes, uniqueBuyers, avgNodesPerUser, dailySales, recentOrders } = stats;

    const handleTogglePresale = async () => {
        if (!confirm(`Are you sure you want to ${config.isActive ? 'PAUSE' : 'ACTIVATE'} the presale?`)) return;

        setIsToggling(true);
        try {
            await togglePresale({});
            toast.success(`Presale ${config.isActive ? 'paused' : 'activated'} successfully`);
        } catch (err: any) {
            toast.error(err.message || "Action failed");
        } finally {
            setIsToggling(false);
        }
    };

    const handleOpenStaking = async () => {
        if (!confirm("WARNING: This will END the presale and START public staking. All confirmed orders will be converted to vested stakes. This action cannot be undone. Are you sure?")) return;

        setIsOpeningStaking(true);
        try {
            const result = await openStaking({});
            toast.success(`Staking opened! ${result.convertedCount} orders converted.`);
        } catch (err: any) {
            toast.error(err.message || "Action failed");
        } finally {
            setIsOpeningStaking(false);
        }
    };

    const handleConvertOrders = async () => {
        if (!confirm("⚠️ WARNING: This will convert ALL confirmed presale orders into 1-year staking positions immediately. Users will be notified and their stakes will appear in their dashboard. This action cannot be undone. Continue?")) return;

        setIsConverting(true);
        try {
            const result = await convertAllOrders({});
            toast.success(result.message || `Successfully converted ${result.convertedCount} orders to 1-year stakes for ${result.usersAffected} users!`);
        } catch (err: any) {
            toast.error(err.message || "Conversion failed");
        } finally {
            setIsConverting(false);
        }
    };

    const handleUpdateSupply = async () => {
        if (supplyAmount < soldNodes) {
            toast.error(`Cannot set supply to ${supplyAmount}. Already sold ${soldNodes} nodes.`);
            return;
        }

        setIsUpdatingConfig(true);
        try {
            await updatePresaleConfig({ totalNodes: supplyAmount });
            toast.success(`Node supply updated to ${supplyAmount.toLocaleString()}`);
            setIsEditingSupply(false);
        } catch (err: any) {
            toast.error(err.message || "Update failed");
        } finally {
            setIsUpdatingConfig(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Controls Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                            <Shield className="w-7 h-7 text-purple-400" />
                            Presale Administration
                        </h2>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div>
                                <span className="text-slate-400">Status: </span>
                                <span className={`font-bold ${config.isActive ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                    {config.isActive ? 'ACTIVE' : 'PAUSED'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400">Staking: </span>
                                <span className={`font-bold ${
                                    config.stakingOpen 
                                        ? 'text-emerald-400' 
                                        : (config.isActive ? 'text-red-400' : 'text-slate-400')
                                }`}>
                                    {config.stakingOpen 
                                        ? 'OPEN' 
                                        : (config.isActive ? 'PAUSED (Presale Active)' : 'CLOSED')}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400">Supply: </span>
                                <span className="font-bold text-white">
                                    {config.totalNodes.toLocaleString()} nodes
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleTogglePresale}
                            disabled={isToggling}
                            className={`px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all ${config.isActive
                                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                                }`}
                        >
                            {config.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {config.isActive ? 'Pause Presale' : 'Activate Presale'}
                        </button>

                        {!config.stakingOpen && (
                            <button
                                onClick={handleOpenStaking}
                                disabled={isOpeningStaking}
                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-2 transition-all border border-purple-500/30"
                            >
                                <Unlock className="w-4 h-4" />
                                {isOpeningStaking ? 'Opening...' : 'Open Staking'}
                            </button>
                        )}

                        <button
                            onClick={handleConvertOrders}
                            disabled={isConverting}
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Convert All Orders to 1-Year Stakes"
                        >
                            <RefreshCw className={`w-4 h-4 ${isConverting ? 'animate-spin' : ''}`} />
                            {isConverting ? 'Converting...' : 'Convert to Stakes'}
                        </button>
                    </div>
                </div>

                {/* Supply Management */}
                <div className="border-t border-slate-700/50 pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Node Supply Management</h3>
                            <p className="text-sm text-slate-400">Update the total number of nodes available for presale</p>
                        </div>
                        {!isEditingSupply ? (
                            <button
                                onClick={() => {
                                    setSupplyAmount(config.totalNodes);
                                    setIsEditingSupply(true);
                                }}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium flex items-center gap-2 transition-all"
                            >
                                <Activity className="w-4 h-4" />
                                Edit Supply
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={supplyAmount}
                                    onChange={(e) => setSupplyAmount(Number(e.target.value))}
                                    min={soldNodes}
                                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white w-32 focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Supply"
                                />
                                <button
                                    onClick={handleUpdateSupply}
                                    disabled={isUpdatingConfig || supplyAmount < soldNodes}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUpdatingConfig ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditingSupply(false);
                                        setSupplyAmount(config.totalNodes);
                                    }}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                            <div className="text-slate-400 mb-1">Total Supply</div>
                            <div className="text-xl font-bold text-white">{config.totalNodes.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                            <div className="text-slate-400 mb-1">Sold</div>
                            <div className="text-xl font-bold text-emerald-400">{soldNodes.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                            <div className="text-slate-400 mb-1">Remaining</div>
                            <div className="text-xl font-bold text-indigo-400">{(config.totalNodes - soldNodes).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <DollarSign className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                    <div className="text-slate-400 text-sm font-medium mb-1">Total Revenue</div>
                    <div className="text-3xl font-bold text-white">${totalRevenue.toLocaleString()}</div>
                </div>

                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Activity className="w-6 h-6 text-blue-400" />
                        </div>
                        <span className="text-xs font-bold px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">
                            {((soldNodes / totalNodes) * 100).toFixed(1)}% Sold
                        </span>
                    </div>
                    <div className="text-slate-400 text-sm font-medium mb-1">Nodes Sold</div>
                    <div className="text-3xl font-bold text-white">{soldNodes.toLocaleString()} <span className="text-sm text-slate-500">/ {totalNodes.toLocaleString()}</span></div>
                </div>

                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <Users className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                    <div className="text-slate-400 text-sm font-medium mb-1">Unique Buyers</div>
                    <div className="text-3xl font-bold text-white">{uniqueBuyers}</div>
                </div>

                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-pink-500/10 rounded-xl">
                            <Activity className="w-6 h-6 text-pink-400" />
                        </div>
                    </div>
                    <div className="text-slate-400 text-sm font-medium mb-1">Avg Nodes/User</div>
                    <div className="text-3xl font-bold text-white">{avgNodesPerUser.toFixed(1)}</div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-6">Daily Sales Volume</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailySales}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: '#1e293b' }}
                                />
                                <Bar dataKey="nodes" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Nodes Sold" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-6">Recent Orders</h3>
                    <div className="overflow-y-auto h-[300px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-950/50 text-slate-400 sticky top-0">
                                <tr>
                                    <th className="p-3">User</th>
                                    <th className="p-3">Nodes</th>
                                    <th className="p-3">Amount</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {recentOrders.map((order: any) => (
                                    <tr key={order._id} className="hover:bg-slate-800/30">
                                        <td className="p-3">
                                            <div className="font-medium text-white">{order.userName}</div>
                                            <div className="text-xs text-slate-500">{order.userEmail}</div>
                                        </td>
                                        <td className="p-3 text-white">{order.quantity}</td>
                                        <td className="p-3 text-emerald-400">${order.totalAmount}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${order.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                                    order.status === 'converted' ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-slate-700 text-slate-400'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-500">{new Date(order.purchaseDate).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
