"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { createError, ErrorCodes } from "./errors";

/**
 * Request withdrawal with 2FA verification
 * This is an action because it needs to verify 2FA codes using speakeasy (Node.js API)
 */
export const requestWithdrawalWith2FA = action({
    args: {
        userId: v.id("users"),
        amount: v.number(),
        address: v.string(),
        network: v.string(),
        twoFactorCode: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // First verify 2FA if code is provided
        if (args.twoFactorCode) {
            try {
                await ctx.runAction(api.twoFactorActions.verify2FACode, {
                    userId: args.userId,
                    code: args.twoFactorCode,
                });
            } catch (error: any) {
                // If verification fails, throw error
                throw error;
            }
        }

        // If 2FA verification passed (or not required), process withdrawal
        // Call the mutation to handle the actual withdrawal
        // Note: The mutation will check if 2FA is required and if twoFactorCode was provided
        const result = await ctx.runMutation(api.wallet.requestWithdrawal, {
            userId: args.userId,
            amount: args.amount,
            address: args.address,
            network: args.network,
            twoFactorCode: args.twoFactorCode, // Pass the code so mutation knows it was verified
        });

        return result;
    },
});

