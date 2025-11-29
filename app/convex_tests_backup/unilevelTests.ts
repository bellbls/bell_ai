import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

/**
 * Test Scenario 1: Basic Commission Flow
 * 
 * Setup:
 * - User A refers User B
 * - User B stakes $100 with 2% daily yield = $2/day
 * - User A has 1 active direct → 2 levels unlocked
 * 
 * Expected:
 * - User B receives $2 daily yield
 * - User A receives L1 commission: $2 × 3% = $0.06
 */
export const testBasicCommissionFlow = mutation({
    args: {},
    handler: async (ctx) => {
        const results: any = {
            step: "",
            success: false,
            data: {},
            errors: [],
        };

        try {
            // Step 1: Create User A
            results.step = "Creating User A";
            const userAId = await ctx.db.insert("users", {
                name: "Test User A",
                email: "test.usera@example.com",
                referralCode: "TESTUSERA",
                currentRank: "B0",
                teamVolume: 0,
                directReferralsCount: 0,
                walletBalance: 0,
                createdAt: Date.now(),
            });
            results.data.userAId = userAId;

            // Step 2: Create User B (referred by A)
            results.step = "Creating User B";
            const userBId = await ctx.db.insert("users", {
                name: "Test User B",
                email: "test.userb@example.com",
                referralCode: "TESTUSERB",
                referrerId: userAId,
                currentRank: "B0",
                teamVolume: 0,
                directReferralsCount: 0,
                walletBalance: 100, // Give balance for staking
                createdAt: Date.now(),
            });
            results.data.userBId = userBId;

            // Step 3: Create stake for User B
            results.step = "Creating stake for User B";
            const stakeId = await ctx.db.insert("stakes", {
                userId: userBId,
                amount: 100,
                cycleDays: 30,
                dailyRate: 2,
                startDate: Date.now(),
                endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
                status: "active",
                lastYieldDate: Date.now(),
            });
            results.data.stakeId = stakeId;

            // Step 4: Update User A's active directs
            results.step = "Updating User A's active directs";
            const { updateActiveDirects } = await import("../unilevel/activeDirectsCalculator");
            const { activeDirects, unlockedLevels } = await updateActiveDirects(ctx, userAId);
            results.data.activeDirects = activeDirects;
            results.data.unlockedLevels = unlockedLevels;

            // Step 5: Manually distribute yield and commissions
            results.step = "Distributing yield and commissions";
            const dailyYield = 2; // $100 × 2% = $2

            // Give yield to User B
            const userB = await ctx.db.get(userBId);
            if (userB) {
                await ctx.db.patch(userBId, {
                    walletBalance: userB.walletBalance + dailyYield,
                });
            }

            // Distribute Unilevel commissions
            const { distributeUnilevelCommissions } = await import("../unilevel/commissionDistributor");
            await distributeUnilevelCommissions(ctx, stakeId, dailyYield);

            // Step 6: Verify results
            results.step = "Verifying results";
            const userAUpdated = await ctx.db.get(userAId);
            const userBUpdated = await ctx.db.get(userBId);

            results.data.userABalance = userAUpdated?.walletBalance || 0;
            results.data.userBBalance = userBUpdated?.walletBalance || 0;

            // Check commission transactions
            const commissionTxs = await ctx.db
                .query("transactions")
                .withIndex("by_userId", (q) => q.eq("userId", userAId))
                .filter((q) => q.eq(q.field("type"), "commission_unilevel"))
                .collect();
            results.data.commissionTransactions = commissionTxs.length;

            // Check commission history
            const commissionHistory = await ctx.db
                .query("commission_history")
                .withIndex("by_userId", (q) => q.eq("userId", userAId))
                .collect();
            results.data.commissionHistory = commissionHistory.length;
            results.data.totalCommission = commissionHistory.reduce((sum, c) => sum + c.commissionAmount, 0);

            // Verify expected values
            const expectedCommission = 0.06; // $2 × 3%
            const actualCommission = userAUpdated?.walletBalance || 0;
            const commissionMatch = Math.abs(actualCommission - expectedCommission) < 0.001;

            results.success = commissionMatch && activeDirects === 1 && unlockedLevels === 2;
            results.data.expectedCommission = expectedCommission;
            results.data.actualCommission = actualCommission;
            results.data.commissionMatch = commissionMatch;

            if (results.success) {
                results.step = "✅ Test PASSED";
            } else {
                results.step = "❌ Test FAILED";
                results.errors.push("Commission amount mismatch or unlock levels incorrect");
            }

        } catch (error: any) {
            results.success = false;
            results.errors.push(error.message);
        }

        return results;
    },
});

