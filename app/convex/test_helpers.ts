import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const addFunds = mutation({
    args: { email: v.string(), amount: v.number() },
    handler: async (ctx, args) => {
        const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), args.email)).first();
        if (!user) throw new Error("User not found");
        await ctx.db.patch(user._id, { walletBalance: (user.walletBalance || 0) + args.amount });
        return user.walletBalance;
    }
});
