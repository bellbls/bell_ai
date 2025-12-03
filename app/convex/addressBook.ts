import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { createError, ErrorCodes } from "./errors";

const LOCK_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

export const addAddress = mutation({
    args: {
        accountId: v.optional(v.id("accounts")),
        userId: v.optional(v.id("users")),  // Legacy support
        address: v.string(),
        label: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Determine which ID to use
        const targetId = args.accountId || args.userId;
        if (!targetId) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Either accountId or userId must be provided");
        }

        // 1. Validate Address (Basic length check for TRC20)
        if (args.address.length < 10) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Invalid wallet address");
        }

        // 2. Check for duplicates
        let existing = null;
        if (args.accountId) {
            existing = await ctx.db
                .query("saved_wallets")
                .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
                .filter((q) => q.eq(q.field("address"), args.address))
                .unique();
        } else if (args.userId) {
            // Legacy: check by userId
            existing = await ctx.db
                .query("saved_wallets")
                .withIndex("by_userId", (q) => q.eq("userId", args.userId))
                .filter((q) => q.eq(q.field("address"), args.address))
                .unique();
        }

        if (existing) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Address already exists in your address book");
        }

        // 3. Insert with Locked Status
        const now = Date.now();
        await ctx.db.insert("saved_wallets", {
            accountId: args.accountId || undefined,
            userId: args.userId || undefined,  // Keep for backward compatibility
            address: args.address,
            label: args.label || "My Wallet",
            status: "locked",
            createdAt: now,
            unlockedAt: now + LOCK_PERIOD_MS,
        });
    },
});

export const getAddresses = query({
    args: { 
        accountId: v.optional(v.id("accounts")),
        userId: v.optional(v.id("users")),  // Legacy support
    },
    handler: async (ctx, args) => {
        let addresses = [];
        
        if (args.accountId) {
            addresses = await ctx.db
                .query("saved_wallets")
                .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
                .collect();
        } else if (args.userId) {
            // Legacy: query by userId
            addresses = await ctx.db
                .query("saved_wallets")
                .withIndex("by_userId", (q) => q.eq("userId", args.userId))
                .collect();
        }

        // Lazy update: Check if any locked addresses should be unlocked
        // Note: Queries cannot mutate data, so we just return the computed status for UI
        // The actual mutation happens during withdrawal or a separate cron/mutation if needed.
        // However, for strict security, the withdrawal mutation MUST check the time, not just the status field.

        const now = Date.now();
        return addresses.map(addr => ({
            ...addr,
            isReady: addr.status === "active" || (addr.status === "locked" && now >= addr.unlockedAt)
        }));
    },
});

export const deleteAddress = mutation({
    args: {
        id: v.id("saved_wallets"),
        accountId: v.optional(v.id("accounts")),
        userId: v.optional(v.id("users")),  // Legacy support
    },
    handler: async (ctx, args) => {
        const address = await ctx.db.get(args.id);
        if (!address) {
            throw createError(ErrorCodes.UNAUTHORIZED, "Address not found");
        }
        
        // Check ownership by accountId or userId
        const isOwner = (args.accountId && address.accountId === args.accountId) || 
                       (args.userId && address.userId === args.userId);
        
        if (!isOwner) {
            throw createError(ErrorCodes.UNAUTHORIZED, "Address not found or unauthorized");
        }
        
        await ctx.db.delete(args.id);
    },
});
