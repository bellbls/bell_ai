"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Normalizes a number to prevent negative zero display (-0.00 -> 0.00)
 */
function normalizeZero(value: number): number {
    // Convert -0 to 0 to prevent displaying "-0.00"
    return value === 0 || Object.is(value, -0) ? 0 : value;
}

/**
 * Formats a number to 2 decimal places, ensuring -0.00 displays as 0.00
 */
export function formatAmount(value: number): string {
    const normalized = normalizeZero(value);
    return normalized.toFixed(2);
}

/**
 * Formats an amount based on BLS system status
 * Shows both USDT and BLS when BLS is enabled
 * Shows only USDT when BLS is disabled
 */
export function formatAmountWithBLS(amount: number, blsConfig: any): string {
    if (!blsConfig?.isEnabled) {
        return `$${formatAmount(amount)}`;
    }
    
    const blsAmount = amount / (blsConfig.conversionRate || 1.0);
    return `$${formatAmount(amount)} / ${formatAmount(blsAmount)} BLS`;
}

/**
 * Formats an amount to show BLS only when BLS is enabled
 */
export function formatAmountBLSOnly(amount: number, blsConfig: any): string {
    if (!blsConfig?.isEnabled) {
        return `$${formatAmount(amount)}`;
    }
    
    const blsAmount = amount / (blsConfig.conversionRate || 1.0);
    return `${formatAmount(blsAmount)} BLS`;
}

/**
 * React hook to get BLS config and format amounts
 */
export function useBLSFormatter() {
    const blsConfig = useQuery(api.bls.getBLSConfig);
    
    return {
        blsConfig,
        formatAmount: (amount: number) => formatAmountWithBLS(amount, blsConfig),
        formatAmountBLS: (amount: number) => formatAmountBLSOnly(amount, blsConfig),
        isBLSEnabled: blsConfig?.isEnabled || false,
    };
}

/**
 * Component to display amount with BLS when enabled
 */
export function AmountDisplay({ amount, className = "" }: { amount: number; className?: string }) {
    const { blsConfig, formatAmount } = useBLSFormatter();
    
    if (!blsConfig) {
        return <span className={className}>${formatAmount(amount)}</span>;
    }
    
    if (!blsConfig.isEnabled) {
        return <span className={className}>${formatAmount(amount)}</span>;
    }
    
    const blsAmount = amount / (blsConfig.conversionRate || 1.0);
    
    return (
        <span className={className}>
            <span>${formatAmount(amount)}</span>
            <span className="text-slate-400 mx-1">/</span>
            <span className="text-purple-400">{formatAmount(blsAmount)} BLS</span>
        </span>
    );
}


