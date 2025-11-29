import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { createError, ErrorCodes } from "./errors";

/**
 * Validates Ethereum address format
 * Must be 42 characters: 0x + 40 hex characters
 */
function isValidEthereumAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;

    // Check format: 0x followed by 40 hex characters
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethereumAddressRegex.test(address);
}

/**
 * Set or update user's deposit address
 * This address will be used to receive blockchain deposits
 */
export const setDepositAddress = mutation({
    args: {
        userId: v.id("users"),
        address: v.string(),
    },
    handler: async (ctx, args) => {
        // 1. Validate Ethereum address format
        if (!isValidEthereumAddress(args.address)) {
            throw createError(
                ErrorCodes.VALIDATION_ERROR,
                "Invalid Ethereum address format. Must be 42 characters starting with 0x"
            );
        }

        // 2. Normalize address to lowercase for consistency
        const normalizedAddress = args.address.toLowerCase();

        // 3. Check if address is already linked to another user
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_depositAddress", (q) => q.eq("depositAddress", normalizedAddress))
            .first();

        if (existingUser && existingUser._id !== args.userId) {
            throw createError(
                ErrorCodes.VALIDATION_ERROR,
                "This address is already linked to another account"
            );
        }

        // 4. Get current user
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw createError(ErrorCodes.USER_NOT_FOUND);
        }

        // 5. Update user's deposit address
        await ctx.db.patch(args.userId, {
            depositAddress: normalizedAddress,
            depositAddressLinkedAt: Date.now(),
        });

        // 6. Create notification
        await ctx.db.insert("notifications", {
            userId: args.userId,
            type: "system",
            title: "Deposit Address Linked",
            message: `Your deposit address ${normalizedAddress.substring(0, 10)}... has been successfully linked. You can now receive blockchain deposits.`,
            data: { address: normalizedAddress },
            read: false,
            createdAt: Date.now(),
            icon: "wallet",
        });

        return {
            success: true,
            address: normalizedAddress,
            message: "Deposit address linked successfully",
        };
    },
});

/**
 * Get user's deposit address
 */
export const getDepositAddress = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw createError(ErrorCodes.USER_NOT_FOUND);
        }

        return {
            address: user.depositAddress || null,
            linkedAt: user.depositAddressLinkedAt || null,
            isLinked: !!user.depositAddress,
        };
    },
});

/**
 * Check if an address is available to link
 */
export const checkAddressAvailable = query({
    args: { address: v.string() },
    handler: async (ctx, args) => {
        // Validate format first
        if (!isValidEthereumAddress(args.address)) {
            return {
                available: false,
                reason: "Invalid Ethereum address format",
            };
        }

        const normalizedAddress = args.address.toLowerCase();

        // Check if already linked
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_depositAddress", (q) => q.eq("depositAddress", normalizedAddress))
            .first();

        if (existingUser) {
            return {
                available: false,
                reason: "Address already linked to another account",
            };
        }

        return {
            available: true,
            reason: null,
        };
    },
});

/**
 * Unlink deposit address (admin only or user self-service)
 */
export const unlinkDepositAddress = mutation({
    args: {
        userId: v.id("users"),
        adminId: v.optional(v.id("users")),  // If provided, this is an admin action
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw createError(ErrorCodes.USER_NOT_FOUND);
        }

        if (!user.depositAddress) {
            throw createError(ErrorCodes.VALIDATION_ERROR, "No deposit address linked");
        }

        const oldAddress = user.depositAddress;

        // Unlink the address
        await ctx.db.patch(args.userId, {
            depositAddress: undefined,
            depositAddressLinkedAt: undefined,
        });

        // Create notification
        await ctx.db.insert("notifications", {
            userId: args.userId,
            type: "system",
            title: "Deposit Address Unlinked",
            message: `Your deposit address ${oldAddress.substring(0, 10)}... has been unlinked${args.adminId ? " by an administrator" : ""}.`,
            data: {
                address: oldAddress,
                adminId: args.adminId
            },
            read: false,
            createdAt: Date.now(),
            icon: "alert",
        });

        return {
            success: true,
            message: "Deposit address unlinked successfully",
        };
    },
});

/**
 * Get deposit history for a user
 */
export const getDepositHistory = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const deposits = await ctx.db
            .query("deposit_logs")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();

        return deposits;
    },
});

/**
 * Get user by deposit address (internal - used by deposit listener)
 */
export const getUserByDepositAddress = query({
    args: { address: v.string() },
    handler: async (ctx, args) => {
        const normalizedAddress = args.address.toLowerCase();

        const user = await ctx.db
            .query("users")
            .withIndex("by_depositAddress", (q) => q.eq("depositAddress", normalizedAddress))
            .first();

        return user || null;
    },
});

