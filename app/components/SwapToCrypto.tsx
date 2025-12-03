"use client";

import { useState, useEffect } from "react";
import { useCachedQuery } from "../hooks/useCachedQuery";
import { useCachedMutation } from "../hooks/useCachedMutation";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { ArrowRightLeft, Wallet, Coins, History, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "../hooks/useToast";

interface SwapToCryptoProps {
    userId: Id<"users">;
}

export function SwapToCrypto({ userId }: SwapToCryptoProps) {
    const toast = useToast();
    const [swapAmount, setSwapAmount] = useState<string>("");
    const [isSwapping, setIsSwapping] = useState(false);

    // Queries
    const blsConfig = useCachedQuery(api.bls.getBLSConfig);
    const blsBalance = useCachedQuery(api.bls.getBLSBalance, userId ? { accountId: userId as any } : "skip");
    const userProfile = useCachedQuery(api.users.getProfile, userId ? { accountId: userId as any } : "skip");
    const swapHistory = useCachedQuery(api.bls.getSwapHistory, userId ? { accountId: userId as any } : "skip");

    // Mutations
    const swapBLSToUSDT = useCachedMutation(api.bls.swapBLSToUSDT);

    // Check if queries are still loading
    const isLoading = blsConfig === undefined || blsBalance === undefined || userProfile === undefined;
    
    const isBLSEnabled = blsConfig?.isEnabled || false;
    const currentBLSBalance = blsBalance?.blsBalance || 0;
    const currentUSDTBalance = userProfile?.walletBalance || 0;
    const conversionRate = blsConfig?.conversionRate || 1.0;
    const minSwapAmount = blsConfig?.minSwapAmount || 1.0;
    
    // Helper function to format balance and prevent -0.00 display
    const formatBLSBalance = (balance: number): string => {
        const normalized = balance === 0 || Object.is(balance, -0) ? 0 : balance;
        return normalized.toFixed(2);
    };

    // Helper function to round currency amounts to 2 decimal places for safe comparison
    const roundToTwoDecimals = (value: number): number => {
        return Math.round(value * 100) / 100;
    };

    // Helper function to safely compare if amount exceeds balance (accounting for floating-point precision)
    const exceedsBalance = (amount: number, balance: number): boolean => {
        const roundedAmount = roundToTwoDecimals(amount);
        const roundedBalance = roundToTwoDecimals(balance);
        return roundedAmount > roundedBalance;
    };

    // Parse swap amount safely
    const parsedSwapAmount = swapAmount ? parseFloat(swapAmount) : 0;
    const isValidSwapAmount = !isNaN(parsedSwapAmount) && parsedSwapAmount > 0;
    
    // Calculate USDT amount based on swap amount
    const usdtAmount = isValidSwapAmount ? parsedSwapAmount * conversionRate : 0;
    
    // Determine if swap is allowed (using safe floating-point comparison)
    const canSwap = isValidSwapAmount && 
                    parsedSwapAmount >= minSwapAmount && 
                    !exceedsBalance(parsedSwapAmount, currentBLSBalance);

    // Handle swap
    const handleSwap = async () => {
        if (!swapAmount || !isValidSwapAmount) {
            toast.error("Please enter a valid swap amount");
            return;
        }

        const amount = parsedSwapAmount;

        if (amount < minSwapAmount) {
            toast.error(`Minimum swap amount is ${minSwapAmount} BLS`);
            return;
        }

        // Use safe floating-point comparison
        if (exceedsBalance(amount, currentBLSBalance)) {
            toast.error(`Insufficient BLS balance. You have ${formatBLSBalance(currentBLSBalance)} BLS`);
            return;
        }

        setIsSwapping(true);
        try {
            const result = await swapBLSToUSDT({
                accountId: userId as any,
                blsAmount: amount,
            });

            if (result.success) {
                toast.success(result.message || "Swap completed successfully!");
                setSwapAmount("");
            } else {
                toast.error(result.message || "Swap failed. Please try again.");
            }
        } catch (error: any) {
            console.error("Swap error:", error);
            // Extract error message from various error formats
            const errorMessage = error?.message || error?.toString() || "Swap failed. Please try again.";
            toast.error(errorMessage);
        } finally {
            setIsSwapping(false);
        }
    };

    // Set max amount
    const setMaxAmount = () => {
        setSwapAmount(formatBLSBalance(currentBLSBalance));
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="p-8 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 text-center">
                <Loader2 className="w-12 h-12 text-slate-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">Loading Swap Information...</h3>
                <p className="text-slate-500">Please wait while we load your balance and swap settings.</p>
            </div>
        );
    }

    if (!isBLSEnabled) {
        return (
            <div className="p-8 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 text-center">
                <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">BLS System Not Enabled</h3>
                <p className="text-slate-500">
                    The BellCoin Stable (BLS) system is currently disabled. Please contact support for more information.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ArrowRightLeft className="w-6 h-6 text-purple-400" />
                        Swap BLS to USDT
                    </h2>
                    <p className="text-slate-400 mt-1">Convert your BellCoin Stable (BLS) to USDT instantly</p>
                </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* BLS Balance */}
                <div className="p-6 bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl border border-purple-500/30">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-purple-200">
                            <Coins className="w-5 h-5" />
                            <span className="font-medium">BLS Balance</span>
                        </div>
                    </div>
                    <div className="text-3xl font-bold mb-2">
                        {formatBLSBalance(currentBLSBalance)} <span className="text-lg text-purple-300">BLS</span>
                    </div>
                    <div className="text-sm text-purple-300/70">
                        BellCoin Stable (Off-chain Points)
                    </div>
                </div>

                {/* USDT Balance */}
                <div className="p-6 bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-emerald-200">
                            <Wallet className="w-5 h-5" />
                            <span className="font-medium">USDT Balance</span>
                        </div>
                    </div>
                    <div className="text-3xl font-bold mb-2">
                        ${currentUSDTBalance.toFixed(2)} <span className="text-lg text-emerald-300">USDT</span>
                    </div>
                    <div className="text-sm text-emerald-300/70">
                        Available for withdrawal
                    </div>
                </div>
            </div>

            {/* Swap Form */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                    Swap Details
                </h3>

                <div className="space-y-6">
                    {/* Conversion Rate Info */}
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Conversion Rate</span>
                            <span className="font-bold text-purple-400">1 BLS = {conversionRate} USDT</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                            <span className="text-slate-400">Minimum Swap</span>
                            <span className="font-bold text-slate-300">{minSwapAmount} BLS</span>
                        </div>
                    </div>

                    {/* Swap Amount Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Amount to Swap (BLS)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={swapAmount}
                                onChange={(e) => setSwapAmount(e.target.value)}
                                placeholder="0.00"
                                min={minSwapAmount}
                                max={currentBLSBalance}
                                step="0.01"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button
                                onClick={setMaxAmount}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors"
                            >
                                MAX
                            </button>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                            Available: {formatBLSBalance(currentBLSBalance)} BLS
                        </div>
                    </div>

                    {/* USDT Amount Preview */}
                    {swapAmount && isValidSwapAmount && parsedSwapAmount > 0 && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-emerald-300">You will receive</span>
                                <span className="text-xl font-bold text-emerald-400">
                                    {usdtAmount.toFixed(2)} USDT
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Validation Messages */}
                    {swapAmount && (
                        <div className="space-y-1">
                            {!isValidSwapAmount && swapAmount.trim() !== "" && (
                                <p className="text-sm text-red-400">
                                    Please enter a valid number
                                </p>
                            )}
                            {isValidSwapAmount && parsedSwapAmount < minSwapAmount && (
                                <p className="text-sm text-yellow-400">
                                    Minimum swap amount is {minSwapAmount} BLS
                                </p>
                            )}
                            {isValidSwapAmount && exceedsBalance(parsedSwapAmount, currentBLSBalance) && (
                                <p className="text-sm text-red-400">
                                    Amount exceeds your BLS balance of {formatBLSBalance(currentBLSBalance)} BLS
                                </p>
                            )}
                            {canSwap && !isSwapping && (
                                <p className="text-sm text-emerald-400">
                                    ✓ Ready to swap
                                </p>
                            )}
                        </div>
                    )}

                    {/* Swap Button */}
                    <button
                        onClick={handleSwap}
                        disabled={isSwapping || !canSwap}
                        title={
                            !swapAmount
                                ? "Enter a swap amount"
                                : !isValidSwapAmount
                                ? "Enter a valid number"
                                : parsedSwapAmount < minSwapAmount
                                ? `Minimum swap amount is ${minSwapAmount} BLS`
                                : exceedsBalance(parsedSwapAmount, currentBLSBalance)
                                ? `Amount exceeds your balance of ${formatBLSBalance(currentBLSBalance)} BLS`
                                : ""
                        }
                        className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                            isSwapping || !canSwap
                                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/50 hover:scale-105"
                        }`}
                    >
                        {isSwapping ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Swapping...
                            </>
                        ) : !canSwap ? (
                            <>
                                <AlertCircle className="w-5 h-5" />
                                {!swapAmount
                                    ? "Enter Amount to Swap"
                                    : !isValidSwapAmount
                                    ? "Invalid Amount"
                                    : parsedSwapAmount < minSwapAmount
                                    ? `Minimum: ${minSwapAmount} BLS`
                                    : exceedsBalance(parsedSwapAmount, currentBLSBalance)
                                    ? "Insufficient Balance"
                                    : "Cannot Swap"}
                            </>
                        ) : (
                            <>
                                <ArrowRightLeft className="w-5 h-5" />
                                Swap to USDT
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Swap History */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-400" />
                        Swap History
                    </h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {!Array.isArray(swapHistory) || swapHistory.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No swap history yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {swapHistory.map((swap: any) => {
                                // Ensure safe defaults for numeric values
                                const blsAmount = swap.blsAmount ?? 0;
                                const usdtAmount = swap.usdtAmount ?? 0;
                                const timestamp = swap.timestamp ?? Date.now();
                                
                                return (
                                    <div
                                        key={swap._id}
                                        className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-400">
                                                <ArrowRightLeft className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium">
                                                    Swapped {blsAmount.toFixed(2)} BLS
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {new Date(timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-emerald-400">
                                                +{usdtAmount.toFixed(2)} USDT
                                            </div>
                                            <div className="text-xs text-slate-500 capitalize">
                                                {swap.status || "pending"}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

