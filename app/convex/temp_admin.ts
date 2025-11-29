
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

export const makeAdmin = mutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (!user) {
            // Create if not exists
            const userId = await ctx.db.insert("users", {
                name: "Admin User",
                email: args.email,
                password: bcrypt.hashSync("password123", 10),
                referralCode: "ADMIN1",
                role: "admin",
                currentRank: "B0",
                teamVolume: 0,
                directReferralsCount: 0,
                walletBalance: 10000,
                createdAt: Date.now(),
            });
            return await ctx.db.get(userId);
        }

        // If user exists, update role ONLY (preserve password)
        await ctx.db.patch(user._id, {
            role: "admin",
            // Reset lockout fields just in case
            loginAttempts: 0,
            lockedUntil: undefined
        });

        return await ctx.db.get(user._id);
    },
});
