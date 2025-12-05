import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUserBRankCapInfo } from "./rankHelpers";

/**
 * Get B-Rank cap information for a user or account
 * Returns current cap, total received, remaining cap, etc.
 */
export const getBRankCapInfo = query({
    args: {
        accountId: v.optional(v.union(v.id("accounts"), v.id("users"))),
        userId: v.optional(v.id("users")), // Legacy support
    },
    handler: async (ctx, args) => {
        const targetId = args.accountId || args.userId;
        if (!targetId) {
            throw new Error("Either accountId or userId must be provided");
        }
        return await getUserBRankCapInfo(ctx, targetId as any);
    },
});

/**
 * Get B-Rank cap information for the current authenticated user
 */
export const getMyBRankCapInfo = query({
    args: {},
    handler: async (ctx) => {
        // TODO: Get current user from auth context
        // For now, this is a placeholder
        throw new Error("Authentication not implemented");
    },
});
