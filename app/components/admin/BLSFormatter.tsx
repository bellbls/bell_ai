"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Formats an amount based on BLS system status
 * Shows both USDT and BLS when BLS is enabled
 * Shows only USDT when BLS is disabled
 */
export function formatAmountWithBLS(amount: number, blsConfig: any): string {
    if (!blsConfig?.isEnabled) {
        return `$${amount.toFixed(2)}`;
    }
    
    const blsAmount = amount / (blsConfig.conversionRate || 1.0);
    return `$${amount.toFixed(2)} / ${blsAmount.toFixed(2)} BLS`;
}

/**
 * Formats an amount to show BLS only when BLS is enabled
 */
export function formatAmountBLSOnly(amount: number, blsConfig: any): string {
    if (!blsConfig?.isEnabled) {
        return `$${amount.toFixed(2)}`;
    }
    
    const blsAmount = amount / (blsConfig.conversionRate || 1.0);
    return `${blsAmount.toFixed(2)} BLS`;
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
        return <span className={className}>${amount.toFixed(2)}</span>;
    }
    
    if (!blsConfig.isEnabled) {
        return <span className={className}>${amount.toFixed(2)}</span>;
    }
    
    const blsAmount = amount / (blsConfig.conversionRate || 1.0);
    
    return (
        <span className={className}>
            <span>${amount.toFixed(2)}</span>
            <span className="text-slate-400 mx-1">/</span>
            <span className="text-purple-400">{blsAmount.toFixed(2)} BLS</span>
        </span>
    );
}


