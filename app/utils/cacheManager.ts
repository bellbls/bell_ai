/**
 * Cache Manager
 * Centralized cache management with TTL support, cache keys, and invalidation
 */

export interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    ttl: number;
    stale: boolean;
}

export type CacheKey = string;

class CacheManager {
    private cache: Map<CacheKey, CacheEntry> = new Map();
    private maxSize: number = 1000; // Maximum number of cache entries
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Start cleanup interval to remove expired entries
        this.startCleanup();
    }

    /**
     * Generate cache key from function name and arguments
     */
    generateKey(functionName: string, args: any): CacheKey {
        // Ensure functionName is always a string
        const funcName = typeof functionName === "string" ? functionName : String(functionName || "unknown");
        const argsStr = args === "skip" ? "skip" : JSON.stringify(args);
        return `query:${funcName}:${argsStr}`;
    }

    /**
     * Get cached data if available and not expired
     */
    get<T>(key: CacheKey): T | null {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }

        const now = Date.now();
        const age = now - entry.timestamp;
        const isExpired = age >= entry.ttl;

        if (isExpired) {
            // Mark as stale but keep for stale-while-revalidate
            entry.stale = true;
            return entry.data; // Return stale data while fetching fresh
        }

        return entry.data;
    }

    /**
     * Check if cache entry exists and is fresh (not expired)
     */
    isFresh(key: CacheKey): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        const now = Date.now();
        const age = now - entry.timestamp;
        return age < entry.ttl && !entry.stale;
    }

    /**
     * Check if cache entry exists but is stale (expired)
     */
    isStale(key: CacheKey): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        const now = Date.now();
        const age = now - entry.timestamp;
        return age >= entry.ttl || entry.stale;
    }

    /**
     * Set cache entry with TTL
     */
    set<T>(key: CacheKey, data: T, ttl: number): void {
        // Enforce max size - remove oldest entries if needed
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
            stale: false,
        });
    }

    /**
     * Invalidate specific cache entry
     */
    invalidate(key: CacheKey): void {
        this.cache.delete(key);
    }

    /**
     * Invalidate all cache entries matching a pattern
     * Useful for invalidating related queries (e.g., all userProfile queries)
     */
    invalidatePattern(pattern: string | RegExp): void {
        const regex = typeof pattern === "string" 
            ? new RegExp(pattern.replace(/\*/g, ".*")) 
            : pattern;

        const keysToDelete: CacheKey[] = [];
        
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Invalidate multiple cache entries by function name
     * Useful when a mutation affects multiple queries
     */
    invalidateByFunction(functionNames: string[]): void {
        const keysToDelete: CacheKey[] = [];
        
        for (const key of this.cache.keys()) {
            for (const funcName of functionNames) {
                if (key.startsWith(`query:${funcName}:`)) {
                    keysToDelete.push(key);
                    break;
                }
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const entries = Array.from(this.cache.values());
        const now = Date.now();
        
        return {
            totalEntries: this.cache.size,
            freshEntries: entries.filter(e => {
                const age = now - e.timestamp;
                return age < e.ttl && !e.stale;
            }).length,
            staleEntries: entries.filter(e => {
                const age = now - e.timestamp;
                return age >= e.ttl || e.stale;
            }).length,
        };
    }

    /**
     * Remove oldest cache entries (FIFO)
     */
    private evictOldest(): void {
        if (this.cache.size === 0) return;

        // Find oldest entry
        let oldestKey: CacheKey | null = null;
        let oldestTimestamp = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Cleanup expired entries periodically
     */
    private startCleanup(): void {
        // Cleanup every 5 minutes
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            const keysToDelete: CacheKey[] = [];

            for (const [key, entry] of this.cache.entries()) {
                const age = now - entry.timestamp;
                // Remove entries that are expired by more than 1 hour (keep stale for revalidation)
                if (age >= entry.ttl + 3600000) {
                    keysToDelete.push(key);
                }
            }

            keysToDelete.forEach(key => this.cache.delete(key));
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Stop cleanup interval (for testing or cleanup)
     */
    stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

// Singleton instance
export const cacheManager = new CacheManager();

/**
 * TTL Constants (in milliseconds)
 */
export const TTL = {
    SHORT: 30 * 1000,        // 30 seconds - real-time balances, transactions
    MEDIUM_SHORT: 2 * 60 * 1000,  // 2 minutes - recent activities, pause states
    MEDIUM: 5 * 60 * 1000,   // 5 minutes - user profile, stakes, earnings
    MEDIUM_LONG: 10 * 60 * 1000,  // 10 minutes - presale orders, network status
    LONG: 15 * 60 * 1000,    // 15 minutes - configs, rank rules
    VERY_LONG: 30 * 60 * 1000,    // 30 minutes - system overview, all users
    STATIC: 60 * 60 * 1000,  // 1 hour - static configs, historical data
} as const;

/**
 * Get TTL for a specific query type
 */
export function getTTLForQuery(functionName: string, args?: any): number {
    // Real-time data - short TTL
    if (functionName.includes("getTransactionHistory") || 
        functionName.includes("getBLSBalance") ||
        functionName.includes("getSwappedUSDTBalance")) {
        return TTL.SHORT;
    }

    // Recent activities, pause states
    if (functionName.includes("getRecentActivities") ||
        functionName.includes("getSystemPauseStates")) {
        return TTL.MEDIUM_SHORT;
    }

    // User-specific data - medium TTL
    if (functionName.includes("getProfile") ||
        functionName.includes("getUserStakes") ||
        functionName.includes("getUserEarnings") ||
        functionName.includes("getUserOrders")) {
        return TTL.MEDIUM;
    }

    // Network status, presale
    if (functionName.includes("getAllNetworks") ||
        functionName.includes("getNetworkBalances") ||
        functionName.includes("getConfig") && args?.key === "presale") {
        return TTL.MEDIUM_LONG;
    }

    // Configs, rank rules
    if (functionName.includes("getConfig") ||
        functionName.includes("getBLSConfig") ||
        functionName.includes("getRankDistribution")) {
        return TTL.LONG;
    }

    // Admin overview, all users
    if (functionName.includes("getSystemOverview") ||
        functionName.includes("getAllUsers") ||
        functionName.includes("getStakingAnalytics")) {
        return TTL.VERY_LONG;
    }

    // Historical data, static configs
    if (functionName.includes("getRevenueTrends") ||
        functionName.includes("getUserGrowth") ||
        functionName.includes("getCronLogs")) {
        return TTL.STATIC;
    }

    // Default to medium TTL
    return TTL.MEDIUM;
}

