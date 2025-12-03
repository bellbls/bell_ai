"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { useCache } from "../contexts/CacheContext";

/**
 * Mapping of mutations to the queries they affect
 * When a mutation succeeds, we invalidate the related queries
 */
const MUTATION_TO_QUERIES: Record<string, string[]> = {
    // Staking mutations
    "createStake": ["getUserStakes", "getProfile", "getUserEarnings", "getSystemOverview"],
    "createStakingCycle": ["getConfig"],
    "updateStakingCycle": ["getConfig"],
    "deleteStakingCycle": ["getConfig"],

    // Wallet mutations
    "deposit": ["getTransactionHistory", "getProfile", "getSwappedUSDTBalance"],
    "requestWithdrawal": ["getTransactionHistory", "getProfile", "getPendingWithdrawals"],
    "approveWithdrawal": ["getPendingWithdrawals", "getTransactionHistory"],
    "rejectWithdrawal": ["getPendingWithdrawals"],

    // Presale mutations
    "purchaseNode": ["getUserOrders", "getProfile", "getConfig"],
    "updatePresaleConfig": ["getConfig"],

    // User mutations
    "updatePassword": ["getProfile"],
    "updateUser": ["getProfile", "getAllUsers"],

    // Config mutations
    "updateConfig": ["getConfig", "getSystemPauseStates"],
    "setConfig": ["getConfig", "getSystemPauseStates", "getAllConfigs"],
    "toggleStakingPause": ["getSystemPauseStates"],
    "toggleWithdrawalsPause": ["getSystemPauseStates"],
    "toggleReferralBonuses": ["getSystemPauseStates"],
    "toggle2FARequirement": ["getSystemPauseStates", "get2FARequirement"],

    // Rank mutations
    "createVRank": ["getConfig"],
    "updateVRank": ["getConfig"],
    "deleteVRank": ["getConfig"],
    "recalculateAllRanks": ["getProfile", "getRankDistribution", "getSystemOverview"],

    // BLS mutations
    "toggleBLSSystem": ["getBLSConfig"],
    "updateBLSConfig": ["getBLSConfig"],
    "swapBLSToUSDT": ["getBLSBalance", "getSwappedUSDTBalance", "getProfile"],

    // Address book mutations
    "addAddress": ["getAddresses"],
    "deleteAddress": ["getAddresses"],
    "unlockAddress": ["getAddresses"],

    // Notification mutations
    "markAsRead": ["getUserNotifications", "getUnreadCount"],
    "markAllAsRead": ["getUserNotifications", "getUnreadCount"],

    // Admin mutations
    "pauseNetwork": ["getAllNetworks", "getNetworkBalances"],
    "resumeNetwork": ["getAllNetworks", "getNetworkBalances"],
    "updateNetwork": ["getAllNetworks", "getNetwork"],
    "togglePresale": ["getConfig", "getPresaleStats"],
    "openStaking": ["getConfig", "getPresaleStats"],
    "convertAllOrders": ["getUserOrders", "getPresaleStats"],
    "initializeConfig": ["getConfig"],
};

/**
 * Get queries affected by a mutation
 */
function getAffectedQueries(mutationName: string): string[] {
    return MUTATION_TO_QUERIES[mutationName] || [];
}

/**
 * Cached version of Convex useMutation
 * 
 * This hook wraps Convex's useMutation with automatic cache invalidation:
 * - After successful mutation, automatically invalidates related query caches
 * - Uses the mutation-to-queries mapping to determine which caches to invalidate
 * - Supports custom invalidation patterns
 * 
 * @param mutation - Convex mutation function
 * @param options - Optional configuration for cache invalidation
 */
export function useCachedMutation<TArgs extends any[], TReturn>(
    mutation: any,
    options?: {
        invalidateQueries?: string[]; // Custom queries to invalidate
        invalidatePattern?: string | RegExp; // Pattern to match cache keys
        onSuccess?: (result: TReturn) => void; // Callback after success
        onError?: (error: Error) => void; // Callback after error
    }
) {
    const { invalidateByFunction, invalidatePattern } = useCache();
    const convexMutation = useMutation(mutation);

    // Extract mutation name - handle Convex API function references robustly
    let mutationName = "unknown";
    try {
        if (typeof mutation === "function") {
            mutationName = mutation.name || "unknown";
        }
        
        // If no name, try to extract from string representation
        if (mutationName === "unknown" || !mutationName) {
            const str = String(mutation || "");
            
            // Try multiple patterns to extract function name from Convex API references
            // Pattern 1: "api.configs.setConfig" -> "setConfig"
            let match = str.match(/api\.\w+\.(\w+)$/);
            if (match && match[1]) {
                mutationName = match[1];
            } else {
                // Pattern 2: ".setConfig" -> "setConfig"
                match = str.match(/\.(\w+)$/);
                if (match && match[1]) {
                    mutationName = match[1];
                } else {
                    // Pattern 3: "configs:setConfig" -> "setConfig"
                    match = str.match(/(\w+):(\w+)/);
                    if (match && match[2]) {
                        mutationName = match[2];
                    }
                }
            }
        }
        
        // Ensure it's always a string
        mutationName = String(mutationName || "unknown");
    } catch (e) {
        // If anything fails, use a safe default
        mutationName = "unknown";
    }

    const cachedMutation = useCallback(
        async (...args: TArgs): Promise<TReturn> => {
            try {
                const result = await convexMutation(...args);

                // Invalidate related caches after successful mutation
                const affectedQueries = options?.invalidateQueries || getAffectedQueries(mutationName);

                if (affectedQueries.length > 0) {
                    invalidateByFunction(affectedQueries);
                }

                // Invalidate by pattern if provided
                if (options?.invalidatePattern) {
                    invalidatePattern(options.invalidatePattern);
                }

                // Call success callback if provided
                if (options?.onSuccess) {
                    options.onSuccess(result);
                }

                return result;
            } catch (error) {
                // Call error callback if provided
                if (options?.onError) {
                    options.onError(error as Error);
                }
                throw error;
            }
        },
        [convexMutation, mutationName, invalidateByFunction, invalidatePattern, options]
    );

    return cachedMutation;
}

