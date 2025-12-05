import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { createError, ErrorCodes, isValidEmail } from "./errors";
import bcrypt from "bcryptjs";
import { notify } from "./notifications";
import { check2FARequirement } from "./security/twoFactor";

// Force rebuild
export const register = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        password: v.string(),
        referralCode: v.string(),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // 1. Validate input
        if (!args.name || args.name.trim().length < 2) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'Name must be at least 2 characters long');
        }

        if (!isValidEmail(args.email)) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'Please enter a valid email address');
        }

        // Enhanced password validation
        if (args.password.length < 8) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'Password must be at least 8 characters long');
        }

        // 2. Check if Email Already Exists
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
            .unique();

        if (existing) {
            // Log failed registration attempt
            await ctx.db.insert("security_audit_log", {
                action: "registration",
                status: "failed",
                ipAddress: args.ipAddress,
                userAgent: args.userAgent,
                metadata: { reason: "Email already exists", email: args.email },
                timestamp: Date.now(),
            });
            throw createError(ErrorCodes.EMAIL_ALREADY_EXISTS);
        }

        // 3. Find Referrer (MANDATORY)
        const referralCode = args.referralCode.trim().toUpperCase();
        const referrer = await ctx.db
            .query("users")
            .withIndex("by_referralCode", (q) => q.eq("referralCode", referralCode))
            .unique();

        if (!referrer) {
            throw createError(ErrorCodes.INVALID_REFERRAL_CODE, 'A valid referral code is required to sign up.');
        }

        const referrerId = referrer._id;
        // Increment direct count
        await ctx.db.patch(referrer._id, {
            directReferralsCount: referrer.directReferralsCount + 1,
        });

        // 4. Binary Placement Logic
        // Get Strategy
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "placement_strategy"))
            .unique();
        const strategy = config?.value || "balanced"; // "weak_leg" or "balanced"

        // Find Placement
        const placement = await findBinaryPlacement(ctx, referrer._id, strategy);
        const parentId = placement.parentId;
        const position = placement.position;

        // Update Parent's Leg
        if (parentId && position) {
            await ctx.db.patch(parentId, {
                [position === "left" ? "leftLegId" : "rightLegId"]: undefined, // Placeholder
            });
        }

        // 5. Create User
        const passwordHash = bcrypt.hashSync(args.password, 10);
        const newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const userId = await ctx.db.insert("users", {
            name: args.name.trim(),
            email: args.email.toLowerCase(),
            password: passwordHash,
            referralCode: newReferralCode,
            referrerId,
            parentId,
            position,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: Date.now(),
            // Security fields
            emailVerified: false,  // Email not verified yet
            loginAttempts: 0,
        });

        // Update Parent's Leg Reference
        if (parentId && position) {
            await ctx.db.patch(parentId, {
                [position === "left" ? "leftLegId" : "rightLegId"]: userId,
            });
        }

        // 6. Log successful registration
        await ctx.db.insert("security_audit_log", {
            userId,
            action: "registration",
            status: "success",
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            timestamp: Date.now(),
        });

        // 7. Create login record for new user
        const loginId = await ctx.db.insert("logins", {
            email: args.email.toLowerCase(),
            password: passwordHash,
            emailVerified: false,
            loginAttempts: 0,
            twoFactorEnabled: false,
            createdAt: Date.now(),
        });

        // 8. Find referrer account (for linking)
        let referrerAccountId: Id<"accounts"> | undefined;
        const referrerLogin = await ctx.db
            .query("logins")
            .withIndex("by_email", (q) => q.eq("email", referrer.email))
            .first();
        
        if (referrerLogin) {
            const referrerAccount = await ctx.db
                .query("accounts")
                .withIndex("by_loginId", (q) => q.eq("loginId", referrerLogin._id))
                .filter((q) => q.eq(q.field("isDefault"), true))
                .first();
            referrerAccountId = referrerAccount?._id;
        }

        // Helper to find accountId from userId
        const findAccountIdFromUserId = async (userId: Id<"users"> | undefined): Promise<Id<"accounts"> | undefined> => {
            if (!userId) return undefined;
            const targetUser = await ctx.db.get(userId);
            if (!targetUser) return undefined;
            
            const targetLogin = await ctx.db
                .query("logins")
                .withIndex("by_email", (q) => q.eq("email", targetUser.email))
                .first();
            
            if (!targetLogin) return undefined;
            
            const targetAccount = await ctx.db
                .query("accounts")
                .withIndex("by_loginId", (q) => q.eq("loginId", targetLogin._id))
                .filter((q) => q.eq(q.field("isDefault"), true))
                .first();
            
            return targetAccount?._id;
        };

        // Find corresponding account IDs for relationship fields
        const parentAccountId = parentId ? await findAccountIdFromUserId(parentId) : undefined;
        const leftLegAccountId = undefined; // Will be set when children are added
        const rightLegAccountId = undefined; // Will be set when children are added

        // 9. Create default account for new user
        const accountId = await ctx.db.insert("accounts", {
            loginId: loginId,
            name: args.name.trim(),
            referralCode: newReferralCode,
            referrerId: referrerAccountId,
            role: undefined,
            isDefault: true,
            parentId: parentAccountId,
            leftLegId: leftLegAccountId,
            rightLegId: rightLegAccountId,
            position: position,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: Date.now(),
            isDeleted: false,
        });

        // 10. Update parent's leg reference (using accountId)
        if (parentAccountId && position) {
            await ctx.db.patch(parentAccountId, {
                [position === "left" ? "leftLegId" : "rightLegId"]: accountId,
            });
        }

        // 11. Send welcome notification
        await notify(
            ctx,
            accountId,
            "account",
            "system",
            "Welcome to BellAi!",
            `Your account has been created successfully. Your referral code is: ${newReferralCode}`,
            "Info"
        );

        // 12. Return new format with loginId and accountId
        return {
            loginId: loginId,
            accountId: accountId,
            userId: userId, // Legacy support
        };
    },
});

