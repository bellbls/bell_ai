"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef, useState, useMemo } from "react";
import { cacheManager, CacheKey, getTTLForQuery } from "../utils/cacheManager";
import { useCache } from "../contexts/CacheContext";

/**
 * Cached version of Convex useQuery
 * 
 * This hook wraps Convex's useQuery with caching logic:
 * - Returns cached data immediately if available and fresh
 * - Uses stale-while-revalidate pattern for expired cache
 * - Only triggers actual query when cache is missing or expired
 * - Respects TTL based on query type
 * 
 * @param query - Convex query function
 * @param args - Query arguments or "skip"
 * @param options - Optional configuration
 */
export function useCachedQuery<T>(
    query: any,
    args: any,
    options?: {
        ttl?: number; // Override default TTL
        enabled?: boolean; // Skip query if false
    }
) {
    const { lastVisibilityChange } = useCache();
    const [forceRefetch, setForceRefetch] = useState(false);
    const previousVisibilityChange = useRef(lastVisibilityChange);
    
    // Extract function name from query
    // Use a ref to store a stable identifier for each query function
    const queryIdRef = useRef<WeakMap<any, string>>(new WeakMap());
    const idCounterRef = useRef(0);
    
    const functionName = useMemo(() => {
        // Early return for null/undefined
        if (!query) return "unknown";
        
        try {
            // Handle string queries
            if (typeof query === "string") {
                return query;
            }
            
            // Handle Convex API functions (e.g., api.users.getProfile)
            if (typeof query === "function") {
                // Try to get name from function (safest approach)
                try {
                    if (query.name && typeof query.name === "string" && query.name !== "anonymous") {
                        return query.name;
                    }
                } catch (e) {
                    // Accessing .name failed, continue
                }
                
                // Try to extract from string representation (with error handling)
                try {
                    let queryStr: string;
                    if (typeof query.toString === "function") {
                        queryStr = query.toString();
                    } else {
                        // Skip String() conversion which might fail
                        throw new Error("No toString method");
                    }
                    
                    // Match patterns like "api.users.getProfile" or ".getProfile"
                    const match = queryStr.match(/(?:api\.\w+\.)?(\w+)/) || queryStr.match(/\.(\w+)/);
                    if (match?.[1]) {
                        return match[1];
                    }
                } catch (e) {
                    // toString() failed, continue to fallback
                }
            }
            
            // Fallback: try to get name property (with error handling)
            if (query && typeof query === "object") {
                try {
                    if (query.name && typeof query.name === "string") {
                        return query.name;
                    }
                } catch (e) {
                    // Accessing .name failed
                }
                
                // For objects that can't be converted to string, use a stable identifier
                // Store a unique ID for each query object in a WeakMap
                if (!queryIdRef.current.has(query)) {
                    idCounterRef.current += 1;
                    queryIdRef.current.set(query, `query_${idCounterRef.current}`);
                }
                return queryIdRef.current.get(query) || "unknown";
            }
            
            // Last resort
            return "unknown";
        } catch (error) {
            // If everything fails, return a safe default
            console.warn("Failed to extract function name from query:", error);
            return "unknown";
        }
    }, [query]);

    // Generate cache key
    const cacheKey: CacheKey = useMemo(
        () => cacheManager.generateKey(functionName, args),
        [functionName, args]
    );

    // Get TTL for this query
    const ttl = options?.ttl ?? getTTLForQuery(functionName, args);

    // Check cache
    const cachedData = cacheManager.get<T>(cacheKey);
    const isFresh = cacheManager.isFresh(cacheKey);
    const isStale = cacheManager.isStale(cacheKey);

    // Determine if we should skip the query
    const shouldSkip = args === "skip" || options?.enabled === false;

    // Determine if we need to fetch
    // Fetch if: no cache, cache is stale, or force refetch
    const needsFetch = !shouldSkip && (!cachedData || isStale || forceRefetch);

    // Use Convex query - always call it (Convex requirement)
    // Pass "skip" if we don't need to fetch (cache is fresh)
    const queryResult = useQuery(
        query,
        shouldSkip || !needsFetch ? "skip" : args
    );

    // Track if we've already cached this result to prevent infinite loops
    const lastCachedResultRef = useRef<any>(null);
    
    // Update cache when new data arrives from query
    useEffect(() => {
        // Only update cache if:
        // 1. We have a result
        // 2. We're not skipping
        // 3. We need to fetch (cache is missing or stale)
        // 4. The result is different from what we last cached (prevent loops)
        if (queryResult !== undefined && !shouldSkip && needsFetch && queryResult !== lastCachedResultRef.current) {
            cacheManager.set(cacheKey, queryResult, ttl);
            lastCachedResultRef.current = queryResult;
            setForceRefetch(false); // Reset force refetch
        }
    }, [queryResult, cacheKey, ttl, shouldSkip]); // Removed needsFetch from dependencies

    // Periodically check if cache has expired and trigger refetch if needed
    useEffect(() => {
        if (shouldSkip || !cachedData) return;

        // Check every 30 seconds if cache is stale
        const interval = setInterval(() => {
            const nowStale = cacheManager.isStale(cacheKey);
            if (nowStale) {
                setForceRefetch(prev => {
                    // Only update if not already set to true (prevent unnecessary re-renders)
                    return prev ? prev : true;
                });
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [cacheKey, shouldSkip]); // Removed cachedData and forceRefetch from dependencies

    // Handle Page Visibility API - refetch stale data when user returns after 5+ minutes
    useEffect(() => {
        if (lastVisibilityChange !== previousVisibilityChange.current) {
            previousVisibilityChange.current = lastVisibilityChange;
            
            // If we just became visible and cache is stale, trigger refetch
            if (isStale && !shouldSkip && document.visibilityState === "visible") {
                setForceRefetch(true);
            }
        }
    }, [lastVisibilityChange, isStale, shouldSkip]);

    // Return strategy:
    // 1. If cache is fresh, return cached data (don't wait for query)
    // 2. If cache is stale but query hasn't returned yet, return stale cache (stale-while-revalidate)
    // 3. If query has returned, return query result (and it's been cached)
    // 4. If no cache and query is loading, return undefined (query will return data)

    if (isFresh && cachedData !== null) {
        return cachedData; // Return fresh cache immediately
    }

    if (isStale && cachedData !== null && queryResult === undefined) {
        return cachedData; // Return stale cache while fetching fresh data
    }

    // Return query result (will be undefined initially, then data)
    return queryResult;
}

/**
 * Hook to manually invalidate a specific query cache
 */
export function useInvalidateQuery() {
    const { invalidateCache } = useCache();

    return (query: any, args: any) => {
        // Extract function name with same logic as useCachedQuery
        let functionName = "unknown";
        try {
            if (typeof query === "function") {
                if (query.name && query.name !== "anonymous") {
                    functionName = query.name;
                } else {
                    try {
                        const queryStr = typeof query.toString === "function" 
                            ? query.toString() 
                            : String(query);
                        const match = queryStr.match(/(?:api\.\w+\.)?(\w+)/) || queryStr.match(/\.(\w+)/);
                        functionName = match?.[1] || "unknown";
                    } catch (e) {
                        functionName = "unknown";
                    }
                }
            } else if (query?.name) {
                try {
                    functionName = String(query.name);
                } catch (e) {
                    functionName = "unknown";
                }
            } else if (typeof query === "string") {
                functionName = query;
            } else {
                // Don't try to convert object to string, just use unknown
                functionName = "unknown";
            }
        } catch (error) {
            console.warn("Failed to extract function name for invalidation:", error);
            functionName = "unknown";
        }
        const cacheKey = cacheManager.generateKey(functionName, args);
        invalidateCache(cacheKey);
    };
}

