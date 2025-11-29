import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUserBRankCapInfo } from "./rankHelpers";

/**
 * Get B-Rank cap information for a user
 * Returns current cap, total received, remaining cap, etc.
 */
export const getBRankCapInfo = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        return await getUserBRankCapInfo(ctx, args.userId);
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
