"use client";

import { useState } from "react";
import { X, UserPlus, AlertCircle } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface CreateAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    loginId: Id<"logins">;
}

export function CreateAccountModal({ isOpen, onClose, onSuccess, loginId }: CreateAccountModalProps) {
    const [name, setName] = useState("");
    const [referralCode, setReferralCode] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const createAccount = useMutation(api.accounts.createAccount);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim() || name.trim().length < 2) {
            setError("Account name must be at least 2 characters long");
            return;
        }

        if (!referralCode.trim()) {
            setError("Referral code is required");
            return;
        }

        setIsLoading(true);
        try {
            await createAccount({
                loginId,
                name: name.trim(),
                referralCode: referralCode.trim().toUpperCase(),
            });

            // Reset form
            setName("");
            setReferralCode("");
            setError("");
            onSuccess();
            onClose();
        } catch (err: any) {
            const errorMessage = err.message || err.toString();
            setError(errorMessage.replace(/\[CONVEX.*?\]\s*/g, "").replace(/Called by client\s*/g, ""));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-theme-secondary rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-theme-primary/20">
                <div className="p-6 border-b border-theme-primary/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-theme-primary">Create New Account</h2>
                                <p className="text-sm text-theme-secondary">Add a new account to your profile</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-theme-secondary hover:text-theme-primary transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-theme-primary mb-2">
                            Account Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Personal Account, Business Account"
                            className="w-full px-4 py-2.5 bg-theme-tertiary border border-theme-primary/20 rounded-lg text-theme-primary placeholder-theme-secondary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            disabled={isLoading}
                            required
                        />
                        <p className="mt-1 text-xs text-theme-secondary">
                            Choose a name to identify this account
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-theme-primary mb-2">
                            Referral Code <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                            placeholder="Enter referral code"
                            className="w-full px-4 py-2.5 bg-theme-tertiary border border-theme-primary/20 rounded-lg text-theme-primary placeholder-theme-secondary focus:outline-none focus:ring-2 focus:ring-purple-500/50 uppercase"
                            disabled={isLoading}
                            required
                        />
                        <p className="mt-1 text-xs text-theme-secondary">
                            A valid referral code is required to create an account
                        </p>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-400">
                            <strong>Note:</strong> Each account operates independently with its own wallet, stakes, and referral network. You can switch between accounts anytime.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-theme-tertiary hover:bg-theme-primary/20 rounded-lg text-theme-primary font-medium transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? "Creating..." : "Create Account"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

