"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { createError, ErrorCodes } from "./errors";

/**
 * Setup 2FA - Generate secret and QR code
 * This is an action because it needs Node.js APIs (speakeasy, qrcode)
 */
export const setup2FA = action({
    args: {
        userId: v.id("users"),
        email: v.optional(v.string()), // Optional - will get from user if not provided
    },
    handler: async (ctx, args) => {
        // Get user info
        const user = await ctx.runQuery(api.users.getUserById, { userId: args.userId });
        if (!user) throw createError(ErrorCodes.USER_NOT_FOUND);
        
        const userEmail = args.email || user.email || "";

        // If already set up, return existing secret
        if (user.twoFactorEnabled && user.twoFactorSecret) {
            const secret = user.twoFactorSecret;
            const otpauthUrl = `otpauth://totp/${encodeURIComponent("BellAi")}:${encodeURIComponent(user.email || "")}?secret=${secret}&issuer=${encodeURIComponent("BellAi")}`;
            
            let qrCodeDataUrl: string;
            try {
                qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
            } catch (error) {
                console.error("QR code generation error:", error);
                throw new Error("Failed to generate QR code");
            }
            
            return {
                secret: secret,
                qrCodeDataUrl: qrCodeDataUrl,
                otpauthUrl: otpauthUrl,
            };
        }

        // Generate new secret
        const secret = speakeasy.generateSecret({
            name: `BellAi (${userEmail})`,
            issuer: "BellAi",
            length: 32,
        });

        const secretBase32 = secret.base32 || "";
        const otpauthUrl = secret.otpauth_url || "";

        // Generate QR code
        let qrCodeDataUrl: string;
        try {
            qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        } catch (error) {
            console.error("QR code generation error:", error);
            throw new Error("Failed to generate QR code");
        }

        // Store secret temporarily in database (not enabled yet)
        await ctx.runMutation(api.users.store2FASecret, {
            userId: args.userId,
            secret: secretBase32,
        });

        return {
            secret: secretBase32,
            qrCodeDataUrl: qrCodeDataUrl,
            otpauthUrl: otpauthUrl,
        };
    },
});

/**
 * Verify 2FA setup - Verify the initial code and enable 2FA
 */
export const verify2FASetup = action({
    args: {
        userId: v.id("users"),
        code: v.string(),
    },
    handler: async (ctx, args) => {
        // Get user 2FA secret
        const user2FA = await ctx.runQuery(api.users.get2FASecret, { userId: args.userId });
        
        if (!user2FA.twoFactorSecret) {
            throw createError(ErrorCodes.TWO_FACTOR_NOT_SETUP, "Please set up 2FA first");
        }

        // Verify TOTP code using speakeasy
        const isValid = speakeasy.totp.verify({
            secret: user2FA.twoFactorSecret,
            encoding: "base32",
            token: args.code,
            window: 2, // Allow 2 time steps before/after
        });

        if (!isValid) {
            throw createError(ErrorCodes.TWO_FACTOR_INVALID_CODE, "Invalid verification code. Please try again.");
        }

        // Enable 2FA for user
        await ctx.runMutation(api.users.enable2FA, {
            userId: args.userId,
        });

        return { success: true };
    },
});

/**
 * Verify 2FA code (for login/withdrawal)
 */
export const verify2FACode = action({
    args: {
        userId: v.id("users"),
        code: v.string(),
    },
    handler: async (ctx, args) => {
        // Get user 2FA secret
        const user2FA = await ctx.runQuery(api.users.get2FASecret, { userId: args.userId });
        
        if (!user2FA.twoFactorEnabled || !user2FA.twoFactorSecret) {
            throw createError(ErrorCodes.TWO_FACTOR_NOT_SETUP, "2FA is not set up for this account");
        }

        // Verify TOTP code using speakeasy
        const isValid = speakeasy.totp.verify({
            secret: user2FA.twoFactorSecret,
            encoding: "base32",
            token: args.code,
            window: 2, // Allow 2 time steps before/after
        });

        if (!isValid) {
            // Log failed 2FA attempt
            await ctx.runMutation(api.users.logFailed2FA, {
                userId: args.userId,
                reason: "Invalid 2FA code during verification",
            });
            throw createError(ErrorCodes.TWO_FACTOR_INVALID_CODE, "Invalid 2FA code. Please try again.");
        }

        return { success: true };
    },
});

/**
 * Complete login with 2FA code
 */
export const completeLoginWith2FA = action({
    args: {
        userId: v.id("users"),
        code: v.string(),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Get user 2FA secret
        const user2FA = await ctx.runQuery(api.users.get2FASecret, { userId: args.userId });
        
        if (!user2FA.twoFactorEnabled || !user2FA.twoFactorSecret) {
            throw createError(ErrorCodes.TWO_FACTOR_NOT_SETUP, "2FA is not set up for this account");
        }

        // Verify TOTP code using speakeasy
        const isValid = speakeasy.totp.verify({
            secret: user2FA.twoFactorSecret,
            encoding: "base32",
            token: args.code,
            window: 2, // Allow 2 time steps before/after
        });

        if (!isValid) {
            // Log failed 2FA attempt
            await ctx.runMutation(api.users.logFailed2FA, {
                userId: args.userId,
                ipAddress: args.ipAddress,
                userAgent: args.userAgent,
            });

            throw createError(ErrorCodes.TWO_FACTOR_INVALID_CODE, "Invalid 2FA code. Please try again.");
        }

        // Complete login
        const result = await ctx.runMutation(api.users.completeLoginAfter2FA, {
            userId: args.userId,
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
        });

        return result;
    },
});

