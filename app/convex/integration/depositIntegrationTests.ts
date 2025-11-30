import { mutation } from "../_generated/server";
import { api, internal } from "../_generated/api";

/**
 * Integration Tests for Complete Deposit Flows
 * Run: npx convex run integration.depositIntegrationTests:<testName>
 * 
 * These tests verify end-to-end flows combining multiple functions
 */

/**
 * Test: Complete manual deposit flow
 * Tests: deposit mutation → balance update → transaction logging
 */
export const testCompleteManualDepositFlow = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // 1. Create test user
        const userId = await ctx.db.insert("users", {
            name: "Integration Test User",
            email: `integration${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `INT${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 200.00,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const initialBalance = 200.00;
        const depositAmount = 75.50;

        // 2. Execute deposit
        const depositResult = await ctx.runMutation(api.wallet.deposit, {
            userId,
            amount: depositAmount,
            method: "integration_test",
            txHash: `0xintegration${now}`,
        });

        if (!depositResult.success) {
            throw new Error(`Deposit failed: ${depositResult.message}`);
        }

        // 3. Verify user balance
        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found after deposit");
        }

        const expectedBalance = initialBalance + depositAmount;
        if (Math.abs(user.walletBalance - expectedBalance) > 0.001) {
            throw new Error(
                `Balance mismatch. Expected: ${expectedBalance}, Got: ${user.walletBalance}`
            );
        }

        // 4. Verify transaction record
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("type"), "deposit"))
            .order("desc")
            .collect();

        const latestTransaction = transactions[0];
        if (!latestTransaction) {
            throw new Error("No transaction found");
        }

        if (Math.abs(latestTransaction.amount - depositAmount) > 0.001) {
            throw new Error("Transaction amount mismatch");
        }

        // 5. Verify complete flow success
        return {
            success: true,
            message: "Complete manual deposit flow passed",
            initialBalance,
            depositAmount,
            finalBalance: user.walletBalance,
            transactionId: latestTransaction._id,
            allStepsCompleted: true,
        };
    },
});

/**
 * Test: Complete blockchain deposit flow (simulated)
 * Tests: deposit log → balance credit → transaction → notification
 */
export const testCompleteBlockchainDepositFlow = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // 1. Create test user with linked deposit address
        const depositAddress = "0x1234567890123456789012345678901234567890";
        const userId = await ctx.db.insert("users", {
            name: "Blockchain Test User",
            email: `blockchain${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `BLK${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            depositAddress: depositAddress.toLowerCase(),
            depositAddressLinkedAt: now,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const depositAmount = 125.75;
        const txHash = `0xblockchain${now}abcdef`;
        const fromAddress = depositAddress;
        const toAddress = "0x0987654321098765432109876543210987654321";
        const blockNumber = 123456;

        // 2. Log deposit (simulates listener processing blockchain event)
        const logResult = await ctx.runMutation(internal.blockchainSync.logDeposit, {
            userId,
            txHash,
            fromAddress,
            toAddress,
            amount: depositAmount,
            amountRaw: (depositAmount * 1000000).toString(),
            blockNumber,
            network: "polygon",
            contractAddress: toAddress,
        });

        if (!logResult.success || logResult.duplicate) {
            throw new Error(`Deposit logging failed: ${logResult.message || "Unknown error"}`);
        }

        // 3. Verify deposit log created
        const depositLog = await ctx.runQuery(internal.blockchainSync.getDepositByTxHash, {
            txHash,
        });

        if (!depositLog) {
            throw new Error("Deposit log not found");
        }

        // 4. Verify user balance updated
        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        if (Math.abs(user.walletBalance - depositAmount) > 0.001) {
            throw new Error(
                `User balance not updated. Expected: ${depositAmount}, Got: ${user.walletBalance}`
            );
        }

        // 5. Verify transaction created
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("type"), "deposit"))
            .collect();

        const depositTransaction = transactions.find((t) => t.referenceId === txHash);
        if (!depositTransaction) {
            throw new Error("Deposit transaction not found");
        }

        // 6. Verify notification created
        const notifications = await ctx.db
            .query("notifications")
            .filter((q) => q.eq(q.field("userId"), userId))
            .collect();

        const depositNotification = notifications.find(
            (n) => n.type === "earnings" && n.title === "Deposit Received"
        );

        if (!depositNotification) {
            throw new Error("Deposit notification not found");
        }

        // 7. Verify notification data
        if (
            !depositNotification.data ||
            typeof depositNotification.data !== "object" ||
            !("txHash" in depositNotification.data) ||
            depositNotification.data.txHash !== txHash
        ) {
            throw new Error("Notification data incorrect");
        }

        return {
            success: true,
            message: "Complete blockchain deposit flow passed",
            depositAmount,
            finalBalance: user.walletBalance,
            depositLogId: depositLog._id,
            transactionId: depositTransaction._id,
            notificationId: depositNotification._id,
            allStepsCompleted: true,
        };
    },
});

