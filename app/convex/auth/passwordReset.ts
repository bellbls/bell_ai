import { mutation, action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import bcrypt from "bcryptjs";

/**
 * Password Reset System
 * Secure password reset with email tokens
 */

/**
 * Generate random reset token
 */
function generateResetToken(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

/**
 * Request password reset (send email)
 */
export const requestPasswordReset = action({
    args: {
        email: v.string(),
        ipAddress: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Find user by email
        const user = await ctx.runQuery(api.users.getUserByEmail, { email: args.email });

        if (!user) {
            // Don't reveal if email exists or not (security)
            return {
                success: true,
                message: "If an account with that email exists, a password reset link has been sent.",
            };
        }

        // Check rate limit (3 requests per hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const recentResets = await ctx.runMutation((api as any)["auth/passwordReset"].getRecentResetAttempts, {
            userId: user._id,
            since: oneHourAgo,
        });

        if (recentResets >= 3) {
            throw new Error("Too many password reset requests. Please try again later.");
        }

        // Generate reset token
        const token = generateResetToken();
        const expiry = Date.now() + (60 * 60 * 1000);  // 1 hour

        // Save token to database
        await ctx.runMutation((api as any)["auth/passwordReset"].saveResetToken, {
            userId: user._id,
            token,
            expiry,
            ipAddress: args.ipAddress,
        });

        // Send email via Resend
        try {
            const resetUrl = `${process.env.CONVEX_SITE_URL}/reset-password?token=${token}`;

            // TODO: Integrate with Resend
            console.log(`Password reset URL for ${user.email}: ${resetUrl}`);

            // In production, use Resend:
            /*
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);

            await resend.emails.send({
                from: "noreply@yourapp.com",
                to: user.email,
                subject: "Reset Your Password",
                html: `
                    <h1>Password Reset Request</h1>
                    <p>You requested to reset your password. Click the link below to continue:</p>
                    <a href="${resetUrl}">Reset Password</a>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                `,
            });
            */

            return {
                success: true,
                message: "If an account with that email exists, a password reset link has been sent.",
            };
        } catch (error: any) {
            console.error("Error sending password reset email:", error);
            throw new Error("Failed to send password reset email");
        }
    },
});

/**
 * Save reset token (internal mutation)
 */
export const saveResetToken = mutation({
    args: {
        userId: v.id("users"),
        token: v.string(),
        expiry: v.number(),
        ipAddress: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            passwordResetToken: args.token,
            passwordResetExpiry: args.expiry,
        });

        // Log password reset request
        await ctx.db.insert("security_audit_log", {
            userId: args.userId,
            action: "password_reset_requested",
            status: "success",
            ipAddress: args.ipAddress,
            timestamp: Date.now(),
        });
    },
});

/**
 * Get recent reset attempts (for rate limiting)
 * Note: Using mutation instead of query to allow rate limiting checks
 */
export const getRecentResetAttempts = mutation({
    args: {
        userId: v.id("users"),
        since: v.number(),
    },
    handler: async (ctx, args) => {
        const attempts = await ctx.db
            .query("security_audit_log")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("action"), "password_reset_requested"),
                    q.gte(q.field("timestamp"), args.since)
                )
            )
            .collect();

        return attempts.length;
    },
});

/**
 * Reset password with token
 */
export const resetPassword = mutation({
    args: {
        token: v.string(),
        newPassword: v.string(),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Validate password strength
        if (args.newPassword.length < 8) {
            throw new Error("Password must be at least 8 characters long");
        }

        const hasUppercase = /[A-Z]/.test(args.newPassword);
        const hasLowercase = /[a-z]/.test(args.newPassword);
        const hasNumber = /[0-9]/.test(args.newPassword);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(args.newPassword);

        if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
            throw new Error(
                "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
            );
        }

        // Find user by token
        const user = await ctx.db
            .query("users")
            .withIndex("by_passwordResetToken", (q) =>
                q.eq("passwordResetToken", args.token)
            )
            .unique();

        if (!user) {
            throw new Error("Invalid or expired reset token");
        }

        // Check if token expired
        if (!user.passwordResetExpiry || user.passwordResetExpiry < Date.now()) {
            throw new Error("Reset token has expired. Please request a new one.");
        }

        // Hash new password
        const passwordHash = bcrypt.hashSync(args.newPassword, 10);

        // Update password and clear reset token
        await ctx.db.patch(user._id, {
            password: passwordHash,
            passwordResetToken: undefined,
            passwordResetExpiry: undefined,
            loginAttempts: 0,  // Reset login attempts
            lockedUntil: undefined,  // Unlock account if locked
        });

        // Log password change
        await ctx.db.insert("security_audit_log", {
            userId: user._id,
            action: "password_changed",
            status: "success",
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            metadata: { method: "reset_token" },
            timestamp: Date.now(),
        });

        return {
            success: true,
            message: "Password reset successfully. You can now log in with your new password.",
        };
    },
});

/**
 * Change password (for logged-in users)
 */
export const changePassword = mutation({
    args: {
        userId: v.id("users"),
        currentPassword: v.string(),
        newPassword: v.string(),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Get user
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Verify current password
        if (!user.password) {
            throw new Error("No password set for this account");
        }

        const isValid = bcrypt.compareSync(args.currentPassword, user.password);
        if (!isValid) {
            // Log failed attempt
            await ctx.db.insert("security_audit_log", {
                userId: args.userId,
                action: "password_change",
                status: "failed",
                ipAddress: args.ipAddress,
                userAgent: args.userAgent,
                metadata: { reason: "Invalid current password" },
                timestamp: Date.now(),
            });

            throw new Error("Current password is incorrect");
        }

        // Validate new password strength
        if (args.newPassword.length < 8) {
            throw new Error("Password must be at least 8 characters long");
        }

        const hasUppercase = /[A-Z]/.test(args.newPassword);
        const hasLowercase = /[a-z]/.test(args.newPassword);
        const hasNumber = /[0-9]/.test(args.newPassword);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(args.newPassword);

        if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
            throw new Error(
                "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
            );
        }

        // Hash new password
        const passwordHash = bcrypt.hashSync(args.newPassword, 10);

        // Update password
        await ctx.db.patch(args.userId, {
            password: passwordHash,
        });

        // Log successful password change
        await ctx.db.insert("security_audit_log", {
            userId: args.userId,
            action: "password_changed",
            status: "success",
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            metadata: { method: "user_initiated" },
            timestamp: Date.now(),
        });

        return {
            success: true,
            message: "Password changed successfully",
        };
    },
});
