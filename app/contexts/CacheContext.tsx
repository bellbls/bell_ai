"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { cacheManager, CacheKey } from "../utils/cacheManager";

interface CacheContextType {
    invalidateCache: (key: CacheKey) => void;
    invalidatePattern: (pattern: string | RegExp) => void;
    invalidateByFunction: (functionNames: string[]) => void;
    clearCache: () => void;
    getCacheStats: () => ReturnType<typeof cacheManager.getStats>;
    // For Page Visibility API
    lastVisibilityChange: number;
    setLastVisibilityChange: (timestamp: number) => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export function CacheProvider({ children }: { children: ReactNode }) {
    const [lastVisibilityChange, setLastVisibilityChange] = useState(Date.now());

    const invalidateCache = useCallback((key: CacheKey) => {
        cacheManager.invalidate(key);
    }, []);

    const invalidatePattern = useCallback((pattern: string | RegExp) => {
        cacheManager.invalidatePattern(pattern);
    }, []);

    const invalidateByFunction = useCallback((functionNames: string[]) => {
        cacheManager.invalidateByFunction(functionNames);
    }, []);

    const clearCache = useCallback(() => {
        cacheManager.clear();
    }, []);

    const getCacheStats = useCallback(() => {
        return cacheManager.getStats();
    }, []);

    // Page Visibility API integration
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                const now = Date.now();
                const timeHidden = now - lastVisibilityChange;
                
                // If tab was hidden for more than 5 minutes, refresh stale cache
                if (timeHidden > 5 * 60 * 1000) {
                    // Invalidate all stale entries to trigger refetch
                    // This will be handled by useCachedQuery
                    setLastVisibilityChange(now);
                }
            } else if (document.visibilityState === "hidden") {
                setLastVisibilityChange(Date.now());
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [lastVisibilityChange]);

    return (
        <CacheContext.Provider
            value={{
                invalidateCache,
                invalidatePattern,
                invalidateByFunction,
                clearCache,
                getCacheStats,
                lastVisibilityChange,
                setLastVisibilityChange,
            }}
        >
            {children}
        </CacheContext.Provider>
    );
}

export function useCache() {
    const context = useContext(CacheContext);
    if (context === undefined) {
        throw new Error("useCache must be used within a CacheProvider");
    }
    return context;
}


