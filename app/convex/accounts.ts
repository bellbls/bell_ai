import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { createError, ErrorCodes } from "./errors";

/**
 * Helper to find the next empty spot in binary tree (for accounts)
 */
async function findBinaryPlacement(ctx: any, rootId: Id<"accounts">, strategy: string) {
    // Simple BFS for "balanced" (fill top to bottom, left to right)
    // Or "weak_leg" logic (requires volume tracking per leg, which we haven't fully implemented yet)
    // For MVP, we'll default to "Balanced" (BFS)

    let queue = [rootId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const account = await ctx.db.get(currentId);
        if (!account) continue;

        if (!account.leftLegId) return { parentId: currentId, position: "left" as const };
        if (!account.rightLegId) return { parentId: currentId, position: "right" as const };

        queue.push(account.leftLegId);
        queue.push(account.rightLegId);
    }

    // Should not happen in a tree
    return { parentId: rootId, position: "left" as const };
}

/**
 * Account Management
 * Handles CRUD operations for accounts
 */

/**
 * Create a new account for a login
 */
export const createAccount = mutation({
    args: {
        loginId: v.id("logins"),
        name: v.string(),
        referralCode: v.string(), // Referral code of the account that referred this one
    },
    handler: async (ctx, args) => {
        // 1. Validate input
        if (!args.name || args.name.trim().length < 2) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'Account name must be at least 2 characters long');
        }

        // 2. Verify login exists
        const login = await ctx.db.get(args.loginId);
        if (!login) {
            throw createError(ErrorCodes.USER_NOT_FOUND, 'Login not found');
        }

        // 3. Find referrer account by referral code
        const referralCode = args.referralCode.trim().toUpperCase();
        const referrerAccount = await ctx.db
            .query("accounts")
            .withIndex("by_referralCode", (q) => q.eq("referralCode", referralCode))
            .first();

        if (!referrerAccount) {
            throw createError(ErrorCodes.INVALID_REFERRAL_CODE, 'A valid referral code is required to create an account.');
        }

        // 4. Binary Placement Logic (same as user registration)
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "placement_strategy"))
            .unique();
        const strategy = config?.value || "balanced";

        // Find placement in referrer's binary tree
        const placement = await findBinaryPlacement(ctx, referrerAccount._id, strategy);
        const parentId = placement.parentId;
        const position = placement.position;

        // 5. Generate unique referral code for new account
        let newReferralCode: string;
        let isUnique = false;
        while (!isUnique) {
            newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const existing = await ctx.db
                .query("accounts")
                .withIndex("by_referralCode", (q) => q.eq("referralCode", newReferralCode))
                .first();
            if (!existing) {
                isUnique = true;
            }
        }

        // 6. Create account
        const accountId = await ctx.db.insert("accounts", {
            loginId: args.loginId,
            name: args.name.trim(),
            referralCode: newReferralCode,
            referrerId: referrerAccount._id,
            parentId: parentId,
            position: position,
            isDefault: false, // New accounts are not default
            isDeleted: false,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: Date.now(),
        });

        // 7. Update referrer's direct referrals count
        await ctx.db.patch(referrerAccount._id, {
            directReferralsCount: referrerAccount.directReferralsCount + 1,
        });

        // 8. Update parent's leg reference
        if (parentId && position) {
            await ctx.db.patch(parentId, {
                [position === "left" ? "leftLegId" : "rightLegId"]: accountId,
            });
        }

        // 9. Create account_member record (owner)
        await ctx.db.insert("account_members", {
            accountId: accountId,
            loginId: args.loginId,
            role: "owner",
            joinedAt: Date.now(),
            createdAt: Date.now(),
        });

        return accountId;
    },
});

/**
 * Get all accounts for a login
 */
export const getAccountsByLogin = query({
    args: {
        loginId: v.id("logins"),
    },
    handler: async (ctx, args) => {
        const accounts = await ctx.db
            .query("accounts")
            .withIndex("by_loginId", (q) => q.eq("loginId", args.loginId))
            .filter((q) => q.neq(q.field("isDeleted"), true))
            .collect();

        return accounts.map(account => ({
            _id: account._id,
            name: account.name,
            referralCode: account.referralCode,
            walletBalance: account.walletBalance,
            blsBalance: account.blsBalance ?? 0,
            currentRank: account.currentRank,
            isDefault: account.isDefault ?? false,
            createdAt: account.createdAt,
        }));
    },
});

/**
 * Get account by ID
 */
export const getAccountById = query({
    args: {
        accountId: v.id("accounts"),
    },
    handler: async (ctx, args) => {
        const account = await ctx.db.get(args.accountId);
        if (!account || account.isDeleted) {
            return null;
        }
        return account;
    },
});

/**
 * Update account name
 */
export const updateAccount = mutation({
    args: {
        accountId: v.id("accounts"),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        if (!args.name || args.name.trim().length < 2) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'Account name must be at least 2 characters long');
        }

        const account = await ctx.db.get(args.accountId);
        if (!account || account.isDeleted) {
            throw createError(ErrorCodes.USER_NOT_FOUND, 'Account not found');
        }

        await ctx.db.patch(args.accountId, {
            name: args.name.trim(),
        });

        return { success: true };
    },
});

/**
 * Set default account for a login
 */
