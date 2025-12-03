import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration script to convert existing users to logins + accounts structure
 * 
 * This migration:
 * 1. Creates a login record for each existing user
 * 2. Creates an account record with all business data
 * 3. Updates all related records to use accountId instead of userId
 * 
 * IMPORTANT: This should be run once during the migration period.
 * It's idempotent - safe to run multiple times (checks if migration already done).
 */

export const migrateToMultiAccount = internalMutation({
    args: {},
    handler: async (ctx) => {
        const MIGRATION_KEY = "multi_account_migration_completed";
        
        // Check if migration already completed
        const migrationStatus = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", MIGRATION_KEY))
            .first();
            
        if (migrationStatus?.value === true) {
            console.log("Migration already completed. Skipping.");
            return { success: true, message: "Migration already completed", migrated: 0 };
        }

        console.log("Starting multi-account migration...");
        let migratedCount = 0;
        let errorCount = 0;

        // Get all existing users
        const users = await ctx.db.query("users").collect();
        console.log(`Found ${users.length} users to migrate`);

        for (const user of users) {
            try {
                // Check if login already exists for this email
                const existingLogin = await ctx.db
                    .query("logins")
                    .withIndex("by_email", (q) => q.eq("email", user.email))
                    .first();

                let loginId;
                if (existingLogin) {
                    loginId = existingLogin._id;
                    console.log(`Login already exists for ${user.email}, using existing login`);
                } else {
                    // 1. Create login record
                    loginId = await ctx.db.insert("logins", {
                        email: user.email,
                        password: user.password,
                        emailVerified: user.emailVerified,
                        emailVerificationToken: user.emailVerificationToken,
                        emailVerificationExpiry: user.emailVerificationExpiry,
                        passwordResetToken: user.passwordResetToken,
                        passwordResetExpiry: user.passwordResetExpiry,
                        lastLoginAt: user.lastLoginAt,
                        lastLoginIp: user.lastLoginIp,
                        loginAttempts: user.loginAttempts,
                        lockedUntil: user.lockedUntil,
                        twoFactorEnabled: user.twoFactorEnabled,
                        twoFactorSecret: user.twoFactorSecret,
                        twoFactorBackupCodes: user.twoFactorBackupCodes,
                        twoFactorSetupAt: user.twoFactorSetupAt,
                        twoFactorRequiredAt: user.twoFactorRequiredAt,
                        createdAt: user.createdAt,
                    });
                    console.log(`Created login for ${user.email}`);
                }

                // Check if account already exists for this login
                const existingAccount = await ctx.db
                    .query("accounts")
                    .withIndex("by_loginId", (q) => q.eq("loginId", loginId))
                    .filter((q) => q.eq(q.field("isDefault"), true))
                    .first();

                let accountId;
                if (existingAccount) {
                    accountId = existingAccount._id;
                    console.log(`Account already exists for ${user.email}, using existing account`);
                } else {
                    // 2. Create account record with business data
                    accountId = await ctx.db.insert("accounts", {
                        loginId: loginId,
                        name: user.name,
                        referralCode: user.referralCode,
                        role: user.role,
                        isDefault: true,
                        isDeleted: false,
                        parentId: undefined, // Will be updated after all accounts are created
                        leftLegId: undefined,
                        rightLegId: undefined,
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
                    });
                    console.log(`Created account for ${user.email}`);
                }

                // 3. Update all related records to use accountId
                // Note: We'll keep userId for backward compatibility during transition
                
                // Update stakes
                const stakes = await ctx.db
                    .query("stakes")
                    .withIndex("by_userId", (q) => q.eq("userId", user._id))
                    .collect();
                for (const stake of stakes) {
                    if (!stake.accountId) {
                        await ctx.db.patch(stake._id, { accountId: accountId });
                    }
                }

                // Update transactions
                const transactions = await ctx.db
                    .query("transactions")
                    .withIndex("by_userId", (q) => q.eq("userId", user._id))
                    .collect();
                for (const tx of transactions) {
                    if (!tx.accountId) {
                        await ctx.db.patch(tx._id, { accountId: accountId });
                    }
                }

                // Update withdrawals
                const withdrawals = await ctx.db
                    .query("withdrawals")
                    .withIndex("by_userId", (q) => q.eq("userId", user._id))
                    .collect();
                for (const withdrawal of withdrawals) {
                    if (!withdrawal.accountId) {
                        await ctx.db.patch(withdrawal._id, { accountId: accountId });
                    }
                }

                // Update notifications
                const notifications = await ctx.db
                    .query("notifications")
                    .withIndex("by_userId", (q) => q.eq("userId", user._id))
                    .collect();
                for (const notification of notifications) {
                    if (!notification.accountId) {
                        await ctx.db.patch(notification._id, { accountId: accountId });
                    }
                }

                // Update commission_history
                const commissionHistory = await ctx.db
                    .query("commission_history")
                    .withIndex("by_userId", (q) => q.eq("userId", user._id))
                    .collect();
                for (const comm of commissionHistory) {
                    if (!comm.accountId) {
                        await ctx.db.patch(comm._id, { accountId: accountId });
                    }
                }

                // Update saved_wallets
                const savedWallets = await ctx.db
                    .query("saved_wallets")
                    .withIndex("by_userId", (q) => q.eq("userId", user._id))
                    .collect();
                for (const wallet of savedWallets) {
                    if (!wallet.accountId) {
                        await ctx.db.patch(wallet._id, { accountId: accountId });
                    }
                }

                // Update deposit_logs
                const depositLogs = await ctx.db
                    .query("deposit_logs")
                    .withIndex("by_userId", (q) => q.eq("userId", user._id))
                    .collect();
                for (const log of depositLogs) {
                    if (!log.accountId) {
                        await ctx.db.patch(log._id, { accountId: accountId });
                    }
                }

                // Update presaleOrders
                const presaleOrders = await ctx.db
                    .query("presaleOrders")
                    .withIndex("by_userId", (q) => q.eq("userId", user._id))
                    .collect();
                for (const order of presaleOrders) {
                    if (!order.accountId) {
                        await ctx.db.patch(order._id, { accountId: accountId });
                    }
                }

                // Update presaleStakes
                const presaleStakes = await ctx.db
                    .query("presaleStakes")
                    .withIndex("by_userId", (q) => q.eq("userId", user._id))
                    .collect();
                for (const stake of presaleStakes) {
                    if (!stake.accountId) {
                        await ctx.db.patch(stake._id, { accountId: accountId });
                    }
                }

                // Update blsSwapRequests
                const blsSwaps = await ctx.db
                    .query("blsSwapRequests")
                    .withIndex("by_userId", (q) => q.eq("userId", user._id))
                    .collect();
                for (const swap of blsSwaps) {
                    if (!swap.accountId) {
                        await ctx.db.patch(swap._id, { accountId: accountId });
                    }
                }

                // Update presaleAuditLog
                const auditLogs = await ctx.db
                    .query("presaleAuditLog")
                    .withIndex("by_userId", (q) => q.eq("userId", user._id))
                    .collect();
                for (const log of auditLogs) {
                    if (!log.accountId) {
                        await ctx.db.patch(log._id, { accountId: accountId });
                    }
                }

                migratedCount++;
            } catch (error: any) {
                console.error(`Error migrating user ${user.email}:`, error);
                errorCount++;
            }
        }

        // Now update referral relationships (referrerId, parentId) to use accountId
        console.log("Updating referral relationships...");
        const accounts = await ctx.db.query("accounts").collect();
        const accountMap = new Map<string, string>(); // user._id -> account._id

        for (const account of accounts) {
            // Find the original user by login email
            const login = await ctx.db.get(account.loginId);
            if (login) {
                const originalUser = await ctx.db
                    .query("users")
                    .withIndex("by_email", (q) => q.eq("email", login.email))
                    .first();
                if (originalUser) {
                    accountMap.set(originalUser._id, account._id);
                }
            }
        }

        // Update referrerId and parentId in accounts
        for (const account of accounts) {
            const login = await ctx.db.get(account.loginId);
            if (login) {
                const originalUser = await ctx.db
                    .query("users")
                    .withIndex("by_email", (q) => q.eq("email", login.email))
                    .first();
                    
                if (originalUser) {
                    const updates: any = {};
                    
                    if (originalUser.referrerId) {
                        const referrerAccountId = accountMap.get(originalUser.referrerId);
                        if (referrerAccountId) {
                            updates.referrerId = referrerAccountId as any;
                        }
                    }
                    
                    if (originalUser.parentId) {
                        const parentAccountId = accountMap.get(originalUser.parentId);
                        if (parentAccountId) {
                            updates.parentId = parentAccountId as any;
                        }
                    }
                    
                    if (originalUser.leftLegId) {
                        const leftLegAccountId = accountMap.get(originalUser.leftLegId);
                        if (leftLegAccountId) {
                            updates.leftLegId = leftLegAccountId as any;
                        }
                    }
                    
                    if (originalUser.rightLegId) {
                        const rightLegAccountId = accountMap.get(originalUser.rightLegId);
                        if (rightLegAccountId) {
                            updates.rightLegId = rightLegAccountId as any;
                        }
                    }
                    
                    if (Object.keys(updates).length > 0) {
                        await ctx.db.patch(account._id, updates);
                    }
                }
            }
        }

        // Update sourceUserId in transactions and commission_history
        console.log("Updating source references in transactions and commission_history...");
        const allTransactions = await ctx.db.query("transactions").collect();
        for (const tx of allTransactions) {
            if (tx.sourceUserId && !tx.sourceAccountId) {
                const sourceAccountId = accountMap.get(tx.sourceUserId);
                if (sourceAccountId) {
                    await ctx.db.patch(tx._id, { sourceAccountId: sourceAccountId as any });
                }
            }
        }

        const allCommissionHistory = await ctx.db.query("commission_history").collect();
        for (const comm of allCommissionHistory) {
            if (comm.sourceUserId && !comm.sourceAccountId) {
                const sourceAccountId = accountMap.get(comm.sourceUserId);
                if (sourceAccountId) {
                    await ctx.db.patch(comm._id, { sourceAccountId: sourceAccountId as any });
                }
            }
        }

        // Mark migration as completed
        const existingConfig = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", MIGRATION_KEY))
            .first();

        if (existingConfig) {
            await ctx.db.patch(existingConfig._id, { value: true });
        } else {
            await ctx.db.insert("configs", {
                key: MIGRATION_KEY,
                value: true,
            });
        }

        console.log(`Migration completed. Migrated ${migratedCount} users, ${errorCount} errors.`);
        return {
            success: true,
            message: `Migration completed successfully`,
            migrated: migratedCount,
            errors: errorCount,
        };
    },
});

