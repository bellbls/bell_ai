"use client";

import { useState } from "react";
import { X, TrendingUp, Wallet } from "lucide-react";

interface StakeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => void;
    cycle: { days: number; dailyRate: number };
    walletBalance: number;
}

export function StakeModal({ isOpen, onClose, onConfirm, cycle, walletBalance }: StakeModalProps) {
    const [amount, setAmount] = useState("");
    const MIN_STAKE_AMOUNT = 100; // Minimum stake is $100

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (parsedAmount >= MIN_STAKE_AMOUNT && parsedAmount <= walletBalance) {
            onConfirm(parsedAmount);
            setAmount("");
            onClose();
        }
    };

    const parsedAmount = parseFloat(amount) || 0;
    const totalReturn = (cycle.dailyRate * cycle.days).toFixed(1);
    const estimatedEarnings = parsedAmount ? (parsedAmount * cycle.dailyRate * cycle.days / 100).toFixed(2) : "0.00";
    const remainingBalance = walletBalance - parsedAmount;
    const isOverBalance = parsedAmount > walletBalance;
    const isBelowMinimum = parsedAmount > 0 && parsedAmount < MIN_STAKE_AMOUNT;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-purple-400">Stake {cycle.days} Days</h3>
                            <p className="text-sm text-slate-400">{cycle.dailyRate}% daily return</p>
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
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-emerald-400" />
                            <span className="text-sm text-emerald-300 font-medium">Available Balance</span>
                        </div>
                        <span className="text-lg font-bold text-emerald-400">${walletBalance.toFixed(2)}</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Stake Amount (USDT) <span className="text-purple-400">• Min: $100</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="100"
                            max={walletBalance}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Minimum $100"
                            className={`w-full p-3 sm:p-4 text-base sm:text-lg bg-theme-tertiary dark:bg-slate-800 light:bg-white rounded-xl border ${isOverBalance ? 'border-red-500' :
                                    isBelowMinimum ? 'border-yellow-500' :
                                        'border-theme-secondary dark:border-slate-700 light:border-gray-300'
                                } focus:border-purple-500 dark:focus:border-purple-500 light:focus:border-indigo-500 outline-none text-theme-primary font-bold transition-all`}
                            autoFocus
                            required
                        />
                        {isOverBalance && (
                            <p className="text-red-400 text-sm mt-2">Amount exceeds available balance</p>
                        )}
                        {isBelowMinimum && (
                            <p className="text-yellow-400 text-sm mt-2">Minimum stake amount is $100</p>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-xl">
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Total Return</div>
                            <div className="text-lg font-bold text-emerald-400">{totalReturn}%</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Est. Earnings</div>
                            <div className="text-lg font-bold text-purple-400">${estimatedEarnings}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Remaining</div>
                            <div className={`text-lg font-bold ${remainingBalance < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                                ${remainingBalance.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <p className="text-sm text-blue-300">
                            <strong>Note:</strong> Your funds will be locked for {cycle.days} days. You'll earn {cycle.dailyRate}% daily, totaling {totalReturn}% by the end of the period.
                        </p>
                    </div>

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
                            disabled={isOverBalance || isBelowMinimum || parsedAmount <= 0}
                            className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Stake
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
