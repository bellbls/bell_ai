import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

/**
 * TEST UTILITY: Generate verification link for testing
 * This is for development/testing only
 * NOTE: Temporarily disabled due to TypeScript type instantiation issues
 */
/* 
export const generateTestVerificationLink = action({
    args: {
        email: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<any> => {
        console.log("DEBUG: Running generateTestVerificationLink with args:", args);
        const email = args.email || "test2@example.com";
        // Find user by email
        const user = await ctx.runQuery(api.users.getUserByEmail, { email });
        if (!user) {
            throw new Error("User not found with email: " + args.email);
        }

        // Check if already verified
        if (user.emailVerified) {
            return {
                success: false,
                message: "Email already verified",
                userId: user._id,
            };
        }

        // Generate token
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let token = "";
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const expiry = Date.now() + (24 * 60 * 60 * 1000);  // 24 hours

        // Save token
        await ctx.runMutation((internal as any)["auth/emailVerification"].saveVerificationToken, {
            userId: user._id,
            token,
            expiry,
        });

        // Generate URL
        const baseUrl = process.env.CONVEX_SITE_URL || "http://localhost:3000";
        const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

        console.log(`\n🔗 TEST VERIFICATION LINK for ${args.email}:`);
        console.log(verificationUrl);
        console.log(`Expires: ${new Date(expiry).toLocaleString()}\n`);

        return {
            success: true,
            verificationUrl,
            token,
            expiresAt: expiry,
            expiresIn: "24 hours",
            userId: user._id,
        };
    },
});

export const generateTestLink2 = action({
    args: {},
    handler: async (ctx): Promise<string> => {
        console.log("DEBUG: Running generateTestLink2");
        const email = "test2@example.com";
        const user = await ctx.runQuery(api.users.getUserByEmail, { email });
        if (!user) throw new Error("User not found");

        const token = "TEST_TOKEN_" + Date.now();
        const expiry = Date.now() + 86400000;

        await ctx.runMutation(api.auth.emailVerification.saveVerificationToken, {
            userId: user._id,
            token,
            expiry,
        });

        const baseUrl = process.env.CONVEX_SITE_URL || "http://localhost:3000";
        return `${baseUrl}/verify-email?token=${token}`;
    },
});
*/
