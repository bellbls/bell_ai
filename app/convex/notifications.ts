import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new notification
export const createNotification = mutation({
    args: {
        userId: v.id("users"),
        type: v.union(
            v.literal("earnings"),
            v.literal("commission"),
            v.literal("referral"),
            v.literal("rank"),
            v.literal("stake"),
            v.literal("withdrawal"),
            v.literal("system")
        ),
        title: v.string(),
        message: v.string(),
        data: v.optional(v.any()),
        icon: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("notifications", {
            userId: args.userId,
            type: args.type,
            title: args.title,
            message: args.message,
            data: args.data,
            read: false,
            createdAt: Date.now(),
            icon: args.icon,
        });
    },
});

// Get user's notifications (paginated)
export const getUserNotifications = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
        type: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;

        let notifications = await ctx.db
            .query("notifications")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .order("desc")
            .take(limit);

        // Filter by type if specified
        if (args.type && args.type !== "all") {
            notifications = notifications.filter(n => n.type === args.type);
        }

        return notifications;
    },
});

// Get unread count
export const getUnreadCount = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_userId_read", (q) =>
                q.eq("userId", args.userId).eq("read", false)
            )
            .collect();

        return unreadNotifications.length;
    },
});

// Mark notification as read
export const markAsRead = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.notificationId, { read: true });
    },
});

// Mark all as read
export const markAllAsRead = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_userId_read", (q) =>
                q.eq("userId", args.userId).eq("read", false)
            )
            .collect();

        for (const notification of unreadNotifications) {
            await ctx.db.patch(notification._id, { read: true });
        }
    },
});

// Delete notification
export const deleteNotification = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.notificationId);
    },
});

// Helper function to create notification (can be called from other mutations)
export const notify = async (
    ctx: any,
    id: Id<"accounts"> | Id<"users">,
    idType: "account" | "user",
    type: string,
    title: string,
    message: string,
    icon: string,
    data?: any
) => {
    await ctx.db.insert("notifications", {
        accountId: idType === "account" ? (id as Id<"accounts">) : undefined,
        userId: idType === "user" ? (id as Id<"users">) : undefined,
        type,
        title,
        message,
        data,
        read: false,
        createdAt: Date.now(),
        icon,
    });
};