export const login = mutation({
    args: {
        email: v.string(),
        password: v.string(),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Helper function to find accountId from userId
        const findAccountIdFromUserId = async (userId: Id<"users"> | undefined): Promise<Id<"accounts"> | undefined> => {
            if (!userId) return undefined;
            const targetUser = await ctx.db.get(userId);
            if (!targetUser) return undefined;
            
            // Find login for this user
            const targetLogin = await ctx.db
                .query("logins")
                .withIndex("by_email", (q) => q.eq("email", targetUser.email))
                .first();
            
            if (!targetLogin) return undefined;
            
            // Find default account for this login
            const targetAccount = await ctx.db
                .query("accounts")
                .withIndex("by_loginId", (q) => q.eq("loginId", targetLogin._id))
                .filter((q) => q.eq(q.field("isDefault"), true))
                .first();
            
            return targetAccount?._id;
        };
        // 1. Validate input
        if (!isValidEmail(args.email)) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'Please enter a valid email address');
        }

        // 2. Find User
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
            .unique();

        if (!user) {
            // Log failed attempt (no user found)
            await ctx.db.insert("security_audit_log", {
                action: "login",
                status: "failed",
                ipAddress: args.ipAddress,
                userAgent: args.userAgent,
                metadata: { reason: "User not found", email: args.email },
                timestamp: Date.now(),
            });
            throw createError(ErrorCodes.USER_NOT_FOUND, 'Account not found. Please sign up first.');
        }

        // 3. Check if account is locked
        if (user.lockedUntil && user.lockedUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);

            // Log locked account attempt
            await ctx.db.insert("security_audit_log", {
                userId: user._id,
                action: "login",
                status: "failed",
                ipAddress: args.ipAddress,
                userAgent: args.userAgent,
                metadata: { reason: "Account locked", minutesLeft },
                timestamp: Date.now(),
            });

            throw createError(
                ErrorCodes.UNAUTHORIZED,
                `Account locked due to too many failed login attempts. Try again in ${minutesLeft} minutes.`
            );
        }

        // 4. Verify Password
        if (!user.password) {
            throw createError(ErrorCodes.UNAUTHORIZED, 'Please reset your password or contact support.');
        }

        const isValid = bcrypt.compareSync(args.password, user.password);

        if (!isValid) {
            // Record failed login attempt
            const newAttempts = (user.loginAttempts || 0) + 1;
            const maxAttempts = 5;
            const lockoutMs = 30 * 60 * 1000; // 30 minutes

            if (newAttempts >= maxAttempts) {
                // Lock account
                await ctx.db.patch(user._id, {
                    loginAttempts: newAttempts,
                    lockedUntil: Date.now() + lockoutMs,
                });

                // Log account lockout
                await ctx.db.insert("security_audit_log", {
                    userId: user._id,
                    action: "account_locked",
                    status: "success",
                    ipAddress: args.ipAddress,
                    userAgent: args.userAgent,
                    metadata: { reason: "Too many failed login attempts", attempts: newAttempts },
                    timestamp: Date.now(),
                });

                throw createError(
                    ErrorCodes.UNAUTHORIZED,
                    'Too many failed login attempts. Your account has been locked for 30 minutes.'
                );
            } else {
                // Increment failed attempts
                await ctx.db.patch(user._id, {
                    loginAttempts: newAttempts,
                });

                // Log failed login
                await ctx.db.insert("security_audit_log", {
                    userId: user._id,
                    action: "login",
                    status: "failed",
                    ipAddress: args.ipAddress,
                    userAgent: args.userAgent,
                    metadata: { reason: "Invalid password", attemptsRemaining: maxAttempts - newAttempts },
                    timestamp: Date.now(),
                });

                throw createError(
                    ErrorCodes.UNAUTHORIZED,
                    `Invalid password. ${maxAttempts - newAttempts} attempts remaining.`
                );
            }
        }

        // 5. Check 2FA requirement
        const twoFactorRequiredConfig = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "two_factor_required"))
            .first();

        const twoFactorEnabledAtConfig = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "two_factor_enabled_at"))
            .first();

        const globalRequirement = twoFactorRequiredConfig?.value ?? false;
        const requirementEnabledAt = twoFactorEnabledAtConfig?.value ?? null;

        if (globalRequirement) {
            const requirementCheck = check2FARequirement(
                {
                    createdAt: user.createdAt,
                    twoFactorEnabled: user.twoFactorEnabled ?? false,
                    twoFactorRequiredAt: user.twoFactorRequiredAt,
                },
                globalRequirement,
                requirementEnabledAt
            );

            // If user has 2FA enabled, require code
            if (user.twoFactorEnabled) {
                // Auto-migrate: Get or create login and account
                let login = await ctx.db
                    .query("logins")
                    .withIndex("by_email", (q) => q.eq("email", user.email))
                    .first();

                let loginId: Id<"logins">;

                if (!login) {
                    loginId = await ctx.db.insert("logins", {
                        email: user.email,
                        password: user.password,
                        emailVerified: user.emailVerified ?? false,
                        twoFactorEnabled: user.twoFactorEnabled,
                        twoFactorSecret: user.twoFactorSecret,
                        twoFactorBackupCodes: user.twoFactorBackupCodes,
                        twoFactorSetupAt: user.twoFactorSetupAt,
                        twoFactorRequiredAt: user.twoFactorRequiredAt,
                        createdAt: user.createdAt,
                    });
                    login = await ctx.db.get(loginId);
                } else {
                    loginId = login._id;
                }

                let account = await ctx.db
                    .query("accounts")
                    .withIndex("by_loginId", (q) => q.eq("loginId", loginId))
                    .filter((q) => q.eq(q.field("isDefault"), true))
                    .first();

                if (!account) {
                    // Find corresponding account IDs for relationship fields
                    const referrerAccountId = user.referrerId ? await findAccountIdFromUserId(user.referrerId) : undefined;
                    const parentAccountId = user.parentId ? await findAccountIdFromUserId(user.parentId) : undefined;
                    const leftLegAccountId = user.leftLegId ? await findAccountIdFromUserId(user.leftLegId) : undefined;
                    const rightLegAccountId = user.rightLegId ? await findAccountIdFromUserId(user.rightLegId) : undefined;

                    account = await ctx.db.insert("accounts", {
                        loginId: loginId,
                        name: user.name,
                        referralCode: user.referralCode,
                        referrerId: referrerAccountId,
                        role: user.role,
                        isDefault: true,
                        parentId: parentAccountId,
                        leftLegId: leftLegAccountId,
                        rightLegId: rightLegAccountId,
                        position: user.position,
                        currentRank: user.currentRank,
                        teamVolume: user.teamVolume,
                        directReferralsCount: user.directReferralsCount,
                        walletBalance: user.walletBalance,
                        blsBalance: user.blsBalance,
                        createdAt: user.createdAt,
                        isDeleted: false,
                    });
                }

                // Mark that they need to provide 2FA code
                // Don't update lastLoginAt yet - wait for 2FA verification
                return {
                    requires2FA: true,
                    loginId: loginId,
                    accountId: account._id,
                    userId: user._id, // Legacy support
                    gracePeriodInfo: null,
                };
            }

            // If user must set up 2FA now (grace period expired)
            if (requirementCheck.mustSetupNow) {
                // Mark user as required to set up 2FA if not already marked
                if (!user.twoFactorRequiredAt) {
                    await ctx.db.patch(user._id, {
                        twoFactorRequiredAt: Date.now(),
                    });
                }

                throw createError(
                    ErrorCodes.TWO_FACTOR_SETUP_REQUIRED,
                    `Two-factor authentication is required. Please set it up in Settings. ${requirementCheck.daysRemaining ? `You have ${requirementCheck.daysRemaining} days remaining.` : ''}`
                );
            }

            // If within grace period, allow login but mark as required
            if (requirementCheck.isWithinGracePeriod) {
                // Mark user as required if not already marked
                if (!user.twoFactorRequiredAt) {
                    await ctx.db.patch(user._id, {
                        twoFactorRequiredAt: Date.now(),
                    });
                }

                // Allow login but return warning
                await ctx.db.patch(user._id, {
                    loginAttempts: 0,
                    lockedUntil: undefined,
                    lastLoginAt: Date.now(),
                    lastLoginIp: args.ipAddress,
                });

                await ctx.db.insert("security_audit_log", {
                    userId: user._id,
                    action: "login",
                    status: "success",
                    ipAddress: args.ipAddress,
                    userAgent: args.userAgent,
                    timestamp: Date.now(),
                });

                // Auto-migrate: Get or create login and account
                let login = await ctx.db
                    .query("logins")
                    .withIndex("by_email", (q) => q.eq("email", user.email))
                    .first();

                let loginId: Id<"logins">;

                if (!login) {
                    loginId = await ctx.db.insert("logins", {
                        email: user.email,
                        password: user.password,
                        emailVerified: user.emailVerified ?? false,
                        lastLoginAt: Date.now(),
                        lastLoginIp: args.ipAddress,
                        loginAttempts: 0,
                        twoFactorEnabled: user.twoFactorEnabled ?? false,
                        twoFactorSecret: user.twoFactorSecret,
                        twoFactorBackupCodes: user.twoFactorBackupCodes,
                        twoFactorSetupAt: user.twoFactorSetupAt,
                        twoFactorRequiredAt: user.twoFactorRequiredAt,
                        createdAt: user.createdAt,
                    });
                    login = await ctx.db.get(loginId);
                } else {
                    loginId = login._id;
                }

                let account = await ctx.db
                    .query("accounts")
                    .withIndex("by_loginId", (q) => q.eq("loginId", loginId))
                    .filter((q) => q.eq(q.field("isDefault"), true))
                    .first();

                if (!account) {
                    // Find corresponding account IDs for relationship fields
                    const referrerAccountId = user.referrerId ? await findAccountIdFromUserId(user.referrerId) : undefined;
                    const parentAccountId = user.parentId ? await findAccountIdFromUserId(user.parentId) : undefined;
                    const leftLegAccountId = user.leftLegId ? await findAccountIdFromUserId(user.leftLegId) : undefined;
                    const rightLegAccountId = user.rightLegId ? await findAccountIdFromUserId(user.rightLegId) : undefined;

                    account = await ctx.db.insert("accounts", {
                        loginId: loginId,
                        name: user.name,
                        referralCode: user.referralCode,
                        referrerId: referrerAccountId,
                        role: user.role,
                        isDefault: true,
                        parentId: parentAccountId,
                        leftLegId: leftLegAccountId,
                        rightLegId: rightLegAccountId,
                        position: user.position,
                        currentRank: user.currentRank,
                        teamVolume: user.teamVolume,
                        directReferralsCount: user.directReferralsCount,
                        walletBalance: user.walletBalance,
                        blsBalance: user.blsBalance,
                        createdAt: user.createdAt,
                        isDeleted: false,
                    });
                }

                return {
                    requires2FA: false,
                    loginId: loginId,
                    accountId: account._id,
                    userId: user._id, // Legacy support
                    gracePeriodInfo: {
                        daysRemaining: requirementCheck.daysRemaining ?? 0,
                        isFirstLogin: requirementCheck.isFirstLogin ?? false,
                    },
                };
            }
        }

        // 6. Successful login - Reset attempts and update login info
        await ctx.db.patch(user._id, {
            loginAttempts: 0,
            lockedUntil: undefined,
            lastLoginAt: Date.now(),
            lastLoginIp: args.ipAddress,
        });

        // 7. Auto-migrate: Check if login record exists, if not create it
        let login = await ctx.db
            .query("logins")
            .withIndex("by_email", (q) => q.eq("email", user.email))
            .first();

        let loginId: Id<"logins">;

        if (!login) {
            // Create login record for this user (auto-migration)
            loginId = await ctx.db.insert("logins", {
                email: user.email,
                password: user.password, // Already hashed
                emailVerified: user.emailVerified ?? false,
                emailVerificationToken: user.emailVerificationToken,
                emailVerificationExpiry: user.emailVerificationExpiry,
                passwordResetToken: user.passwordResetToken,
                passwordResetExpiry: user.passwordResetExpiry,
                lastLoginAt: Date.now(),
                lastLoginIp: args.ipAddress,
                loginAttempts: 0,
                lockedUntil: undefined,
                twoFactorEnabled: user.twoFactorEnabled ?? false,
                twoFactorSecret: user.twoFactorSecret,
                twoFactorBackupCodes: user.twoFactorBackupCodes,
                twoFactorSetupAt: user.twoFactorSetupAt,
                twoFactorRequiredAt: user.twoFactorRequiredAt,
                createdAt: user.createdAt,
            });
            // Fetch the newly created login record
            login = await ctx.db.get(loginId);
        } else {
            loginId = login._id;
            // Update existing login record
            await ctx.db.patch(login._id, {
                lastLoginAt: Date.now(),
                lastLoginIp: args.ipAddress,
                loginAttempts: 0,
                lockedUntil: undefined,
            });
        }

        // 8. Ensure login is defined (should always be at this point)
        if (!login || !login._id) {
            throw createError(ErrorCodes.INTERNAL_ERROR, "Login record not found or created");
        }

        // 9. Find or create default account for this login
        let account = await ctx.db
            .query("accounts")
            .withIndex("by_loginId", (q) => q.eq("loginId", loginId))
            .filter((q) => q.eq(q.field("isDefault"), true))
            .first();

        if (!account) {
            // Find corresponding account IDs for relationship fields (using helper from top of function)
            const referrerAccountId = user.referrerId ? await findAccountIdFromUserId(user.referrerId) : undefined;
            const parentAccountId = user.parentId ? await findAccountIdFromUserId(user.parentId) : undefined;
            const leftLegAccountId = user.leftLegId ? await findAccountIdFromUserId(user.leftLegId) : undefined;
            const rightLegAccountId = user.rightLegId ? await findAccountIdFromUserId(user.rightLegId) : undefined;

            // Create default account for this user (auto-migration)
            // loginId is guaranteed to exist at this point due to check above
            account = await ctx.db.insert("accounts", {
                loginId: loginId,
                name: user.name,
                referralCode: user.referralCode,
                referrerId: referrerAccountId,
                role: user.role,
                isDefault: true,
                parentId: parentAccountId,
                leftLegId: leftLegAccountId,
                rightLegId: rightLegAccountId,
                position: user.position,
                currentRank: user.currentRank,
                teamVolume: user.teamVolume,
                directReferralsCount: user.directReferralsCount,
                walletBalance: user.walletBalance,
                depositAddress: user.depositAddress,
                depositAddressLinkedAt: user.depositAddressLinkedAt,
                activeDirectReferrals: user.activeDirectReferrals,
                unlockedLevels: user.unlockedLevels,
                lastUnlockUpdate: user.lastUnlockUpdate,
                totalBRankBonusReceived: user.totalBRankBonusReceived,
                blsBalance: user.blsBalance,
                createdAt: user.createdAt,
                isDeleted: false,
            });
        }

        // 10. Log successful login
        await ctx.db.insert("security_audit_log", {
            loginId: loginId,
            accountId: account._id,
            userId: user._id, // Keep for backward compatibility
            action: "login",
            status: "success",
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            timestamp: Date.now(),
        });

        // 11. Return new format with loginId and accountId
        return {
            loginId: loginId,
            accountId: account._id,
            userId: user._id, // Legacy support
        };
    },
});

