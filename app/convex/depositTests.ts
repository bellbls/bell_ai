import { mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { createError, ErrorCodes } from "./errors";

/**
 * Test Suite for Manual Deposit Function
 * Run: npx convex run depositTests:<testName>
 * 
 * Tests:
 * - testValidDeposit: Valid deposit flow
 * - testInvalidAmount: Invalid amount scenarios
 * - testUserNotFound: Missing user handling
 * - testBalanceUpdate: Balance calculation accuracy
 * - testTransactionLogging: Transaction record creation
 * - testOptionalParameters: Optional txHash and method
 */

/**
 * Test: Valid deposit with all parameters
 */
export const testValidDeposit = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // 1. Create test user
        const userId = await ctx.db.insert("users", {
            name: "Test User",
            email: `test${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `TEST${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 100.00, // Starting balance
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const initialBalance = 100.00;
        const depositAmount = 50.00;

        // 2. Execute deposit
        const result = await ctx.runMutation(api.wallet.deposit, {
            userId,
            amount: depositAmount,
            txHash: "0x1234567890abcdef",
            method: "crypto",
        });

        // 3. Verify result
        if (!result.success) {
            throw new Error(`Deposit failed: ${result.message || "Unknown error"}`);
        }

        const expectedBalance = initialBalance + depositAmount;
        if (result.newBalance !== expectedBalance) {
            throw new Error(
                `Balance mismatch. Expected: ${expectedBalance}, Got: ${result.newBalance}`
            );
        }

        // 4. Verify user balance updated
        const user = await ctx.db.get(userId);
        if (!user || user.walletBalance !== expectedBalance) {
            throw new Error(
                `User balance not updated. Expected: ${expectedBalance}, Got: ${user?.walletBalance}`
            );
        }

        // 5. Verify transaction created
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("type"), "deposit"))
            .collect();

        const depositTransaction = transactions.find(
            (t) => t.amount === depositAmount
        );

        if (!depositTransaction) {
            throw new Error("Deposit transaction not found");
        }

        if (!depositTransaction.description.includes("crypto")) {
            throw new Error("Transaction description missing method");
        }

        if (!depositTransaction.description.includes("0x12345")) {
            throw new Error("Transaction description missing txHash");
        }

        return {
            success: true,
            message: "Valid deposit test passed",
            userId,
            initialBalance,
            depositAmount,
            finalBalance: result.newBalance,
            transactionId: depositTransaction._id,
        };
    },
});

/**
 * Test: Invalid amount scenarios (zero, negative, NaN)
 */
export const testInvalidAmount = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // Create test user
        const userId = await ctx.db.insert("users", {
            name: "Test User",
            email: `test${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `TEST${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 100.00,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const testCases = [
            { amount: 0, description: "zero amount" },
            { amount: -10, description: "negative amount" },
            { amount: NaN, description: "NaN amount" },
            { amount: Infinity, description: "infinity amount" },
        ];

        const errors: string[] = [];

        for (const testCase of testCases) {
            try {
                await ctx.runMutation(api.wallet.deposit, {
                    userId,
                    amount: testCase.amount as any,
                });
                errors.push(`Should have failed for ${testCase.description}`);
            } catch (error: any) {
                // Expected to fail
                if (!error.message || !error.message.includes("greater than 0")) {
                    errors.push(
                        `Wrong error message for ${testCase.description}: ${error.message}`
                    );
                }
            }
        }

        if (errors.length > 0) {
            throw new Error(`Invalid amount tests failed:\n${errors.join("\n")}`);
        }

        // Verify balance unchanged
        const user = await ctx.db.get(userId);
        if (!user || user.walletBalance !== 100.00) {
            throw new Error(
                `Balance should not change. Expected: 100.00, Got: ${user?.walletBalance}`
            );
        }

        return {
            success: true,
            message: "Invalid amount tests passed",
            testCases: testCases.length,
        };
    },
});

/**
 * Test: User not found scenario
 */
