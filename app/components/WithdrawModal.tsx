"use client";

import { useState, useEffect } from "react";
import { useCachedQuery } from "../hooks/useCachedQuery";
import { api } from "../convex/_generated/api";
import { X, ArrowUpRight, Wallet, AlertTriangle, Shield } from "lucide-react";

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, address: string, network: string, twoFactorCode?: string) => void;  // Added 2FA code parameter
    walletBalance: number;
    userId?: string;
    onNavigateToSettings?: () => void;
}

export function WithdrawModal({ isOpen, onClose, onConfirm, walletBalance, userId, onNavigateToSettings }: WithdrawModalProps) {
    const [amount, setAmount] = useState("");
    const [selectedAddress, setSelectedAddress] = useState("");
    const [network, setNetwork] = useState("polygon");  // NEW: Network selection
    const [twoFactorCode, setTwoFactorCode] = useState("");

    // Fetch min withdrawal amount from config
    const minWithdrawalConfig = useCachedQuery(api.configs.getMinWithdrawalAmount);
    const MIN_WITHDRAW_AMOUNT = minWithdrawalConfig ?? 50;

    // Fetch fee percentage
    const feePercentageConfig = useCachedQuery(api.configs.getWithdrawalFeePercentage);
    const feePercentage = feePercentageConfig ?? 0;

    // Fetch saved addresses
    const savedAddresses = useCachedQuery(api.addressBook.getAddresses, userId ? { userId: userId as any } : "skip");

    // Fetch BLS config to check if BLS system is enabled
    const blsConfig = useCachedQuery(api.bls.getBLSConfig);
    const isBLSEnabled = blsConfig?.isEnabled || false;

    // Fetch swapped USDT balance (for withdrawals when BLS enabled)
    const swappedUSDTBalance = useCachedQuery(
        api.wallet.getSwappedUSDTBalance,
        userId ? { userId: userId as any } : "skip"
    );
    const availableWithdrawalBalance = isBLSEnabled
        ? (swappedUSDTBalance?.swappedUSDTBalance || 0)
        : walletBalance;

    // Fetch 2FA requirement and user 2FA status
    // Use getSystemPauseStates as primary source (it includes twoFactorRequired)
    const pauseStates = useCachedQuery(api.configs.getSystemPauseStates);
    // Try to get detailed 2FA requirement (for enabledAt timestamp), but don't break if it's not available
    const twoFactorRequirement = useCachedQuery(api.configs.get2FARequirement, "skip"); // Skip for now to avoid errors
    const userProfile = useCachedQuery(api.users.getProfile, userId ? { userId: userId as any } : "skip");
    // Use pauseStates.twoFactorRequired as primary source, fallback to twoFactorRequirement if available
    const is2FARequired = pauseStates?.twoFactorRequired ?? twoFactorRequirement?.isRequired ?? false;
    const requires2FA = is2FARequired && userProfile?.twoFactorEnabled;

    // Filter for unlocked addresses - ensure savedAddresses is an array
    const activeAddresses = Array.isArray(savedAddresses) 
        ? savedAddresses.filter((addr: any) => addr.isReady) 
        : [];

    // Reset selection when modal opens or addresses load
    useEffect(() => {
        if (isOpen && activeAddresses.length > 0 && !selectedAddress) {
            setSelectedAddress(activeAddresses[0].address);
        }
    }, [isOpen, activeAddresses, selectedAddress]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (parsedAmount >= MIN_WITHDRAW_AMOUNT && parsedAmount <= availableWithdrawalBalance && selectedAddress) {
            // If 2FA is required, include the code
            const code = requires2FA ? twoFactorCode : undefined;
            onConfirm(parsedAmount, selectedAddress, network, code);  // Pass network and 2FA code
            setAmount("");
            setTwoFactorCode("");
            onClose();
        }
    };

    const parsedAmount = parseFloat(amount) || 0;
    const fee = parsedAmount * (feePercentage / 100);
    const netAmount = parsedAmount - fee;
    const isBelowMinimum = parsedAmount > 0 && parsedAmount < MIN_WITHDRAW_AMOUNT;
    const isOverBalance = parsedAmount > availableWithdrawalBalance;
    const noActiveAddresses = !Array.isArray(savedAddresses) || activeAddresses.length === 0;
    const noSwappedUSDT = isBLSEnabled && availableWithdrawalBalance === 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <ArrowUpRight className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-purple-400">Withdraw Funds</h3>
                            <p className="text-sm text-slate-400">Transfer funds to external wallet</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Wallet Balance Display */}
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-emerald-400" />
                                <span className="text-sm text-emerald-300 font-medium">
                                    {isBLSEnabled ? "Available for Withdrawal (Swapped BLS)" : "Available Balance"}
                                </span>
                            </div>
                            <span className="text-lg font-bold text-emerald-400">${availableWithdrawalBalance.toFixed(2)}</span>
                        </div>
                        {isBLSEnabled && walletBalance > availableWithdrawalBalance && (
                            <p className="text-xs text-emerald-200/70 mt-1">
                                Total USDT: ${walletBalance.toFixed(2)} (${(walletBalance - availableWithdrawalBalance).toFixed(2)} not from BLS swaps)
                            </p>
                        )}
                    </div>

                    {/* BLS Warning */}
                    {noSwappedUSDT && (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-yellow-400 mb-1">No Swapped BLS Available</h4>
                                <p className="text-xs text-yellow-200 mb-2">
                                    When BLS system is enabled, you can only withdraw USDT that came from swapping your BLS. Please swap your BLS to USDT first.
                                </p>
                            </div>
                        </div>
                    )}

                    {noActiveAddresses ? (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-yellow-400 mb-1">No Active Addresses</h4>
                                <p className="text-xs text-yellow-200 mb-2">
                                    You need to add a withdrawal address in your settings first. New addresses are locked for 24 hours.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onNavigateToSettings?.();
                                    }}
                                    className="text-xs font-bold text-white underline hover:text-purple-400"
                                >
                                    Go to Settings
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Network Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Blockchain Network
                                </label>
                                <select
                                    value={network}
                                    onChange={(e) => setNetwork(e.target.value)}
                                    className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 focus:border-purple-500 outline-none text-white text-sm transition-all appearance-none"
                                    required
                                >
                                    <option value="polygon">Polygon (USDT)</option>
                                    <option value="bsc">BNB-BSC(BEP20) (USDT)</option>
                                    <option value="arbitrum">Arbitrum (USDT)</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-2">
                                    {network === 'polygon' && '⚡ Fast & Low Fees'}
                                    {network === 'bsc' && '💰 Low Transaction Costs'}
                                    {network === 'arbitrum' && '🚀 Layer 2 Scaling'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Select Wallet Address
                                </label>
                                <select
                                    value={selectedAddress}
                                    onChange={(e) => setSelectedAddress(e.target.value)}
                                    className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 focus:border-purple-500 outline-none text-white text-sm transition-all appearance-none"
                                    required
                                >
                                    {activeAddresses.map((addr: any) => (
                                        <option key={addr._id} value={addr.address}>
                                            {addr.label || "Wallet"} - {addr.address.substring(0, 8)}...{addr.address.substring(addr.address.length - 6)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Withdraw Amount (USDT) <span className="text-purple-400">• Min: ${MIN_WITHDRAW_AMOUNT}</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min={MIN_WITHDRAW_AMOUNT}
                                    max={walletBalance}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder={`Minimum $${MIN_WITHDRAW_AMOUNT}`}
                                    className={`w-full p-3 sm:p-4 text-base sm:text-lg bg-theme-tertiary dark:bg-slate-800 light:bg-white rounded-xl border ${isOverBalance ? 'border-red-500' :
                                        isBelowMinimum ? 'border-red-500' :
                                            'border-theme-secondary dark:border-slate-700 light:border-gray-300'
                                        } focus:border-purple-500 dark:focus:border-purple-500 light:focus:border-indigo-500 outline-none text-theme-primary font-bold transition-all`}
                                    autoFocus
                                    required
                                />
                                {isOverBalance && (
                                    <p className="text-red-400 text-sm mt-2">
                                        {isBLSEnabled
                                            ? "Amount exceeds available swapped BLS balance. Please swap more BLS to USDT first."
                                            : "Amount exceeds available balance"}
                                    </p>
                                )}
                                {isBelowMinimum && (
                                    <p className="text-red-400 text-sm mt-2">
                                        Minimum withdrawal amount is ${MIN_WITHDRAW_AMOUNT}
                                    </p>
                                )}
                            </div>

                            {/* Fee Breakdown */}
                            {parsedAmount > 0 && (
                                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Requested Amount</span>
                                        <span className="text-white font-medium">${parsedAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Processing Fee ({feePercentage}%)</span>
                                        <span className="text-red-400 font-medium">-${fee.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-700 flex justify-between text-sm">
                                        <span className="text-slate-300 font-bold">Net To Receive</span>
                                        <span className="text-emerald-400 font-bold">${netAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            {/* 2FA Input */}
                            {requires2FA && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="w-5 h-5 text-indigo-400" />
                                        <label className="block text-sm font-medium text-slate-400">
                                            2FA Code Required
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        value={twoFactorCode}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, "");
                                            setTwoFactorCode(value);
                                        }}
                                        className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none text-center text-2xl tracking-widest font-mono text-white transition-all"
                                        placeholder="000000"
                                        required={requires2FA}
                                    />
                                    <p className="text-xs text-slate-500">
                                        Enter the 6-digit code from your authenticator app
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isOverBalance || isBelowMinimum || noActiveAddresses || parsedAmount <= 0 || !selectedAddress || (requires2FA && twoFactorCode.length !== 6)}
                            className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Request Withdrawal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