// Helper to find the next empty spot
async function findBinaryPlacement(ctx: any, rootId: Id<"users">, strategy: string) {
    // Simple BFS for "balanced" (fill top to bottom, left to right)
    // Or "weak_leg" logic (requires volume tracking per leg, which we haven't fully implemented yet)
    // For MVP, we'll default to "Balanced" (BFS)

    let queue = [rootId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const user = await ctx.db.get(currentId);
        if (!user) continue;

        if (!user.leftLegId) return { parentId: currentId, position: "left" as const };
        if (!user.rightLegId) return { parentId: currentId, position: "right" as const };

        queue.push(user.leftLegId);
        queue.push(user.rightLegId);
    }

    // Should not happen in a tree
    return { parentId: rootId, position: "left" as const };
}

export const getProfile = query({
    args: { 
        userId: v.optional(v.id("users")),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        // Support both userId (legacy) and accountId (new multi-account system)
        if (args.accountId) {
            return await ctx.db.get(args.accountId);
        } else if (args.userId) {
            return await ctx.db.get(args.userId);
        }
        return null;
    },
});

export const getDirectReferrals = query({
    args: { 
        userId: v.optional(v.id("users")),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        if (args.accountId) {
            // Query accounts table for direct referrals
            return await ctx.db
                .query("accounts")
                .withIndex("by_referrerId", (q) => q.eq("referrerId", args.accountId))
                .filter((q) => q.neq(q.field("isDeleted"), true))
                .collect();
        } else if (args.userId) {
            // Legacy: query users table
            return await ctx.db
                .query("users")
                .withIndex("by_referrerId", (q) => q.eq("referrerId", args.userId))
                .collect();
        }
        return [];
    },
});