export const setDefaultAccount = mutation({
    args: {
        loginId: v.id("logins"),
        accountId: v.id("accounts"),
    },
    handler: async (ctx, args) => {
        // Verify account belongs to login
        const account = await ctx.db.get(args.accountId);
        if (!account || account.loginId !== args.loginId || account.isDeleted) {
            throw createError(ErrorCodes.UNAUTHORIZED, 'Account not found or access denied');
        }

        // Unset all other default accounts for this login
        const allAccounts = await ctx.db
            .query("accounts")
            .withIndex("by_loginId", (q) => q.eq("loginId", args.loginId))
            .collect();

        for (const acc of allAccounts) {
            if (acc.isDefault && acc._id !== args.accountId) {
                await ctx.db.patch(acc._id, { isDefault: false });
            }
        }

        // Set this account as default
        await ctx.db.patch(args.accountId, { isDefault: true });

        return { success: true };
    },
});

/**
 * Soft delete account
 */
export const deleteAccount = mutation({
    args: {
        accountId: v.id("accounts"),
        loginId: v.id("logins"), // Verify ownership
    },
    handler: async (ctx, args) => {
        const account = await ctx.db.get(args.accountId);
        if (!account) {
            throw createError(ErrorCodes.USER_NOT_FOUND, 'Account not found');
        }

        // Verify ownership
        if (account.loginId !== args.loginId) {
            throw createError(ErrorCodes.UNAUTHORIZED, 'You can only delete your own accounts');
        }

        // Check if this is the only account
        const allAccounts = await ctx.db
            .query("accounts")
            .withIndex("by_loginId", (q) => q.eq("loginId", args.loginId))
            .filter((q) => q.neq(q.field("isDeleted"), true))
            .collect();

        if (allAccounts.length <= 1) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'Cannot delete your only account');
        }

        // Soft delete
        await ctx.db.patch(args.accountId, {
            isDeleted: true,
        });

        // If this was the default account, set another one as default
        if (account.isDefault) {
            const remainingAccounts = allAccounts.filter(acc => acc._id !== args.accountId);
            if (remainingAccounts.length > 0) {
                await ctx.db.patch(remainingAccounts[0]._id, { isDefault: true });
            }
        }

        return { success: true };
    },
});

/**
 * Get accounts accessible by a login (owned + member)
 */
export const getAccessibleAccounts = query({
    args: {
        loginId: v.id("logins"),
    },
    handler: async (ctx, args) => {
        // Get owned accounts
        const ownedAccounts = await ctx.db
            .query("accounts")
            .withIndex("by_loginId", (q) => q.eq("loginId", args.loginId))
            .filter((q) => q.neq(q.field("isDeleted"), true))
            .collect();

        // Get member accounts
        const memberRecords = await ctx.db
            .query("account_members")
            .withIndex("by_loginId", (q) => q.eq("loginId", args.loginId))
            .collect();

        const memberAccountIds = memberRecords
            .filter(m => m.role === "member")
            .map(m => m.accountId);

        const memberAccounts = await Promise.all(
            memberAccountIds.map(id => ctx.db.get(id))
        );

        const allAccounts = [
            ...ownedAccounts,
            ...memberAccounts.filter(acc => acc && !acc.isDeleted),
        ];

        return allAccounts.map(account => ({
            _id: account!._id,
            name: account!.name,
            referralCode: account!.referralCode,
            walletBalance: account!.walletBalance,
            blsBalance: account!.blsBalance ?? 0,
            currentRank: account!.currentRank,
            isDefault: account!.isDefault ?? false,
            createdAt: account!.createdAt,
            isOwner: account!.loginId === args.loginId,
            loginId: account!.loginId, // Include loginId for grouping
        }));
    },
});

/**
 * Get accounts for multiple logins (for account switcher)
 */
export const getAccountsForMultipleLogins = query({
    args: {
        loginIds: v.array(v.id("logins")),
    },
    handler: async (ctx, args) => {
        const allAccounts = [];
        
        for (const loginId of args.loginIds) {
            // Get owned accounts
            const ownedAccounts = await ctx.db
                .query("accounts")
                .withIndex("by_loginId", (q) => q.eq("loginId", loginId))
                .filter((q) => q.neq(q.field("isDeleted"), true))
                .collect();

            // Get member accounts
            const memberRecords = await ctx.db
                .query("account_members")
                .withIndex("by_loginId", (q) => q.eq("loginId", loginId))
                .collect();

            const memberAccountIds = memberRecords
                .filter(m => m.role === "member")
                .map(m => m.accountId);

            const memberAccounts = await Promise.all(
                memberAccountIds.map(id => ctx.db.get(id))
            );

            const loginAccounts = [
                ...ownedAccounts,
                ...memberAccounts.filter(acc => acc && !acc.isDeleted),
            ];

            allAccounts.push(...loginAccounts.map(account => ({
                _id: account!._id,
                name: account!.name,
                referralCode: account!.referralCode,
                walletBalance: account!.walletBalance,
                blsBalance: account!.blsBalance ?? 0,
                currentRank: account!.currentRank,
                isDefault: account!.isDefault ?? false,
                createdAt: account!.createdAt,
                isOwner: account!.loginId === loginId,
                loginId: account!.loginId,
            })));
        }

        return allAccounts;
    },
});