/**
 * Test Scenario 2: Progressive Unlock (3 Directs → 6 Levels)
 */
export const testProgressiveUnlock = mutation({
    args: {},
    handler: async (ctx) => {
        const results: any = {
            step: "",
            success: false,
            data: {},
            errors: [],
        };

        try {
            // Create User A
            const userAId = await ctx.db.insert("users", {
                name: "Test User A",
                email: "test.unlock.a@example.com",
                referralCode: "TESTUNLOCKA",
                currentRank: "B0",
                teamVolume: 0,
                directReferralsCount: 0,
                walletBalance: 0,
                createdAt: Date.now(),
            });

            // Create 3 direct referrals with stakes
            const directs = [];
            for (let i = 1; i <= 3; i++) {
                const userId = await ctx.db.insert("users", {
                    name: `Test Direct ${i}`,
                    email: `test.direct${i}@example.com`,
                    referralCode: `TESTDIRECT${i}`,
                    referrerId: userAId,
                    currentRank: "B0",
                    teamVolume: 0,
                    directReferralsCount: 0,
                    walletBalance: 0,
                    createdAt: Date.now(),
                });

                // Create stake for each direct
                await ctx.db.insert("stakes", {
                    userId: userId,
                    amount: 100,
                    cycleDays: 30,
                    dailyRate: 2,
                    startDate: Date.now(),
                    endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
                    status: "active",
                    lastYieldDate: Date.now(),
                });

                directs.push(userId);
            }

            // Update User A's active directs
            const { updateActiveDirects } = await import("../unilevel/activeDirectsCalculator");
            const { activeDirects, unlockedLevels } = await updateActiveDirects(ctx, userAId);

            results.data.activeDirects = activeDirects;
            results.data.unlockedLevels = unlockedLevels;
            results.success = activeDirects === 3 && unlockedLevels === 6;

            if (results.success) {
                results.step = "✅ Progressive Unlock Test PASSED";
            } else {
                results.step = "❌ Progressive Unlock Test FAILED";
                results.errors.push(`Expected 3 active directs and 6 unlocked levels, got ${activeDirects} and ${unlockedLevels}`);
            }

        } catch (error: any) {
            results.success = false;
            results.errors.push(error.message);
        }

        return results;
    },
});

/**
 * Clean up test data
 */
export const cleanupTestData = mutation({
    args: {},
    handler: async (ctx) => {
        // Delete test users
        const testUsers = await ctx.db
            .query("users")
            .filter((q) => q.or(
                q.eq(q.field("email"), "test.usera@example.com"),
                q.eq(q.field("email"), "test.userb@example.com"),
                q.like(q.field("email"), "test.unlock%"),
                q.like(q.field("email"), "test.direct%")
            ))
            .collect();

        for (const user of testUsers) {
            // Delete user's stakes
            const stakes = await ctx.db
                .query("stakes")
                .withIndex("by_userId", (q) => q.eq("userId", user._id))
                .collect();
            for (const stake of stakes) {
                await ctx.db.delete(stake._id);
            }

            // Delete user's transactions
            const transactions = await ctx.db
                .query("transactions")
                .withIndex("by_userId", (q) => q.eq("userId", user._id))
                .collect();
            for (const tx of transactions) {
                await ctx.db.delete(tx._id);
            }

            // Delete user's commission history
            const commissions = await ctx.db
                .query("commission_history")
                .withIndex("by_userId", (q) => q.eq("userId", user._id))
                .collect();
            for (const comm of commissions) {
                await ctx.db.delete(comm._id);
            }

            // Delete user
            await ctx.db.delete(user._id);
        }

        return { success: true, message: "Test data cleaned up" };
    },
});