export const testUserNotFound = mutation({
    args: {},
    handler: async (ctx) => {
        // Try to deposit to non-existent user
        // Use a valid-looking but non-existent ID format
        const fakeUserId = "j123456789012345678901234" as any;

        try {
            await ctx.runMutation(api.wallet.deposit, {
                userId: fakeUserId,
                amount: 100.00,
            });
            throw new Error("Should have thrown USER_NOT_FOUND error");
        } catch (error: any) {
            if (!error.message || !error.message.toLowerCase().includes("not found")) {
                throw new Error(
                    `Wrong error message. Expected USER_NOT_FOUND, got: ${error.message}`
                );
            }
        }

        return {
            success: true,
            message: "User not found test passed",
        };
    },
});

/**
 * Test: Balance update accuracy
 */
export const testBalanceUpdate = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // Create test user with zero balance
        const userId = await ctx.db.insert("users", {
            name: "Test User",
            email: `test${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `TEST${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const deposits = [
            { amount: 10.50, expected: 10.50 },
            { amount: 25.75, expected: 36.25 },
            { amount: 100.00, expected: 136.25 },
            { amount: 0.01, expected: 136.26 }, // Test precision
        ];

        let currentBalance = 0;

        for (const deposit of deposits) {
            // Execute deposit
            const result = await ctx.runMutation(api.wallet.deposit, {
                userId,
                amount: deposit.amount,
            });

            currentBalance += deposit.amount;
            const expectedBalance = deposit.expected;

            // Verify return value
            if (Math.abs(result.newBalance - expectedBalance) > 0.001) {
                throw new Error(
                    `Balance mismatch after deposit ${deposit.amount}. ` +
                    `Expected: ${expectedBalance}, Got: ${result.newBalance}`
                );
            }

            // Verify database value
            const user = await ctx.db.get(userId);
            if (!user) {
                throw new Error("User not found");
            }

            if (Math.abs(user.walletBalance - expectedBalance) > 0.001) {
                throw new Error(
                    `Database balance mismatch after deposit ${deposit.amount}. ` +
                    `Expected: ${expectedBalance}, Got: ${user.walletBalance}`
                );
            }
        }

        return {
            success: true,
            message: "Balance update test passed",
            finalBalance: currentBalance,
            depositsProcessed: deposits.length,
        };
    },
});

/**
 * Test: Transaction logging
 */
export const testTransactionLogging = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // Create test user
        const userId = await ctx.db.insert("users", {
            name: "Test User",
            email: `test${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `TEST${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const depositAmount = 100.00;
        const txHash = "0xabcdef1234567890";
        const method = "bank_transfer";

        // Execute deposit
        await ctx.runMutation(api.wallet.deposit, {
            userId,
            amount: depositAmount,
            txHash,
            method,
        });

        // Get all transactions for user
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("type"), "deposit"))
            .collect();

        if (transactions.length === 0) {
            throw new Error("No transactions found");
        }

        const depositTransaction = transactions[transactions.length - 1]; // Most recent

        // Verify transaction fields
        if (depositTransaction.amount !== depositAmount) {
            throw new Error(
                `Transaction amount mismatch. Expected: ${depositAmount}, Got: ${depositTransaction.amount}`
            );
        }

        if (depositTransaction.type !== "deposit") {
            throw new Error(
                `Transaction type mismatch. Expected: deposit, Got: ${depositTransaction.type}`
            );
        }

        if (!depositTransaction.description) {
            throw new Error("Transaction description missing");
        }

        if (!depositTransaction.description.includes(method)) {
            throw new Error(`Transaction description missing method: ${method}`);
        }

        if (!depositTransaction.description.includes(txHash.substring(0, 10))) {
            throw new Error(`Transaction description missing txHash`);
        }

        if (!depositTransaction.timestamp || depositTransaction.timestamp <= 0) {
            throw new Error("Transaction timestamp missing or invalid");
        }

        return {
            success: true,
            message: "Transaction logging test passed",
            transactionId: depositTransaction._id,
            transaction: {
                amount: depositTransaction.amount,
                type: depositTransaction.type,
                description: depositTransaction.description,
                timestamp: depositTransaction.timestamp,
            },
        };
    },
});