/**
 * Test: Concurrent deposits (race condition prevention)
 */
export const testConcurrentDeposits = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // 1. Create test user
        const userId = await ctx.db.insert("users", {
            name: "Concurrent Test User",
            email: `concurrent${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `CON${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const deposits = [
            { amount: 50.00, txHash: `0xconcurrent1${now}` },
            { amount: 75.00, txHash: `0xconcurrent2${now}` },
            { amount: 25.00, txHash: `0xconcurrent3${now}` },
        ];

        const fromAddress = "0x1234567890123456789012345678901234567890";
        const toAddress = "0x0987654321098765432109876543210987654321";

        // 2. Simulate concurrent deposit processing
        const results = await Promise.all(
            deposits.map((deposit, index) =>
                ctx.runMutation(internal.blockchainSync.logDeposit, {
                    userId,
                    txHash: deposit.txHash,
                    fromAddress,
                    toAddress,
                    amount: deposit.amount,
                    amountRaw: (deposit.amount * 1000000).toString(),
                    blockNumber: 123456 + index,
                    network: "polygon",
                    contractAddress: toAddress,
                })
            )
        );

        // 3. Verify all deposits succeeded
        const failures = results.filter((r) => !r.success);
        if (failures.length > 0) {
            throw new Error(`Some deposits failed: ${JSON.stringify(failures)}`);
        }

        // 4. Verify final balance
        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const expectedBalance = deposits.reduce((sum, d) => sum + d.amount, 0);
        if (Math.abs(user.walletBalance - expectedBalance) > 0.001) {
            throw new Error(
                `Final balance mismatch. Expected: ${expectedBalance}, Got: ${user.walletBalance}`
            );
        }

        // 5. Verify all deposit logs created
        const depositLogs = await Promise.all(
            deposits.map((d) =>
                ctx.runQuery(internal.blockchainSync.getDepositByTxHash, {
                    txHash: d.txHash,
                })
            )
        );

        if (depositLogs.some((log) => !log)) {
            throw new Error("Some deposit logs missing");
        }

        // 6. Verify all transactions created
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("type"), "deposit"))
            .collect();

        if (transactions.length !== deposits.length) {
            throw new Error(
                `Transaction count mismatch. Expected: ${deposits.length}, Got: ${transactions.length}`
            );
        }

        return {
            success: true,
            message: "Concurrent deposits test passed",
            depositsProcessed: deposits.length,
            finalBalance: user.walletBalance,
            expectedBalance,
        };
    },
});

/**
 * Test: Duplicate prevention across concurrent requests
 */
