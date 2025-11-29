import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Admin Alerts API
 * Manages system alerts and notifications for administrators
 */

/**
 * Create an admin alert
 */
export const createAlert = mutation({
    args: {
        type: v.union(
            v.literal("low_balance"),
            v.literal("deposit_paused"),
            v.literal("withdrawal_failed"),
            v.literal("network_error"),
            v.literal("sync_error")
        ),
        network: v.optional(v.string()),
        severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
        title: v.string(),
        message: v.string(),
        data: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const alertId = await ctx.db.insert("admin_alerts", {
            type: args.type,
            network: args.network,
            severity: args.severity,
            title: args.title,
            message: args.message,
            data: args.data,
            isRead: false,
            createdAt: Date.now(),
        });

        return { success: true, alertId };
    },
});

/**
 * Get all alerts
 */
export const getAllAlerts = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;
        return await ctx.db
            .query("admin_alerts")
            .withIndex("by_createdAt")
            .order("desc")
            .take(limit);
    },
});

/**
 * Get unread alerts
 */
export const getUnreadAlerts = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("admin_alerts")
            .withIndex("by_isRead", (q) => q.eq("isRead", false))
            .order("desc")
            .take(100); // Limit to 100 unread alerts for display
    },
});

/**
 * Get unread alerts count
 */
export const getUnreadAlertsCount = query({
    args: {},
    handler: async (ctx) => {
        const alerts = await ctx.db
            .query("admin_alerts")
            .withIndex("by_isRead", (q) => q.eq("isRead", false))
            .take(1000); // Cap count at 1000 to prevent overflow

        return alerts.length;
    },
});

/**
 * Get alerts by severity
 */
export const getAlertsBySeverity = query({
    args: {
        severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("admin_alerts")
            .withIndex("by_severity", (q) => q.eq("severity", args.severity))
            .order("desc")
            .collect();
    },
});

/**
 * Get alerts by network
 */
export const getAlertsByNetwork = query({
    args: {
        network: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("admin_alerts")
            .withIndex("by_network", (q) => q.eq("network", args.network))
            .order("desc")
            .collect();
    },
});

/**
 * Mark alert as read
 */
export const markAlertAsRead = mutation({
    args: {
        alertId: v.id("admin_alerts"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.alertId, {
            isRead: true,
            readAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Mark all alerts as read
 */
export const markAllAlertsAsRead = mutation({
    args: {},
    handler: async (ctx) => {
        const unreadAlerts = await ctx.db
            .query("admin_alerts")
            .withIndex("by_isRead", (q) => q.eq("isRead", false))
            .collect();

        for (const alert of unreadAlerts) {
            await ctx.db.patch(alert._id, {
                isRead: true,
                readAt: Date.now(),
            });
        }

        return { success: true, count: unreadAlerts.length };
    },
});

/**
 * Delete alert
 */
export const deleteAlert = mutation({
    args: {
        alertId: v.id("admin_alerts"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.alertId);
        return { success: true };
    },
});

/**
 * Delete old alerts (older than specified days)
 */
export const deleteOldAlerts = mutation({
    args: {
        daysOld: v.number(),
    },
    handler: async (ctx, args) => {
        const cutoffTime = Date.now() - (args.daysOld * 24 * 60 * 60 * 1000);

        const oldAlerts = await ctx.db
            .query("admin_alerts")
            .withIndex("by_createdAt")
            .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
            .collect();

        for (const alert of oldAlerts) {
            await ctx.db.delete(alert._id);
        }

        return { success: true, count: oldAlerts.length };
    },
});

/**
 * Get alert statistics
 */
export const getAlertStats = query({
    args: {},
    handler: async (ctx) => {
        // Limit stats to recent 1000 alerts to prevent performance issues
        const allAlerts = await ctx.db
            .query("admin_alerts")
            .order("desc")
            .take(1000);

        const stats = {
            total: allAlerts.length,
            unread: allAlerts.filter(a => !a.isRead).length,
            critical: allAlerts.filter(a => a.severity === "critical").length,
            warning: allAlerts.filter(a => a.severity === "warning").length,
            info: allAlerts.filter(a => a.severity === "info").length,
            byType: {
                low_balance: allAlerts.filter(a => a.type === "low_balance").length,
                deposit_paused: allAlerts.filter(a => a.type === "deposit_paused").length,
                withdrawal_failed: allAlerts.filter(a => a.type === "withdrawal_failed").length,
                network_error: allAlerts.filter(a => a.type === "network_error").length,
                sync_error: allAlerts.filter(a => a.type === "sync_error").length,
            },
        };

        return stats;
    },
});