/**
 * Test: Optional parameters (txHash and method)
 */
export const testOptionalParameters = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // Test case 1: No optional parameters
        const userId1 = await ctx.db.insert("users", {
            name: "Test User 1",
            email: `test1${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `TEST1${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const result1 = await ctx.runMutation(api.wallet.deposit, {
            userId: userId1,
            amount: 50.00,
            // No optional parameters
        });

        if (!result1.success) {
            throw new Error("Deposit without optional params failed");
        }

        // Test case 2: Only txHash
        const userId2 = await ctx.db.insert("users", {
            name: "Test User 2",
            email: `test2${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `TEST2${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const result2 = await ctx.runMutation(api.wallet.deposit, {
            userId: userId2,
            amount: 75.00,
            txHash: "0x1234567890abcdef",
            // No method
        });

        if (!result2.success) {
            throw new Error("Deposit with only txHash failed");
        }

        // Test case 3: Only method
        const userId3 = await ctx.db.insert("users", {
            name: "Test User 3",
            email: `test3${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `TEST3${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const result3 = await ctx.runMutation(api.wallet.deposit, {
            userId: userId3,
            amount: 25.00,
            method: "card",
            // No txHash
        });

        if (!result3.success) {
            throw new Error("Deposit with only method failed");
        }

        // Verify all descriptions are correct
        const transactions1 = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId1))
            .filter((q) => q.eq(q.field("amount"), 50.00))
            .first();

        const transactions2 = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId2))
            .filter((q) => q.eq(q.field("amount"), 75.00))
            .first();

        const transactions3 = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId3))
            .filter((q) => q.eq(q.field("amount"), 25.00))
            .first();

        // Verify descriptions
        if (!transactions1 || !transactions1.description.includes("Deposit")) {
            throw new Error("Transaction 1 description incorrect");
        }

        if (!transactions2 || !transactions2.description.includes("0x12345")) {
            throw new Error("Transaction 2 description missing txHash");
        }

        if (!transactions3 || !transactions3.description.includes("card")) {
            throw new Error("Transaction 3 description missing method");
        }

        return {
            success: true,
            message: "Optional parameters test passed",
            testCases: 3,
        };
    },
});

/**
 * Run all deposit tests
 */
export const runAllTests = mutation({
    args: {},
    handler: async (ctx) => {
        const results: any[] = [];

        try {
            const result1 = await ctx.runMutation(api.depositTests.testValidDeposit, {});
            results.push({ test: "testValidDeposit", ...result1 });
        } catch (error: any) {
            results.push({ test: "testValidDeposit", success: false, error: error.message });
        }

        try {
            const result2 = await ctx.runMutation(api.depositTests.testInvalidAmount, {});
            results.push({ test: "testInvalidAmount", ...result2 });
        } catch (error: any) {
            results.push({ test: "testInvalidAmount", success: false, error: error.message });
        }

        try {
            const result3 = await ctx.runMutation(api.depositTests.testUserNotFound, {});
            results.push({ test: "testUserNotFound", ...result3 });
        } catch (error: any) {
            results.push({ test: "testUserNotFound", success: false, error: error.message });
        }

        try {
            const result4 = await ctx.runMutation(api.depositTests.testBalanceUpdate, {});
            results.push({ test: "testBalanceUpdate", ...result4 });
        } catch (error: any) {
            results.push({ test: "testBalanceUpdate", success: false, error: error.message });
        }

        try {
            const result5 = await ctx.runMutation(api.depositTests.testTransactionLogging, {});
            results.push({ test: "testTransactionLogging", ...result5 });
        } catch (error: any) {
            results.push({ test: "testTransactionLogging", success: false, error: error.message });
        }

        try {
            const result6 = await ctx.runMutation(api.depositTests.testOptionalParameters, {});
            results.push({ test: "testOptionalParameters", ...result6 });
        } catch (error: any) {
            results.push({ test: "testOptionalParameters", success: false, error: error.message });
        }

        const passed = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        return {
            summary: {
                total: results.length,
                passed,
                failed,
            },
            results,
        };
    },
});