export const getIndirectReferrals = query({
    args: { 
        userId: v.optional(v.id("users")),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        if (args.accountId) {
            // 1. Get Direct Referrals (accounts)
            const directReferrals = await ctx.db
                .query("accounts")
                .withIndex("by_referrerId", (q) => q.eq("referrerId", args.accountId))
                .filter((q) => q.neq(q.field("isDeleted"), true))
                .collect();

            // 2. Get Indirect Referrals (L2)
            const indirectReferrals = [];

            for (const direct of directReferrals) {
                const l2 = await ctx.db
                    .query("accounts")
                    .withIndex("by_referrerId", (q) => q.eq("referrerId", direct._id))
                    .filter((q) => q.neq(q.field("isDeleted"), true))
                    .collect();

                // Add context about who referred them
                for (const account of l2) {
                    indirectReferrals.push({
                        ...account,
                        referredBy: direct.name
                    });
                }
            }

            return indirectReferrals;
        } else if (args.userId) {
            // Legacy: query users table
            // 1. Get Direct Referrals
            const directReferrals = await ctx.db
                .query("users")
                .withIndex("by_referrerId", (q) => q.eq("referrerId", args.userId))
                .collect();

            // 2. Get Indirect Referrals (L2)
            const indirectReferrals = [];

            for (const direct of directReferrals) {
                const l2 = await ctx.db
                    .query("users")
                    .withIndex("by_referrerId", (q) => q.eq("referrerId", direct._id))
                    .collect();

                // Add context about who referred them
                for (const user of l2) {
                    indirectReferrals.push({
                        ...user,
                        referredBy: direct.name
                    });
                }
            }

            return indirectReferrals;
        }
        return [];
    },
});

