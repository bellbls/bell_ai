import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Withdrawal Security Enhancements
 * Additional security checks for withdrawal requests
 */

/**
 * Check if user can withdraw (email verification, etc.)
 */
export const canUserWithdraw = query({
    args: {
        userId: v.id("users"),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            return {
                allowed: false,
                reason: "User not found",
            };
        }

        // Check email verification
        if (!user.emailVerified) {
            return {
                allowed: false,
                reason: "Please verify your email before making withdrawals",
                requiresEmailVerification: true,
            };
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > Date.now()) {
            return {
                allowed: false,
                reason: "Account is temporarily locked. Please contact support.",
            };
        }

        // Check minimum balance
        if (user.walletBalance < args.amount) {
            return {
                allowed: false,
                reason: "Insufficient balance",
            };
        }

        // Check for suspicious activity (multiple failed logins recently)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recentFailedLogins = await ctx.db
            .query("security_audit_log")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("action"), "login"),
                    q.eq(q.field("status"), "failed"),
                    q.gte(q.field("timestamp"), oneDayAgo)
                )
            )
            .collect();

        if (recentFailedLogins.length >= 3) {
            return {
                allowed: false,
                reason: "Suspicious activity detected. Please contact support.",
                requiresManualReview: true,
            };
        }

        // Check withdrawal rate limit (10 per day)
        const recentWithdrawals = await ctx.db
            .query("security_audit_log")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("action"), "withdrawal"),
                    q.gte(q.field("timestamp"), oneDayAgo)
                )
            )
            .collect();

        if (recentWithdrawals.length >= 10) {
            return {
                allowed: false,
                reason: "Daily withdrawal limit reached. Please try again tomorrow.",
            };
        }

        // Large withdrawal check (require 2FA in future)
        if (args.amount > 1000) {
            // For now, just flag it
            // In future: check if 2FA is enabled and verified
            return {
                allowed: true,
                requiresTwoFactor: true,
                warning: "Large withdrawal detected. 2FA recommended.",
            };
        }

        return {
            allowed: true,
        };
    },
});

/**
 * Log withdrawal attempt
 */
export const logWithdrawal = mutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
        walletAddress: v.string(),
        status: v.union(v.literal("success"), v.literal("failed")),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("security_audit_log", {
            userId: args.userId,
            action: "withdrawal",
            status: args.status,
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            metadata: {
                amount: args.amount,
                walletAddress: args.walletAddress,
                reason: args.reason,
            },
            timestamp: Date.now(),
        });
    },
});

/**
 * Detect fraud patterns
 */
export const detectFraudPatterns = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            return { isSuspicious: false };
        }

        const suspiciousIndicators: string[] = [];

        // Check 1: Account age (new accounts are riskier)
        const accountAge = Date.now() - user.createdAt;
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (accountAge < oneDayMs) {
            suspiciousIndicators.push("Account less than 24 hours old");
        }

        // Check 2: Email not verified
        if (!user.emailVerified) {
            suspiciousIndicators.push("Email not verified");
        }

        // Check 3: Multiple failed login attempts
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const failedLogins = await ctx.db
            .query("security_audit_log")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("action"), "login"),
                    q.eq(q.field("status"), "failed"),
                    q.gte(q.field("timestamp"), oneWeekAgo)
                )
            )
            .collect();

        if (failedLogins.length >= 5) {
            suspiciousIndicators.push(`${failedLogins.length} failed login attempts in past week`);
        }

        // Check 4: Rapid withdrawal attempts
        const recentWithdrawals = await ctx.db
            .query("security_audit_log")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("action"), "withdrawal"),
                    q.gte(q.field("timestamp"), oneWeekAgo)
                )
            )
            .collect();

        if (recentWithdrawals.length >= 5) {
            suspiciousIndicators.push(`${recentWithdrawals.length} withdrawal attempts in past week`);
        }

        // Check 5: Login from multiple IPs
        const recentLogins = await ctx.db
            .query("security_audit_log")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("action"), "login"),
                    q.eq(q.field("status"), "success"),
                    q.gte(q.field("timestamp"), oneWeekAgo)
                )
            )
            .collect();

        const uniqueIPs = new Set(recentLogins.map(l => l.ipAddress).filter(Boolean));
        if (uniqueIPs.size >= 3) {
            suspiciousIndicators.push(`Logins from ${uniqueIPs.size} different IP addresses`);
        }

        return {
            isSuspicious: suspiciousIndicators.length >= 2,
            indicators: suspiciousIndicators,
            riskScore: suspiciousIndicators.length,
        };
    },
});

/**
 * Get user's withdrawal history
 */
export const getWithdrawalHistory = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const withdrawals = await ctx.db
            .query("security_audit_log")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("action"), "withdrawal"))
            .order("desc")
            .take(args.limit || 50);

        return withdrawals.map(w => ({
            timestamp: w.timestamp,
            status: w.status,
            amount: w.metadata?.amount,
            walletAddress: w.metadata?.walletAddress,
            reason: w.metadata?.reason,
        }));
    },
});
