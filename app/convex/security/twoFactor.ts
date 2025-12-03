/**
 * Two-Factor Authentication (2FA) Utilities
 * Handles 2FA requirement checking and grace period logic
 * 
 * Note: TOTP generation and verification have been moved to twoFactorActions.ts
 * (which uses "use node" directive) since they require Node.js APIs (speakeasy, qrcode)
 */

const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

/**
 * Check if user needs to set up 2FA based on grace period logic
 * Returns object with requirement status and grace period info
 */
export function check2FARequirement(
    user: {
        createdAt: number;
        twoFactorEnabled?: boolean;
        twoFactorRequiredAt?: number;
    },
    globalRequirement: boolean,
    requirementEnabledAt: number | null
): {
    requires2FA: boolean;
    isWithinGracePeriod: boolean;
    daysRemaining?: number;
    isFirstLogin?: boolean;
    mustSetupNow: boolean;
} {
    // If 2FA is not required globally, no need to check
    if (!globalRequirement) {
        return {
            requires2FA: false,
            isWithinGracePeriod: false,
            mustSetupNow: false,
        };
    }

    // If user already has 2FA enabled, they need to use it
    if (user.twoFactorEnabled) {
        return {
            requires2FA: true,
            isWithinGracePeriod: false,
            mustSetupNow: false,
        };
    }

    // If requirement was never enabled, no need
    if (!requirementEnabledAt) {
        return {
            requires2FA: false,
            isWithinGracePeriod: false,
            mustSetupNow: false,
        };
    }

    // Check if user existed before requirement was enabled
    const userExistedBefore = user.createdAt < requirementEnabledAt;
    
    // Check if this is first login (no lastLoginAt means first login)
    const isFirstLogin = !user.twoFactorRequiredAt;

    if (userExistedBefore) {
        // Existing user - check grace period
        const gracePeriodEnd = requirementEnabledAt + GRACE_PERIOD_MS;
        const now = Date.now();
        const isWithinGracePeriod = now < gracePeriodEnd;
        const daysRemaining = isWithinGracePeriod 
            ? Math.ceil((gracePeriodEnd - now) / (24 * 60 * 60 * 1000))
            : 0;

        return {
            requires2FA: !isWithinGracePeriod, // Require 2FA if grace period expired
            isWithinGracePeriod,
            daysRemaining: isWithinGracePeriod ? daysRemaining : undefined,
            mustSetupNow: !isWithinGracePeriod,
        };
    } else {
        // New user (registered after requirement was enabled)
        // Check if they've had their first login
        if (isFirstLogin) {
            // First login - allow without 2FA, but prompt for setup
            return {
                requires2FA: false,
                isWithinGracePeriod: true, // Treat as grace period for UX
                daysRemaining: 30, // Give 30 days from first login
                isFirstLogin: true,
                mustSetupNow: false,
            };
        } else {
            // Not first login - check 30 days from when they were required to set up
            const requiredAt = user.twoFactorRequiredAt || user.createdAt;
            const gracePeriodEnd = requiredAt + GRACE_PERIOD_MS;
            const now = Date.now();
            const isWithinGracePeriod = now < gracePeriodEnd;
            const daysRemaining = isWithinGracePeriod 
                ? Math.ceil((gracePeriodEnd - now) / (24 * 60 * 60 * 1000))
                : 0;

            return {
                requires2FA: !isWithinGracePeriod,
                isWithinGracePeriod,
                daysRemaining: isWithinGracePeriod ? daysRemaining : undefined,
                mustSetupNow: !isWithinGracePeriod,
            };
        }
    }
}