/**
 * Get Unilevel tree structure for visualization
 * Builds a tree from referrerId relationships up to 10 levels deep
 */
export const getUnilevelTree = query({
    args: { 
        userId: v.optional(v.id("users")),
        accountId: v.optional(v.id("accounts")),
        maxLevels: v.optional(v.number()) // Default to 10, but allow customization
    },
    handler: async (ctx, args) => {
        const maxLevels = args.maxLevels ?? 10;
        
        if (args.accountId) {
            // Build tree using accounts
            async function buildTree(currentAccountId: Id<"accounts">, currentLevel: number): Promise<any> {
                const account = await ctx.db.get(currentAccountId);
                if (!account || account.isDeleted) return null;

                // If we've reached max depth, return just the node without children
                if (currentLevel >= maxLevels) {
                    return {
                        name: account.name,
                        attributes: {
                            Rank: account.currentRank || "B0",
                            Volume: `$${(account.teamVolume || 0).toFixed(2)}`,
                            Directs: 0,
                            Unlocked: `${account.unlockedLevels || 0}/10`,
                            Level: currentLevel,
                            ReferralCode: account.referralCode || "",
                        },
                        children: undefined,
                    };
                }

                // Get all direct referrals (children in the tree)
                const directReferrals = await ctx.db
                    .query("accounts")
                    .withIndex("by_referrerId", (q) => q.eq("referrerId", currentAccountId))
                    .filter((q) => q.neq(q.field("isDeleted"), true))
                    .collect();

                const children = [];
                
                // Recursively build tree for each direct referral
                for (const referral of directReferrals) {
                    const childTree = await buildTree(referral._id, currentLevel + 1);
                    if (childTree) {
                        children.push(childTree);
                    }
                }

                return {
                    name: account.name,
                    attributes: {
                        Rank: account.currentRank || "B0",
                        Volume: `$${(account.teamVolume || 0).toFixed(2)}`,
                        Directs: directReferrals.length,
                        Unlocked: `${account.unlockedLevels || 0}/10`,
                        Level: currentLevel,
                        ReferralCode: account.referralCode || "",
                    },
                    children: children.length > 0 ? children : undefined,
                };
            }

            const treeData = await buildTree(args.accountId, 0);
            return treeData;
        } else if (args.userId) {
            // Legacy: build tree using users
            async function buildTree(currentUserId: Id<"users">, currentLevel: number): Promise<any> {
                const user = await ctx.db.get(currentUserId);
                if (!user) return null;

                // If we've reached max depth, return just the node without children
                if (currentLevel >= maxLevels) {
                    return {
                        name: user.name,
                        attributes: {
                            Rank: user.currentRank || "B0",
                            Volume: `$${(user.teamVolume || 0).toFixed(2)}`,
                            Directs: 0,
                            Unlocked: `${user.unlockedLevels || 0}/10`,
                            Level: currentLevel,
                            Email: user.email || "",
                        },
                        children: undefined,
                    };
                }

                // Get all direct referrals (children in the tree)
                const directReferrals = await ctx.db
                    .query("users")
                    .withIndex("by_referrerId", (q) => q.eq("referrerId", currentUserId))
                    .collect();

                const children = [];
                
                // Recursively build tree for each direct referral
                for (const referral of directReferrals) {
                    const childTree = await buildTree(referral._id, currentLevel + 1);
                    if (childTree) {
                        children.push(childTree);
                    }
                }

                return {
                    name: user.name,
                    attributes: {
                        Rank: user.currentRank || "B0",
                        Volume: `$${(user.teamVolume || 0).toFixed(2)}`,
                        Directs: directReferrals.length,
                        Unlocked: `${user.unlockedLevels || 0}/10`,
                        Level: currentLevel,
                        Email: user.email || "",
                    },
                    children: children.length > 0 ? children : undefined,
                };
            }

            const treeData = await buildTree(args.userId, 0);
            return treeData;
        }
        return null;
    },
});

