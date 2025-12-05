"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, LogOut, Plus, User } from "lucide-react";
import { useAccount } from "../contexts/AccountContext";
import { Id } from "../convex/_generated/dataModel";

interface AccountSwitcherProps {
    onAddAccount: () => void;
    onLogout: () => void;
}

export function AccountSwitcher({ onAddAccount, onLogout }: AccountSwitcherProps) {
    const { accounts, currentAccountId, switchAccount, isLoading } = useAccount();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const currentAccount = accounts.find(acc => acc._id === currentAccountId) || accounts[0];

    const handleSwitchAccount = (accountId: Id<"accounts">) => {
        switchAccount(accountId);
        setIsOpen(false);
        // Reload to ensure all queries update with new account
        window.location.reload();
    };

    if (isLoading || !currentAccount) {
        return (
            <div className="w-10 h-10 bg-slate-700 rounded-full animate-pulse" />
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Current Account Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 rounded-lg bg-theme-tertiary dark:bg-slate-800 light:bg-indigo-100 hover:bg-opacity-80 transition-colors border border-theme-secondary dark:border-slate-700 light:border-indigo-200"
            >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 dark:bg-purple-600 light:bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                    {currentAccount.name?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="text-left hidden sm:block">
                    <div className="text-sm font-medium text-theme-primary dark:text-white light:text-gray-900">
                        {currentAccount.name || "Account"}
                    </div>
                    <div className="text-xs text-theme-secondary dark:text-slate-400 light:text-gray-500">
                        {currentAccount.referralCode || "No code"}
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-theme-secondary dark:text-slate-400 light:text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 sm:w-80 bg-theme-tertiary dark:bg-slate-800 light:bg-white rounded-lg shadow-xl border border-theme-secondary dark:border-slate-700 light:border-indigo-200 z-50 overflow-hidden">
                    <div className="p-2 max-h-96 overflow-y-auto">
                        {/* Account List */}
                        {accounts.length > 0 ? (
                            <div className="space-y-1">
                                {accounts.map((account) => (
                                    <button
                                        key={account._id}
                                        onClick={() => handleSwitchAccount(account._id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                            account._id === currentAccountId
                                                ? "bg-purple-500/20 dark:bg-purple-500/30 light:bg-indigo-100 border border-purple-500/50"
                                                : "hover:bg-slate-700/50 dark:hover:bg-slate-700/50 light:hover:bg-indigo-50"
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                            account._id === currentAccountId
                                                ? "bg-purple-500 dark:bg-purple-600 light:bg-indigo-500"
                                                : "bg-slate-600 dark:bg-slate-700 light:bg-indigo-300"
                                        }`}>
                                            {account.name?.charAt(0).toUpperCase() || "A"}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="text-sm font-medium text-theme-primary dark:text-white light:text-gray-900 truncate">
                                                {account.name || "Account"}
                                            </div>
                                            <div className="text-xs text-theme-secondary dark:text-slate-400 light:text-gray-500 truncate">
                                                {account.referralCode || "No code"}
                                            </div>
                                        </div>
                                        {account._id === currentAccountId && (
                                            <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-theme-secondary dark:text-slate-400 light:text-gray-500 text-sm">
                                No accounts found
                            </div>
                        )}

                        {/* Divider */}
                        {accounts.length > 0 && (
                            <div className="border-t border-theme-primary/20 dark:border-slate-700 light:border-indigo-200 my-2" />
                        )}

                        {/* Add Account Button */}
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onAddAccount();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 dark:hover:bg-slate-700/50 light:hover:bg-indigo-50 transition-colors text-theme-primary dark:text-white light:text-gray-900"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-600 dark:bg-slate-700 light:bg-indigo-200 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-white dark:text-slate-300 light:text-indigo-600" />
                            </div>
                            <span className="text-sm font-medium">Add Account</span>
                        </button>

                        {/* Logout Button */}
                        <div className="border-t border-theme-primary/20 dark:border-slate-700 light:border-indigo-200 my-2" />
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onLogout();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/20 dark:hover:bg-red-500/20 light:hover:bg-red-50 transition-colors text-red-500 dark:text-red-400 light:text-red-600"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