export const testDuplicatePrevention = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // 1. Create test user
        const userId = await ctx.db.insert("users", {
            name: "Duplicate Test User",
            email: `duplicate${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `DUP${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const txHash = `0xduplicate${now}`;
        const fromAddress = "0x1234567890123456789012345678901234567890";
        const toAddress = "0x0987654321098765432109876543210987654321";
        const amount = 100.00;

        // 2. Try to log same deposit multiple times concurrently
        const results = await Promise.all([
            ctx.runMutation(internal.blockchainSync.logDeposit, {
                userId,
                txHash,
                fromAddress,
                toAddress,
                amount,
                amountRaw: "100000000",
                blockNumber: 123456,
                network: "polygon",
                contractAddress: toAddress,
            }),
            ctx.runMutation(internal.blockchainSync.logDeposit, {
                userId,
                txHash, // Same txHash
                fromAddress,
                toAddress,
                amount,
                amountRaw: "100000000",
                blockNumber: 123456,
                network: "polygon",
                contractAddress: toAddress,
            }),
            ctx.runMutation(internal.blockchainSync.logDeposit, {
                userId,
                txHash, // Same txHash
                fromAddress,
                toAddress,
                amount,
                amountRaw: "100000000",
                blockNumber: 123456,
                network: "polygon",
                contractAddress: toAddress,
            }),
        ]);

        // 3. Verify only one succeeded
        const successful = results.filter((r) => r.success && !r.duplicate);
        if (successful.length !== 1) {
            throw new Error(
                `Expected exactly 1 successful deposit, got ${successful.length}`
            );
        }

        // 4. Verify others marked as duplicates
        const duplicates = results.filter((r) => r.duplicate);
        if (duplicates.length !== 2) {
            throw new Error(
                `Expected exactly 2 duplicates, got ${duplicates.length}`
            );
        }

        // 5. Verify balance credited only once
        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        if (Math.abs(user.walletBalance - amount) > 0.001) {
            throw new Error(
                `Balance should be credited once. Expected: ${amount}, Got: ${user.walletBalance}`
            );
        }

        // 6. Verify only one deposit log
        const depositLogs = await ctx.db
            .query("deposit_logs")
            .withIndex("by_txHash", (q) => q.eq("txHash", txHash))
            .collect();

        if (depositLogs.length !== 1) {
            throw new Error(
                `Expected exactly 1 deposit log, got ${depositLogs.length}`
            );
        }

        return {
            success: true,
            message: "Duplicate prevention test passed",
            successfulCount: successful.length,
            duplicateCount: duplicates.length,
            finalBalance: user.walletBalance,
        };
    },
});

/**
 * Run all integration tests
 */
export const runAllTests = mutation({
    args: {},
    handler: async (ctx) => {
        const results: any[] = [];

        try {
            const result1 = await ctx.runMutation(
                api.integration.depositIntegrationTests.testCompleteManualDepositFlow,
                {}
            );
            results.push({ test: "testCompleteManualDepositFlow", ...result1 });
        } catch (error: any) {
            results.push({
                test: "testCompleteManualDepositFlow",
                success: false,
                error: error.message,
            });
        }

        try {
            const result2 = await ctx.runMutation(
                api.integration.depositIntegrationTests.testCompleteBlockchainDepositFlow,
                {}
            );
            results.push({ test: "testCompleteBlockchainDepositFlow", ...result2 });
        } catch (error: any) {
            results.push({
                test: "testCompleteBlockchainDepositFlow",
                success: false,
                error: error.message,
            });
        }

        try {
            const result3 = await ctx.runMutation(
                api.integration.depositIntegrationTests.testConcurrentDeposits,
                {}
            );
            results.push({ test: "testConcurrentDeposits", ...result3 });
        } catch (error: any) {
            results.push({
                test: "testConcurrentDeposits",
                success: false,
                error: error.message,
            });
        }

        try {
            const result4 = await ctx.runMutation(
                api.integration.depositIntegrationTests.testDuplicatePrevention,
                {}
            );
            results.push({ test: "testDuplicatePrevention", ...result4 });
        } catch (error: any) {
            results.push({
                test: "testDuplicatePrevention",
                success: false,
                error: error.message,
            });
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