export const updatePassword = mutation({
    args: {
        userId: v.id("users"),
        oldPassword: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw createError(ErrorCodes.USER_NOT_FOUND);

        if (!user.password) {
            // Allow setting password if none exists (legacy users)
        } else {
            const isValid = bcrypt.compareSync(args.oldPassword, user.password);
            if (!isValid) {
                throw createError(ErrorCodes.UNAUTHORIZED, 'Incorrect old password');
            }
        }

        if (args.newPassword.length < 6) {
            throw createError(ErrorCodes.VALIDATION_ERROR, 'New password must be at least 6 characters long');
        }

        const newHash = bcrypt.hashSync(args.newPassword, 10);
        await ctx.db.patch(args.userId, { password: newHash });

        return { success: true };
    },
});

export const getAllUsers = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
    },
});

export const updateUserRank = mutation({
    args: { userId: v.id("users"), rank: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { currentRank: args.rank });
    },
});

export const updateUserBalance = mutation({
    args: { userId: v.id("users"), amount: v.number() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { walletBalance: args.amount });
    },
});

export const getUserEarnings = query({
    args: { 
        userId: v.optional(v.id("users")),
        accountId: v.optional(v.union(v.id("accounts"), v.id("users"))), // Can be either for multi-account migration
    },
    handler: async (ctx, args) => {
        // Get all transactions for this account/user
        // Handle case where accountId might actually be a userId (from activeAccountId fallback)
        let transactions = [];
        const targetId = args.accountId || args.userId;
        
        if (!targetId) {
            // Return empty earnings if no ID provided
            return {
                summary: {
                    totalYield: 0,
                    totalDirectCommissions: 0,
                    totalIndirectCommissions: 0,
                    totalUnilevelCommissions: 0,
                    totalVRankBonuses: 0,
                    totalEarnings: 0,
                },
                recent: {
                    yield: [],
                    directCommissions: [],
                    indirectCommissions: [],
                    unilevelCommissions: [],
                    vrankBonuses: [],
                },
            };
        }

        // Try to determine if it's an account or user by checking which table it belongs to
        let isAccount = false;
        try {
            const account = await ctx.db.get(targetId as any);
            if (account && "loginId" in account) {
                isAccount = true; // Accounts have loginId field
            }
        } catch {
            // If get fails, it might be a userId
        }

        // Query transactions by the appropriate index
        if (isAccount) {
            // Query by accountId
            transactions = await ctx.db
                .query("transactions")
                .withIndex("by_accountId", (q) => q.eq("accountId", targetId as any))
                .order("desc")
                .collect();
        } else {
            // Query by userId (legacy or when activeAccountId is actually a userId)
            transactions = await ctx.db
                .query("transactions")
                .withIndex("by_userId", (q) => q.eq("userId", targetId as any))
                .order("desc")
                .collect();
        }

        // Categorize earnings
        // Include both regular types and "bls_earned" transactions that match the category
        // This handles both old transactions (bls_earned) and new ones (properly typed)
        // Also handles unilevel commissions which should be included in indirect commissions
        const yieldTransactions = transactions.filter(t => {
            if (t.type === "yield") return true;
            if (t.type === "bls_earned") {
                const desc = t.description?.toLowerCase() || "";
                return desc.includes("daily yield") || desc.includes("yield for");
            }
            return false;
        });
        
        const directCommissions = transactions.filter(t => {
            if (t.type === "commission_direct") return true;
            if (t.type === "bls_earned") {
                const desc = t.description?.toLowerCase() || "";
                return desc.includes("l1") || desc.includes("direct") || 
                       (desc.includes("referral") && !desc.includes("l2") && !desc.includes("indirect"));
            }
            return false;
        });
        
        // Separate L2 indirect commissions from Unilevel commissions
        const indirectCommissions = transactions.filter(t => {
            if (t.type === "commission_indirect") return true;
            if (t.type === "bls_earned") {
                const desc = t.description?.toLowerCase() || "";
                return (desc.includes("l2") || desc.includes("indirect")) && 
                       !desc.includes("unilevel") &&
                       (desc.includes("referral") && (desc.includes("l2") || desc.includes("indirect")));
            }
            return false;
        });

        const unilevelCommissions = transactions.filter(t => {
            if (t.type === "commission_unilevel") return true;
            if (t.type === "bls_earned") {
                const desc = t.description?.toLowerCase() || "";
                return desc.includes("unilevel");
            }
            return false;
        });
        
        const vrankBonuses = transactions.filter(t => {
            if (t.type === "commission_vrank") return true;
            if (t.type === "bls_earned") {
                const desc = t.description?.toLowerCase() || "";
                return desc.includes("rank bonus") || desc.includes("b-rank") || 
                       desc.includes("b1 rank") || desc.includes("b2 rank") || 
                       desc.includes("b3 rank") || desc.includes("b4 rank") ||
                       desc.includes("b5 rank") || desc.includes("b6 rank") ||
                       desc.includes("b7 rank") || desc.includes("b8 rank") ||
                       desc.includes("b9 rank");
            }
            return false;
        });

        // Calculate totals
        const totalYield = yieldTransactions.reduce((sum, t) => sum + t.amount, 0);
        const totalDirectCommissions = directCommissions.reduce((sum, t) => sum + t.amount, 0);
        const totalIndirectCommissions = indirectCommissions.reduce((sum, t) => sum + t.amount, 0);
        const totalUnilevelCommissions = unilevelCommissions.reduce((sum, t) => sum + t.amount, 0);
        const totalVRankBonuses = vrankBonuses.reduce((sum, t) => sum + t.amount, 0);

        return {
            summary: {
                totalYield,
                totalDirectCommissions,
                totalIndirectCommissions,
                totalUnilevelCommissions,
                totalVRankBonuses,
                totalEarnings: totalYield + totalDirectCommissions + totalIndirectCommissions + totalUnilevelCommissions + totalVRankBonuses,
            },
            recent: {
                yield: yieldTransactions.slice(0, 5),
                directCommissions: directCommissions.slice(0, 5),
                indirectCommissions: indirectCommissions.slice(0, 5),
                unilevelCommissions: unilevelCommissions.slice(0, 5),
                vrankBonuses: vrankBonuses.slice(0, 5),
            },
        };
    },
});

