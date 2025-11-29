import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { createError, ErrorCodes } from "./errors";

const LOCK_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

export const addAddress = mutation({
    args: {
        userId: v.id("users"),
        address: v.string(),
        label: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // 1. Validate Address (Basic length check for TRC20)
        if (args.address.length < 10) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Invalid wallet address");
        }

        // 2. Check for duplicates
        const existing = await ctx.db
            .query("saved_wallets")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("address"), args.address))
            .unique();

        if (existing) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "Address already exists in your address book");
        }

        // 3. Insert with Locked Status
        const now = Date.now();
        await ctx.db.insert("saved_wallets", {
            userId: args.userId,
            address: args.address,
            label: args.label || "My Wallet",
            status: "locked",
            createdAt: now,
            unlockedAt: now + LOCK_PERIOD_MS,
        });
    },
});

export const getAddresses = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const addresses = await ctx.db
            .query("saved_wallets")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();

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
        userId: v.id("users"), // Pass userId to ensure ownership
    },
    handler: async (ctx, args) => {
        const address = await ctx.db.get(args.id);
        if (!address || address.userId !== args.userId) {
            throw createError(ErrorCodes.UNAUTHORIZED, "Address not found or unauthorized");
        }
        await ctx.db.delete(args.id);
    },
});
