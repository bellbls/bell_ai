"use client";

import { useState, useRef, useEffect } from "react";
import { User, Plus, ChevronDown, Check, LogOut } from "lucide-react";
import { useAccount } from "../contexts/AccountContext";
import { Id } from "../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

interface AccountSwitcherProps {
    onAddAccount?: () => void;
    onLogout?: () => void;
}

export function AccountSwitcher({ onAddAccount, onLogout }: AccountSwitcherProps) {
    // All hooks must be called before any conditional returns
    const { currentAccountId, accounts, isLoading, switchAccount } = useAccount();
    const [isOpen, setIsOpen] = useState(false);
    const [currentLoginId, setCurrentLoginId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const setDefaultAccount = useMutation(api.accounts.setDefaultAccount);
    
    // Safely get currentLoginId from localStorage (client-side only)
    useEffect(() => {
        if (typeof window !== "undefined") {
            setCurrentLoginId(localStorage.getItem("loginId"));
        }
    }, []);

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

    const currentAccount = accounts.find(acc => acc._id === currentAccountId);

    // If no accounts yet or still loading, show a simple button to add account
    if (isLoading === false && (accounts.length === 0 || !currentAccount)) {
        return (
            <div className="relative">
                <button
                    onClick={() => onAddAccount?.()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium transition-all shadow-lg"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Account</span>
                    <span className="sm:hidden">Add</span>
                </button>
            </div>
        );
    }

    // If still loading, show a loading state
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-tertiary animate-pulse">
                <div className="w-8 h-8 rounded-full bg-theme-secondary"></div>
                <div className="h-4 w-24 bg-theme-secondary rounded"></div>
            </div>
        );
    }

    const handleAccountSelect = async (accountId: Id<"accounts">) => {
        if (accountId === currentAccountId) {
            setIsOpen(false);
            return;
        }

        try {
            const account = accounts.find(acc => acc._id === accountId);
            if (!account) {
                console.error("Account not found");
                return;
            }
            
            // If account is from a different login, we need to switch loginId
            if (account.loginId && typeof window !== "undefined") {
                const storedLoginId = localStorage.getItem("loginId");
                if (account.loginId !== storedLoginId) {
                    // Switch to the account's login
                    localStorage.setItem("loginId", account.loginId);
                    localStorage.setItem("accountId", accountId);
                    // Update state
                    setCurrentLoginId(account.loginId);
                    // Reload to update all components with new loginId
                    window.location.reload();
                    return;
                }
            }
            
            switchAccount(accountId);
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to switch account:", error);
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

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg bg-theme-tertiary hover:bg-theme-secondary/50 transition-colors border border-theme-secondary/30"
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                    {currentAccount ? getInitials(currentAccount.name) : <User className="w-4 h-4" />}
                </div>
                <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-theme-primary truncate">
                        {currentAccount?.name || "Loading..."}
                    </div>
                    <div className="text-xs text-theme-secondary truncate">
                        {currentAccount?.referralCode || ""}
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-theme-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-theme-secondary rounded-xl shadow-2xl border border-theme-primary/20 z-50 overflow-hidden">
                    <div className="p-2">
                        <div className="px-3 py-2 text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-1">
                            Your Accounts
                        </div>
                        
                        {/* Group accounts by loginId if available */}
                        {(() => {
                            // Group accounts by loginId
                            const accountsByLogin = new Map<Id<"logins">, typeof accounts>();
                            
                            accounts.forEach(account => {
                                const accLoginId = account.loginId || (currentLoginId as Id<"logins"> | null);
                                if (!accLoginId) return; // Skip if no loginId available
                                if (!accountsByLogin.has(accLoginId)) {
                                    accountsByLogin.set(accLoginId, []);
                                }
                                accountsByLogin.get(accLoginId)!.push(account);
                            });
                            
                            // If only one login, show accounts directly
                            if (accountsByLogin.size === 1) {
                                return accounts.map((account) => (
                                    <button
                                        key={account._id}
                                        onClick={() => handleAccountSelect(account._id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                            account._id === currentAccountId
                                                ? "bg-purple-500/20 border border-purple-500/30"
                                                : "hover:bg-theme-tertiary"
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                            {getInitials(account.name)}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-theme-primary truncate">
                                                    {account.name}
                                                </span>
                                                {account.isDefault && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-theme-secondary truncate">
                                                {account.referralCode} • ${account.walletBalance.toFixed(2)}
                                            </div>
                                        </div>
                                        {account._id === currentAccountId && (
                                            <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        )}
                                    </button>
                                ));
                            }
                            
                            // Multiple logins - show grouped
                            return Array.from(accountsByLogin.entries()).map(([loginId, loginAccounts]) => (
                                <div key={loginId}>
                                    {accountsByLogin.size > 1 && (
                                        <div className="px-3 py-1.5 text-xs font-medium text-theme-secondary/70 mb-1">
                                            {loginId === currentLoginId ? "Current Login" : "Other Login"}
                                        </div>
                                    )}
                                    {loginAccounts.map((account) => (
                                        <button
                                            key={account._id}
                                            onClick={() => handleAccountSelect(account._id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                                account._id === currentAccountId
                                                    ? "bg-purple-500/20 border border-purple-500/30"
                                                    : "hover:bg-theme-tertiary"
                                            }`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                                {getInitials(account.name)}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-theme-primary truncate">
                                                        {account.name}
                                                    </span>
                                                    {account.isDefault && (
                                                        <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-theme-secondary truncate">
                                                    {account.referralCode} • ${account.walletBalance.toFixed(2)}
                                                </div>
                                            </div>
                                            {account._id === currentAccountId && (
                                                <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ));
                        })()}

                        <div className="border-t border-theme-primary/20 my-2" />

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onAddAccount?.();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-theme-tertiary transition-colors text-theme-primary"
                        >
                            <div className="w-10 h-10 rounded-full bg-theme-tertiary border-2 border-dashed border-theme-secondary flex items-center justify-center flex-shrink-0">
                                <Plus className="w-5 h-5 text-theme-secondary" />
                            </div>
                            <span className="text-sm font-medium">Add Account</span>
                        </button>

                        {onLogout && (
                            <>
                                <div className="border-t border-theme-primary/20 my-2" />
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        onLogout();
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-colors text-red-400"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm font-medium">Sign Out</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