/**
 * TEST HELPER: Set user role to admin
 * Use this to make yourself an admin for testing
 */
export const setUserRole = mutation({
    args: {
        email: v.string(),
        role: v.string(), // "admin" or leave empty for regular user
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
            .unique();

        if (!user) {
            throw new Error(`User with email ${args.email} not found`);
        }

        await ctx.db.patch(user._id, {
            role: args.role || undefined,
        });

        return {
            success: true,
            message: `User ${args.email} role set to: ${args.role || "regular user"}`,
            userId: user._id,
        };
    },
});

/**
 * Helper: Get user by ID
 */
export const getUserById = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

/**
 * Helper: Get loginId and accountId from userId (for legacy users)
 */
export const getLoginByUserId = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;

        // Find login by email
        const login = await ctx.db
            .query("logins")
            .withIndex("by_email", (q) => q.eq("email", user.email))
            .first();

        if (!login) return null;

        // Find default account for this login
        const account = await ctx.db
            .query("accounts")
            .withIndex("by_loginId", (q) => q.eq("loginId", login._id))
            .filter((q) => q.eq(q.field("isDefault"), true))
            .first();

        return {
            loginId: login._id,
            accountId: account?._id || null,
        };
    },
});

/**
 * Helper: Get user by email
 */
export const getUserByEmail = query({
    args: {
        email: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
            .unique();
    },
});

