"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Id } from "../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

interface Account {
    _id: Id<"accounts">;
    name: string;
    referralCode: string;
    walletBalance: number;
    blsBalance: number;
    currentRank: string;
    isDefault: boolean;
    createdAt: number;
    isOwner?: boolean;
    loginId?: Id<"logins">; // Include loginId for grouping
}

interface AccountContextType {
    currentAccountId: Id<"accounts"> | null;
    accounts: Account[];
    isLoading: boolean;
    switchAccount: (accountId: Id<"accounts">) => void;
    refreshAccounts: () => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ 
    children, 
    loginId 
}: { 
    children: ReactNode; 
    loginId: Id<"logins"> | null;
}) {
    const [currentAccountId, setCurrentAccountId] = useState<Id<"accounts"> | null>(null);
    
    // Get all loginIds the user has logged into
    const [allLoginIds, setAllLoginIds] = useState<Id<"logins">[]>([]);
    
    useEffect(() => {
        if (typeof window === "undefined") return; // SSR safety
        
        const stored = localStorage.getItem("allLoginIds");
        if (stored) {
            try {
                const loginIds = JSON.parse(stored) as Id<"logins">[];
                // Ensure current loginId is included
                if (loginId && !loginIds.includes(loginId)) {
                    loginIds.push(loginId);
                    localStorage.setItem("allLoginIds", JSON.stringify(loginIds));
                }
                setAllLoginIds(loginIds);
            } catch (e) {
                // If parsing fails, just use current loginId
                if (loginId) {
                    setAllLoginIds([loginId]);
                }
            }
        } else if (loginId) {
            // If no stored list, start with current loginId
            setAllLoginIds([loginId]);
        }
    }, [loginId]);
    
    // Fetch accounts for all logins the user has accessed
    const allAccountsData = useQuery(
        api.accounts.getAccountsForMultipleLogins,
        allLoginIds.length > 0 ? { loginIds: allLoginIds } : "skip"
    );
    
    // Fallback to single login query if multi-login query fails or returns nothing
    const singleLoginAccountsData = useQuery(
        api.accounts.getAccessibleAccounts,
        loginId && (!allAccountsData || allAccountsData.length === 0) ? { loginId } : "skip"
    );
    
    const accounts = (allAccountsData || singleLoginAccountsData || []) as Account[];

    // Load current account from localStorage on mount
    useEffect(() => {
        if (loginId) {
            const stored = localStorage.getItem(`currentAccountId_${loginId}`);
            if (stored) {
                setCurrentAccountId(stored as Id<"accounts">);
            } else if (accounts.length > 0) {
                // Set default account if none selected
                const defaultAccount = accounts.find(acc => acc.isDefault) || accounts[0];
                if (defaultAccount) {
                    setCurrentAccountId(defaultAccount._id);
                    localStorage.setItem(`currentAccountId_${loginId}`, defaultAccount._id);
                }
            }
        }
    }, [loginId, accounts]);

    const switchAccount = (accountId: Id<"accounts">) => {
        setCurrentAccountId(accountId);
        if (loginId) {
            localStorage.setItem(`currentAccountId_${loginId}`, accountId);
            // Don't reload - let React handle the update
            // The queries will automatically refetch with the new accountId
        }
    };

    const refreshAccounts = () => {
        // Force refetch by updating a dependency
        // The useQuery will automatically refetch
    };

    return (
        <AccountContext.Provider
            value={{
                currentAccountId,
                accounts: accounts as Account[],
                isLoading: accounts === undefined,
                switchAccount,
                refreshAccounts,
            }}
        >
            {children}
        </AccountContext.Provider>
    );
}

export function useAccount() {
    const context = useContext(AccountContext);
    if (context === undefined) {
        throw new Error("useAccount must be used within an AccountProvider");
    }
    return context;
}

