import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Rate Limiter for Security
 * Prevents brute force attacks and abuse
 */

interface RateLimitConfig {
    maxAttempts: number;
    windowMs: number;  // Time window in milliseconds
    lockoutMs?: number;  // How long to lock account after max attempts
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
    login: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,  // 15 minutes
        lockoutMs: 30 * 60 * 1000,  // 30 minutes lockout
    },
    registration: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000,  // 1 hour
    },
    passwordReset: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000,  // 1 hour
    },
    withdrawal: {
        maxAttempts: 10,
        windowMs: 24 * 60 * 60 * 1000,  // 24 hours
    },
};

/**
 * Check if user has exceeded rate limit
 */
export const checkRateLimit = query({
    args: {
        userId: v.optional(v.id("users")),
        email: v.optional(v.string()),
        action: v.string(),
    },
    handler: async (ctx, args) => {
        const config = RATE_LIMITS[args.action];
        if (!config) {
            return { allowed: true };
        }

        const now = Date.now();
        const windowStart = now - config.windowMs;

        // If userId provided, check user-specific rate limit
        if (args.userId) {
            const user = await ctx.db.get(args.userId);
            if (!user) {
                return { allowed: false, reason: "User not found" };
            }

            // Check if account is locked
            if (user.lockedUntil && user.lockedUntil > now) {
                const minutesLeft = Math.ceil((user.lockedUntil - now) / 60000);
                return {
                    allowed: false,
                    reason: `Account locked. Try again in ${minutesLeft} minutes.`,
                    lockedUntil: user.lockedUntil,
                };
            }

            // Check login attempts for login action
            if (args.action === "login" && user.loginAttempts) {
                if (user.loginAttempts >= config.maxAttempts) {
                    return {
                        allowed: false,
                        reason: "Too many failed login attempts. Please try again later.",
                    };
                }
            }
        }

        // Check audit log for action-based rate limiting
        const recentAttempts = await ctx.db
            .query("security_audit_log")
            .withIndex("by_timestamp", (q) => q.gte("timestamp", windowStart))
            .filter((q) => {
                let filter = q.eq(q.field("action"), args.action);
                if (args.userId) {
                    filter = q.and(filter, q.eq(q.field("userId"), args.userId));
                }
                return filter;
            })
            .collect();

        if (recentAttempts.length >= config.maxAttempts) {
            return {
                allowed: false,
                reason: `Too many ${args.action} attempts. Please try again later.`,
                attemptsRemaining: 0,
            };
        }

        return {
            allowed: true,
            attemptsRemaining: config.maxAttempts - recentAttempts.length,
        };
    },
});

/**
 * Record failed login attempt and lock account if needed
 */
export const recordFailedLogin = mutation({
    args: {
        userId: v.id("users"),
        ipAddress: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return;

        const config = RATE_LIMITS.login;
        const newAttempts = (user.loginAttempts || 0) + 1;

        // Lock account if max attempts reached
        if (newAttempts >= config.maxAttempts && config.lockoutMs) {
            await ctx.db.patch(args.userId, {
                loginAttempts: newAttempts,
                lockedUntil: Date.now() + config.lockoutMs,
            });

            // Log security event
            await ctx.db.insert("security_audit_log", {
                userId: args.userId,
                action: "account_locked",
                status: "success",
                ipAddress: args.ipAddress,
                metadata: {
                    reason: "Too many failed login attempts",
                    attempts: newAttempts,
                },
                timestamp: Date.now(),
            });
        } else {
            await ctx.db.patch(args.userId, {
                loginAttempts: newAttempts,
            });
        }
    },
});

/**
 * Reset login attempts on successful login
 */
export const resetLoginAttempts = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            loginAttempts: 0,
            lockedUntil: undefined,
        });
    },
});

/**
 * Log security audit event
 */
export const logSecurityEvent = mutation({
    args: {
        userId: v.optional(v.id("users")),
        action: v.string(),
        status: v.union(v.literal("success"), v.literal("failed")),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("security_audit_log", {
            userId: args.userId,
            action: args.action,
            status: args.status,
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            metadata: args.metadata,
            timestamp: Date.now(),
        });
    },
});

/**
 * Get security audit logs (admin only)
 */
export const getAuditLogs = query({
    args: {
        userId: v.optional(v.id("users")),
        action: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let query = ctx.db.query("security_audit_log");

        if (args.userId) {
            query = query.withIndex("by_userId", (q) => q.eq("userId", args.userId));
        } else if (args.action) {
            query = query.withIndex("by_action", (q) => q.eq("action", args.action));
        } else {
            query = query.withIndex("by_timestamp");
        }

        const logs = await query
            .order("desc")
            .take(args.limit || 100);

        return logs;
    },
});