/**
 * TEST HELPER: Add funds to user wallet for testing
 */
export const addTestFunds = mutation({
    args: {
        email: v.string(),
        amount: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
            .unique();

        if (!user) {
            throw new Error(`User with email ${args.email} not found`);
        }

        const newBalance = (user.walletBalance || 0) + args.amount;
        await ctx.db.patch(user._id, {
            walletBalance: newBalance,
        });

        return {
            success: true,
            newBalance,
            message: `Added $${args.amount} to ${args.email}. New balance: $${newBalance}`,
        };
    },
});

/**
 * Store 2FA secret (helper mutation called by action)
 */
export const store2FASecret = mutation({
    args: {
        userId: v.id("users"),
        secret: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw createError(ErrorCodes.USER_NOT_FOUND);

        // Store secret temporarily (not enabled yet - will be enabled after verification)
        await ctx.db.patch(args.userId, {
            twoFactorSecret: args.secret,
        });
    },
});

/**
 * Enable 2FA for user (helper mutation called by action after verification)
 */
export const enable2FA = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw createError(ErrorCodes.USER_NOT_FOUND);

        if (!user.twoFactorSecret) {
            throw createError(ErrorCodes.TWO_FACTOR_NOT_SETUP, "2FA secret not found");
        }

        // Enable 2FA for user
        await ctx.db.patch(args.userId, {
            twoFactorEnabled: true,
            twoFactorSetupAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Get user 2FA secret (helper query for actions)
 */
export const get2FASecret = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw createError(ErrorCodes.USER_NOT_FOUND);
        return {
            twoFactorEnabled: user.twoFactorEnabled ?? false,
            twoFactorSecret: user.twoFactorSecret ?? null,
        };
    },
});

/**
 * Complete login after 2FA verification (helper mutation called by action)
 */
export const completeLoginAfter2FA = mutation({
    args: {
        userId: v.id("users"),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw createError(ErrorCodes.USER_NOT_FOUND);

        // Complete login - update login info
        await ctx.db.patch(user._id, {
            loginAttempts: 0,
            lockedUntil: undefined,
            lastLoginAt: Date.now(),
            lastLoginIp: args.ipAddress,
        });

        // Log successful login with 2FA
        await ctx.db.insert("security_audit_log", {
            userId: user._id,
            action: "login_2fa",
            status: "success",
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            timestamp: Date.now(),
        });

        return { success: true, userId: user._id };
    },
});

/**
 * Log failed 2FA attempt (helper mutation called by action)
 */
export const logFailed2FA = mutation({
    args: {
        userId: v.id("users"),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("security_audit_log", {
            userId: args.userId,
            action: "login_2fa",
            status: "failed",
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            metadata: { reason: args.reason || "Invalid 2FA code" },
            timestamp: Date.now(),
        });
    },
});

