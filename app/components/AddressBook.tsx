"use client";

import { useState } from "react";
import { useCachedQuery } from "../hooks/useCachedQuery";
import { useCachedMutation } from "../hooks/useCachedMutation";
import { api } from "../convex/_generated/api";
import { Plus, Trash2, Clock, CheckCircle, AlertTriangle, Shield } from "lucide-react";

export function AddressBook({ userId, toast }: { userId: string; toast: any }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newAddress, setNewAddress] = useState("");
    const [newLabel, setNewLabel] = useState("");
    const [loading, setLoading] = useState(false);

    const addresses = useCachedQuery(api.addressBook.getAddresses, { userId: userId as any });
    const addAddress = useCachedMutation(api.addressBook.addAddress);
    const deleteAddress = useCachedMutation(api.addressBook.deleteAddress);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAddress || newAddress.length < 10) {
            toast.warning("Please enter a valid wallet address");
            return;
        }

        setLoading(true);
        try {
            await addAddress({
                userId: userId as any,
                address: newAddress,
                label: newLabel,
            });
            toast.success("Address added successfully! It will be unlocked in 24 hours.");
            setIsAdding(false);
            setNewAddress("");
            setNewLabel("");
        } catch (e: any) {
            toast.error(e.message || "Failed to add address");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this address?")) return;
        try {
            await deleteAddress({ id: id as any, userId: userId as any });
            toast.success("Address removed");
        } catch (e: any) {
            toast.error("Failed to delete address");
        }
    };

    const formatTimeRemaining = (unlockedAt: number) => {
        const now = Date.now();
        const diff = unlockedAt - now;
        if (diff <= 0) return "Unlocked";
        const hours = Math.ceil(diff / (1000 * 60 * 60));
        return `${hours}h remaining`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-400" /> Saved Wallets
                    </h3>
                    <p className="text-sm text-slate-400">Manage your whitelist addresses for withdrawals.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add New
                </button>
            </div>

            {/* Add Form */}
            {isAdding && (
                <form onSubmit={handleAdd} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Label (Optional)</label>
                        <input
                            className="w-full p-3 bg-slate-900 rounded-lg border border-slate-700 focus:border-purple-500 outline-none text-sm"
                            placeholder="e.g. My Binance Wallet"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Wallet Address (TRC20)</label>
                        <input
                            className="w-full p-3 bg-slate-900 rounded-lg border border-slate-700 focus:border-purple-500 outline-none font-mono text-sm"
                            placeholder="T..."
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            required
                        />
                    </div>
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-200">
                            For security, new addresses are <strong>locked for 24 hours</strong> before they can be used for withdrawals.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-bold text-sm transition-all"
                        >
                            {loading ? "Adding..." : "Save Address"}
                        </button>
                    </div>
                </form>
            )}

            {/* Address List */}
            <div className="space-y-3">
                {!Array.isArray(addresses) || addresses.length === 0 ? (
                    <div className="text-center p-8 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
                        No saved addresses found.
                    </div>
                ) : (
                    addresses.map((addr: any) => (
                        <div key={addr._id} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 group hover:border-slate-700 transition-all">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className={`p-2 rounded-lg shrink-0 ${addr.isReady ? 'bg-emerald-500/10' : 'bg-yellow-500/10'}`}>
                                    {addr.isReady ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <Clock className="w-5 h-5 text-yellow-400" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-white text-sm">{addr.label || "Wallet"}</div>
                                    <div className="text-xs text-slate-400 font-mono break-all">{addr.address}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {!addr.isReady && (
                                    <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full">
                                        Locked: {formatTimeRemaining(addr.unlockedAt)}
                                    </span>
                                )}
                                <button
                                    onClick={() => handleDelete(addr._id)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
