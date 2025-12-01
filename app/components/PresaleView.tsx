import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
    Rocket, AlertCircle, Check, Clock, Shield,
    TrendingUp, Wallet, Info, ChevronRight, Star,
    DollarSign, Calendar, Users, Award, Layers, Zap, History
} from "lucide-react";
import { useToast } from "../hooks/useToast";

export function PresaleView({ userId }: { userId: Id<"users"> }) {
    const toast = useToast();
    const config = useQuery(api.presale.getConfig);
    const userOrders = useQuery(api.presale.getUserOrders, { userId });
    const userProfile = useQuery(api.users.getProfile, { userId });
    const pauseStates = useQuery(api.configs.getSystemPauseStates);

    const purchaseNode = useMutation(api.presale.purchaseNode);

    const [quantity, setQuantity] = useState(1);
    const [isPurchasing, setIsPurchasing] = useState(false);

    // Handle loading state (undefined) vs not initialized (null)
    if (config === undefined) return <div className="p-8 text-center">Loading presale data...</div>;

    // Handle presale not initialized
    if (config === null) {
        return (
            <div className="max-w-2xl mx-auto p-8 bg-slate-900/50 rounded-2xl border border-slate-800">
                <div className="text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Rocket className="w-8 h-8 text-slate-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Presale Not Active</h2>
                    <p className="text-slate-400 mb-6">
                        The presale system has not been initialized yet. Please check back later or contact an administrator.
                    </p>
                    <div className="bg-slate-800/50 rounded-xl p-4 text-sm text-slate-500">
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        If you're an admin, please initialize the presale configuration from the Admin Panel.
                    </div>
                </div>
            </div>
        );
    }

    const soldPercentage = Math.min(100, (config.soldNodes / config.totalNodes) * 100);
    const totalCost = quantity * config.pricePerNode;
    const canAfford = (userProfile?.walletBalance || 0) >= totalCost;
    const remainingNodes = config.totalNodes - config.soldNodes;

    // Calculate user stats
    const userTotalNodes = userOrders?.reduce((sum, o) => sum + o.quantity, 0) || 0;
    const userTotalInvested = userOrders?.reduce((sum, o) => sum + o.totalAmount, 0) || 0;

    const handlePurchase = async () => {
        if (!canAfford) {
            toast.error("Insufficient wallet balance");
            return;
        }
        if (quantity > remainingNodes) {
            toast.error(`Only ${remainingNodes} nodes remaining`);
            return;
        }

        setIsPurchasing(true);
        try {
            await purchaseNode({ userId, quantity });
            toast.success(`Successfully purchased ${quantity} node(s)!`);
            setQuantity(1);
        } catch (err: any) {
            toast.error(err.message || "Purchase failed");
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-1">
                <div className="relative bg-slate-900 rounded-3xl p-8 md:p-12">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl"></div>
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
                            <div className="flex-1">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 rounded-full border border-indigo-400/30 mb-4">
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    <span className="text-sm font-medium text-indigo-200">Limited Time Offer</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                                    Founder Node Presale
                                </h1>
                                <p className="text-lg text-indigo-200/90 max-w-2xl">
                                    Secure your position in the network early and unlock multiple revenue streams with exclusive node holder benefits
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                                    <div className="text-center">
                                        <p className="text-sm text-indigo-200 mb-2">Price per Node</p>
                                        <p className="text-4xl font-bold text-white mb-1">${config.pricePerNode}</p>
                                        <p className="text-sm text-indigo-300">USDT</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <p className="text-sm text-indigo-200/80 mb-1">Total Supply</p>
                                <p className="text-2xl font-bold text-white">{config.totalNodes.toLocaleString()}</p>
                                <p className="text-xs text-indigo-300/70 mt-1">Nodes Available</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <p className="text-sm text-indigo-200/80 mb-1">Remaining</p>
                                <p className="text-2xl font-bold text-indigo-300">{remainingNodes.toLocaleString()}</p>
                                <p className="text-xs text-indigo-300/70 mt-1">Still Available</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                <p className="text-sm text-indigo-200/80 mb-1">Progress</p>
                                <p className="text-2xl font-bold text-white">{soldPercentage.toFixed(1)}%</p>
                                <p className="text-xs text-indigo-300/70 mt-1">Sold</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Node Holder Benefits Section */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-10 border border-slate-700/50">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-400/30 mb-4">
                        <Award className="w-5 h-5 text-purple-400" />
                        <span className="text-sm font-medium text-purple-300">Exclusive Benefits</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Node Holder Benefits</h2>
                    <p className="text-slate-300 max-w-2xl mx-auto">
                        As a node holder, you unlock multiple revenue streams and exclusive platform benefits
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Benefit 1: Withdrawal Revenue */}
                    <div className="group bg-slate-800/50 hover:bg-slate-800/70 rounded-2xl p-6 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <DollarSign className="w-6 h-6 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Earn 2% of Withdrawal Revenue</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Receive a share of the platform's revenue every time users make withdrawals. Your node works for you!
                        </p>
                    </div>

                    {/* Benefit 2: Weekly Revenue Sharing */}
                    <div className="group bg-slate-800/50 hover:bg-slate-800/70 rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Calendar className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Weekly Revenue Sharing</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Get a portion of the company's overall revenue distributed to node holders every week, ensuring consistent passive income.
                        </p>
                    </div>

                    {/* Benefit 3: Staking Yields */}
                    <div className="group bg-slate-800/50 hover:bg-slate-800/70 rounded-2xl p-6 border border-slate-700/50 hover:border-emerald-500/50 transition-all duration-300">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Attractive Staking Yields</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Boost your earnings with our competitive staking rewards. The longer you stake, the more you earn.
                        </p>
                    </div>

                    {/* Benefit 4: Referral Bonuses / Unilevel Commissions */}
                    {(pauseStates?.referralBonusesEnabled ?? false) ? (
                        <div className="group bg-slate-800/50 hover:bg-slate-800/70 rounded-2xl p-6 border border-slate-700/50 hover:border-pink-500/50 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6 text-pink-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Referral Bonuses</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Invite others and earn rewards for every new user you bring to the platform.
                            </p>
                        </div>
                    ) : (
                        <div className="group bg-slate-800/50 hover:bg-slate-800/70 rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Layers className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Unilevel Commissions</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Earn from 10 levels of your network with up to 16% total commission rates.
                            </p>
                        </div>
                    )}

                    {/* Benefit 5: B-Ranking Rewards */}
                    <div className="group bg-slate-800/50 hover:bg-slate-800/70 rounded-2xl p-6 border border-slate-700/50 hover:border-yellow-500/50 transition-all duration-300">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Award className="w-6 h-6 text-yellow-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">B-Ranking Rewards</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Climb the ranks and unlock additional bonuses as your network grows.
                        </p>
                    </div>

                    {/* Benefit 6: Unilevel Bonuses */}
                    <div className="group bg-slate-800/50 hover:bg-slate-800/70 rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Layers className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Unilevel Bonuses</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Benefit from multiple levels of referrals. Earn from direct and indirect network activity.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Purchase Form */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Progress Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700/50">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Presale Progress</h3>
                                <p className="text-slate-400 text-sm">Join {config.soldNodes} other early adopters</p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                    {soldPercentage.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-slate-800/50 rounded-full h-5 overflow-hidden border border-slate-700/50">
                            <div
                                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                                style={{ width: `${soldPercentage}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                            </div>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                            <span>{config.soldNodes.toLocaleString()} sold</span>
                            <span>{remainingNodes.toLocaleString()} remaining</span>
                        </div>
                    </div>

                    {/* Purchase Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 border border-slate-700/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <Rocket className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Purchase Nodes</h3>
                        </div>

                        {!config.isActive ? (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3 text-yellow-200">
                                <Clock className="w-5 h-5" />
                                <p>Presale is currently closed. Please check back later.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-slate-400 text-sm mb-2">Quantity</label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-center text-white font-bold text-lg focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={() => setQuantity(Math.min(remainingNodes, quantity + 1))}
                                            className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 rounded-xl p-5 space-y-4 border border-slate-700/50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm">Price per Node</span>
                                        <span className="text-white font-semibold">${config.pricePerNode} USDT</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm">Quantity</span>
                                        <span className="text-white font-semibold">{quantity} {quantity === 1 ? 'Node' : 'Nodes'}</span>
                                    </div>
                                    <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent my-2"></div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-white font-semibold">Total Cost</span>
                                        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                            ${totalCost} USDT
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm text-slate-400 bg-slate-800/30 p-3 rounded-lg">
                                    <span className="flex items-center gap-2">
                                        <Wallet className="w-4 h-4" />
                                        Wallet Balance
                                    </span>
                                    <span className={canAfford ? "text-green-400" : "text-red-400"}>
                                        ${userProfile?.walletBalance?.toFixed(2) || "0.00"}
                                    </span>
                                </div>

                                <button
                                    onClick={handlePurchase}
                                    disabled={isPurchasing || !canAfford || quantity <= 0}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all relative overflow-hidden group ${
                                        isPurchasing || !canAfford || quantity <= 0
                                            ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                                            : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                                    }`}
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {isPurchasing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Processing...
                                            </>
                                        ) : !canAfford ? (
                                            <>
                                                <AlertCircle className="w-5 h-5" />
                                                Insufficient Balance
                                            </>
                                        ) : (
                                            <>
                                                <Rocket className="w-5 h-5" />
                                                Confirm Purchase
                                            </>
                                        )}
                                    </span>
                                    {!isPurchasing && canAfford && quantity > 0 && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Vesting Info */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 border border-slate-700/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Vesting Schedule</h3>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-6 border border-indigo-500/20">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                                    <Zap className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white font-semibold mb-2 text-lg">Staking is coming!</h4>
                                    <p className="text-slate-300 leading-relaxed">
                                        Soon, your nodes will automatically roll into 1-year staking slots, unlocking rewards, {(pauseStates?.referralBonusesEnabled ?? false) ? "referral bonuses" : "Unilevel commissions"}, and revenue sharing right from day one. <strong className="text-white">Sit back and watch your passive income grow!</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: User Stats */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700/50">
                        <h3 className="text-xl font-bold text-white mb-6">Your Holdings</h3>

                        <div className="space-y-6">
                            <div className="text-center p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20">
                                <p className="text-slate-400 text-sm mb-2 font-medium">Reserved Nodes</p>
                                <p className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                                    {userTotalNodes}
                                </p>
                                <p className="text-indigo-300 text-sm font-medium">Total Value: ${userTotalInvested.toFixed(2)}</p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Recent Orders</h4>
                                {userOrders && userOrders.length > 0 ? (
                                    <div className="space-y-3">
                                        {userOrders.slice(0, 5).map((order) => (
                                            <div key={order._id} className="bg-slate-800/30 p-3 rounded-lg flex justify-between items-center">
                                                <div>
                                                    <p className="text-white font-medium">{order.quantity} Node{order.quantity > 1 ? 's' : ''}</p>
                                                    <p className="text-xs text-slate-500">{new Date(order.purchaseDate).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-indigo-400 font-medium">${order.totalAmount}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                                        order.status === 'converted' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-slate-700 text-slate-400'
                                                        }`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500 bg-slate-800/20 rounded-xl border border-slate-800 border-dashed">
                                        No orders yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl p-6 border border-indigo-500/20">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <Zap className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-indigo-300 font-bold mb-3 text-lg">Why Buy Presale?</h4>
                                <ul className="space-y-2.5 text-sm text-indigo-200/90">
                                    <li className="flex items-start gap-2.5">
                                        <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                        <span>Early access to staking rewards</span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                        <span>Discounted entry price</span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                        <span>Higher potential ROI</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction History Section */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="p-6 border-b border-slate-700/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <History className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Purchase History</h3>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    {userOrders && userOrders.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700/50">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Order ID</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Quantity</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    {userOrders
                                        .sort((a, b) => b.purchaseDate - a.purchaseDate)
                                        .map((order) => (
                                            <tr key={order._id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="py-4 px-4 text-slate-300">
                                                    {new Date(order.purchaseDate).toLocaleString()}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="text-slate-400 font-mono text-sm">
                                                        {order._id.substring(order._id.length - 8)}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-white font-medium">
                                                    {order.quantity} {order.quantity === 1 ? 'Node' : 'Nodes'}
                                                </td>
                                                <td className="py-4 px-4 text-indigo-400 font-semibold">
                                                    ${order.totalAmount.toFixed(2)} USDT
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                        order.status === 'confirmed' 
                                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                                            : order.status === 'converted'
                                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                            : order.status === 'pending'
                                                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                            : 'bg-slate-700/50 text-slate-400 border border-slate-700'
                                                    }`}>
                                                        {order.status === 'confirmed' && <Check className="w-3 h-3 mr-1" />}
                                                        {order.status === 'converted' && <Zap className="w-3 h-3 mr-1" />}
                                                        {order.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <History className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-slate-400 text-lg mb-2">No Purchase History</p>
                            <p className="text-slate-500 text-sm">Your node purchase transactions will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
