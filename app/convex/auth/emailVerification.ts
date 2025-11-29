import { mutation, query, action, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

/**
 * Email Verification System
 * Sends verification emails and validates tokens
 */

/**
 * Generate random verification token
 */
function generateToken(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

/**
 * Request email verification (send email)
 * Triggers internal token generation and sending
 */
export const sendVerificationEmail = action({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Get user
        const user = await ctx.runQuery(api.users.getUserById, { userId: args.userId });
        if (!user) {
            throw new Error("User not found");
        }

        // Check if already verified
        if (user.emailVerified) {
            return {
                success: false,
                message: "Email already verified",
            };
        }

        // Generate verification token
        const token = generateToken();
        const expiry = Date.now() + (24 * 60 * 60 * 1000);  // 24 hours

        // Save token to database
        await ctx.runMutation((internal as any)["auth/emailVerification"].saveVerificationToken, {
            userId: args.userId,
            token,
            expiry,
        });

        // Send email via Resend
        try {
            const verificationUrl = `${process.env.CONVEX_SITE_URL}/verify-email?token=${token}`;

            // TODO: Integrate with Resend
            // For now, just log the URL
            console.log(`Verification URL for ${user.email}: ${verificationUrl}`);

            // In production, use Resend:
            /*
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);

            await resend.emails.send({
                from: "noreply@yourapp.com",
                to: user.email,
                subject: "Verify Your Email",
                html: `
                    <h1>Welcome to AnchorChain!</h1>
                    <p>Please verify your email address by clicking the link below:</p>
                    <a href="${verificationUrl}">Verify Email</a>
                    <p>This link will expire in 24 hours.</p>
                `,
            });
            */

            return {
                success: true,
                message: "Verification email sent",
            };
        } catch (error: any) {
            console.error("Error sending verification email:", error);
            throw new Error("Failed to send verification email");
        }
    },
});

/**
 * Save verification token (internal mutation)
 */
export const saveVerificationToken = internalMutation({
    args: {
        userId: v.id("users"),
        token: v.string(),
        expiry: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            emailVerificationToken: args.token,
            emailVerificationExpiry: args.expiry,
        });
    },
});

/**
 * Verify email with token
 */
export const verifyEmail = mutation({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        // Find user by token
        const user = await ctx.db
            .query("users")
            .withIndex("by_emailVerificationToken", (q) =>
                q.eq("emailVerificationToken", args.token)
            )
            .unique();

        if (!user) {
            throw new Error("Invalid verification token");
        }

        // Check if token expired
        if (!user.emailVerificationExpiry || user.emailVerificationExpiry < Date.now()) {
            throw new Error("Verification token has expired");
        }

        // Check if already verified
        if (user.emailVerified) {
            return {
                success: true,
                message: "Email already verified",
            };
        }

        // Mark email as verified
        await ctx.db.patch(user._id, {
            emailVerified: true,
            emailVerificationToken: undefined,
            emailVerificationExpiry: undefined,
        });

        // Log security event
        await ctx.db.insert("security_audit_log", {
            userId: user._id,
            action: "email_verified",
            status: "success",
            timestamp: Date.now(),
        });

        return {
            success: true,
            message: "Email verified successfully",
            userId: user._id,
        };
    },
});

/**
 * Check if email is verified
 */
export const isEmailVerified = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        return user?.emailVerified || false;
    },
});

/**
 * Resend verification email
 */
export const resendVerificationEmail = action({
    args: {
        email: v.string(),
    },
    handler: async (ctx, args) => {
        // Find user by email
        const user = await ctx.runQuery(api.users.getUserByEmail, { email: args.email });
        if (!user) {
            throw new Error("User not found with this email address");
        }

        // Check if already verified
        if (user.emailVerified) {
            throw new Error("Email is already verified");
        }

        // Generate verification token (reuse logic from sendVerificationEmail)
        const token = generateToken();
        const expiry = Date.now() + (24 * 60 * 60 * 1000);  // 24 hours

        // Save token to database
        await ctx.runMutation((internal as any)["auth/emailVerification"].saveVerificationToken, {
            userId: user._id,
            token,
            expiry,
        });

        // Send email via Resend
        try {
            const verificationUrl = `${process.env.CONVEX_SITE_URL}/verify-email?token=${token}`;
            // Email sending logic would go here
            // For now, just return success
            return {
                success: true,
                message: "Verification email sent",
            };
        } catch (error) {
            throw new Error("Failed to send verification email");
        }
    },
});
