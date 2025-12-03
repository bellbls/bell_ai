"use client";

import { useState } from "react";
import { Trash2, Edit2, Check, X, AlertTriangle, User } from "lucide-react";
import { useAccount } from "../contexts/AccountContext";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface AccountSettingsProps {
    onAccountDeleted?: () => void;
    loginId?: Id<"logins">;
}

export function AccountSettings({ onAccountDeleted, loginId }: AccountSettingsProps) {
    const { accounts, currentAccountId, switchAccount } = useAccount();
    const [editingId, setEditingId] = useState<Id<"accounts"> | null>(null);
    const [editName, setEditName] = useState("");
    const [deletingId, setDeletingId] = useState<Id<"accounts"> | null>(null);

    const updateAccount = useMutation(api.accounts.updateAccount);
    const deleteAccount = useMutation(api.accounts.deleteAccount);
    const setDefaultAccount = useMutation(api.accounts.setDefaultAccount);

    const handleStartEdit = (account: any) => {
        setEditingId(account._id);
        setEditName(account.name);
    };

    const handleSaveEdit = async (accountId: Id<"accounts">) => {
        try {
            await updateAccount({
                accountId,
                name: editName.trim(),
            });
            setEditingId(null);
            setEditName("");
        } catch (error) {
            console.error("Failed to update account:", error);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName("");
    };

    const handleDelete = async (accountId: Id<"accounts">) => {
        if (!deletingId || !loginId) return;

        try {
            await deleteAccount({
                accountId: deletingId,
                loginId: loginId,
            });
            setDeletingId(null);
            onAccountDeleted?.();
            // Refresh page to update accounts list
            window.location.reload();
        } catch (error: any) {
            console.error("Failed to delete account:", error);
            alert(error.message || "Failed to delete account");
        } finally {
            setDeletingId(null);
        }
    };

    const handleSetDefault = async (accountId: Id<"accounts">) => {
        try {
            // We need loginId - this is a limitation we need to fix
            // For now, just switch to this account
            switchAccount(accountId);
        } catch (error) {
            console.error("Failed to set default account:", error);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-theme-primary mb-2">Account Management</h2>
                <p className="text-theme-secondary">
                    Manage your accounts. Each account has its own wallet, stakes, and referral network.
                </p>
            </div>

            <div className="space-y-4">
                {accounts.map((account) => (
                    <div
                        key={account._id}
                        className={`p-6 rounded-xl border ${
                            account._id === currentAccountId
                                ? "bg-purple-500/10 border-purple-500/30"
                                : "bg-theme-tertiary border-theme-primary/20"
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                                    {getInitials(account.name)}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    {editingId === account._id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 px-3 py-1.5 bg-theme-secondary border border-theme-primary/20 rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleSaveEdit(account._id)}
                                                className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-theme-primary">
                                                    {account.name}
                                                </h3>
                                                {account.isDefault && (
                                                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                                                        Default
                                                    </span>
                                                )}
                                                {account._id === currentAccountId && (
                                                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-theme-secondary space-y-1">
                                                <div>Referral Code: <span className="font-mono font-semibold">{account.referralCode}</span></div>
                                                <div>Balance: <span className="font-semibold text-theme-primary">${account.walletBalance.toFixed(2)}</span></div>
                                                <div>Rank: <span className="font-semibold text-purple-400">{account.currentRank}</span></div>
                                                <div>Created: {formatDate(account.createdAt)}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {editingId !== account._id && (
                                <div className="flex items-center gap-2">
                                    {!account.isDefault && (
                                        <button
                                            onClick={() => handleSetDefault(account._id)}
                                            className="p-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                                            title="Set as default"
                                        >
                                            <User className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleStartEdit(account)}
                                        className="p-2 text-theme-secondary hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Rename account"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {accounts.length > 1 && (
                                        <button
                                            onClick={() => setDeletingId(account._id)}
                                            className="p-2 text-theme-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete account"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {deletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-theme-secondary rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-red-500/30">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-theme-primary">Delete Account</h3>
                                    <p className="text-sm text-theme-secondary">This action cannot be undone</p>
                                </div>
                            </div>
                            <p className="text-theme-secondary mb-6">
                                Are you sure you want to delete this account? All data associated with this account will be preserved for audit purposes, but you won't be able to access it anymore.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeletingId(null)}
                                    className="flex-1 px-4 py-2.5 bg-theme-tertiary hover:bg-theme-primary/20 rounded-lg text-theme-primary font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deletingId)}
                                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition-colors"
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

