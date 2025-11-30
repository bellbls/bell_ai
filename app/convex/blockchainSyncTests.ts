import { mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Test Suite for Blockchain Sync Functions
 * Run: npx convex run blockchainSyncTests:<testName>
 * 
 * Tests:
 * - testDepositLogCreation: Creates deposit log correctly
 * - testDuplicateDetection: Prevents duplicate deposits
 * - testBalanceCrediting: Credits user balance correctly
 * - testNotificationCreation: Creates notification for user
 * - testUnlinkedDepositHandling: Handles deposits without linked user
 */

/**
 * Test: Deposit log creation
 */
export const testDepositLogCreation = mutation({
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
            walletBalance: 100.00,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const txHash = `0x${now.toString(16)}abcdef`;
        const fromAddress = "0x1234567890123456789012345678901234567890";
        const toAddress = "0x0987654321098765432109876543210987654321";
        const amount = 50.00;
        const amountRaw = "50000000"; // 50 USDT in 6 decimals
        const blockNumber = 12345;
        const network = "polygon";
        const contractAddress = toAddress;

        // 2. Log deposit
        const result = await ctx.runMutation(internal.blockchainSync.logDeposit, {
            userId,
            txHash,
            fromAddress,
            toAddress,
            amount,
            amountRaw,
            blockNumber,
            network,
            contractAddress,
        });

        if (!result.success) {
            throw new Error(`Deposit log creation failed: ${result.message || "Unknown error"}`);
        }

        if (result.duplicate) {
            throw new Error("Deposit marked as duplicate when it should be new");
        }

        // 3. Verify deposit log exists
        const depositLog = await ctx.runQuery(internal.blockchainSync.getDepositByTxHash, {
            txHash,
        });

        if (!depositLog) {
            throw new Error("Deposit log not found in database");
        }

        // 4. Verify all fields
        if (depositLog.userId !== userId) {
            throw new Error(`User ID mismatch. Expected: ${userId}, Got: ${depositLog.userId}`);
        }

        if (depositLog.txHash !== txHash) {
            throw new Error(`TxHash mismatch. Expected: ${txHash}, Got: ${depositLog.txHash}`);
        }

        if (depositLog.fromAddress.toLowerCase() !== fromAddress.toLowerCase()) {
            throw new Error(`From address mismatch`);
        }

        if (depositLog.toAddress.toLowerCase() !== toAddress.toLowerCase()) {
            throw new Error(`To address mismatch`);
        }

        if (Math.abs(depositLog.amount - amount) > 0.001) {
            throw new Error(
                `Amount mismatch. Expected: ${amount}, Got: ${depositLog.amount}`
            );
        }

        if (depositLog.amountRaw !== amountRaw) {
            throw new Error(
                `AmountRaw mismatch. Expected: ${amountRaw}, Got: ${depositLog.amountRaw}`
            );
        }

        if (depositLog.blockNumber !== blockNumber) {
            throw new Error(
                `Block number mismatch. Expected: ${blockNumber}, Got: ${depositLog.blockNumber}`
            );
        }

        if (depositLog.network !== network) {
            throw new Error(`Network mismatch. Expected: ${network}, Got: ${depositLog.network}`);
        }

        if (depositLog.status !== "confirmed") {
            throw new Error(
                `Status mismatch. Expected: confirmed, Got: ${depositLog.status}`
            );
        }

        return {
            success: true,
            message: "Deposit log creation test passed",
            depositLogId: depositLog._id,
            depositId: result.depositId,
        };
    },
});

/**
 * Test: Duplicate detection
 */
export const testDuplicateDetection = mutation({
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
            walletBalance: 100.00,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const txHash = `0x${now.toString(16)}duplicate`;
        const fromAddress = "0x1234567890123456789012345678901234567890";
        const toAddress = "0x0987654321098765432109876543210987654321";
        const amount = 50.00;
        const amountRaw = "50000000";
        const blockNumber = 12345;
        const network = "polygon";
        const contractAddress = toAddress;

        // 2. Log first deposit
        const result1 = await ctx.runMutation(internal.blockchainSync.logDeposit, {
            userId,
            txHash,
            fromAddress,
            toAddress,
            amount,
            amountRaw,
            blockNumber,
            network,
            contractAddress,
        });

        if (!result1.success || result1.duplicate) {
            throw new Error("First deposit should succeed");
        }

        // 3. Try to log same deposit again
        const result2 = await ctx.runMutation(internal.blockchainSync.logDeposit, {
            userId,
            txHash, // Same txHash
            fromAddress,
            toAddress,
            amount,
            amountRaw,
            blockNumber,
            network,
            contractAddress,
        });

        if (result2.success) {
            throw new Error("Duplicate deposit should not succeed");
        }

        if (!result2.duplicate) {
            throw new Error("Should be marked as duplicate");
        }

        // 4. Verify only one deposit log exists
        const depositLogs = await ctx.db
            .query("deposit_logs")
            .withIndex("by_txHash", (q) => q.eq("txHash", txHash))
            .collect();

        if (depositLogs.length !== 1) {
            throw new Error(
                `Expected 1 deposit log, found ${depositLogs.length}`
            );
        }

        // 5. Verify balance was only credited once
        const user = await ctx.db.get(userId);
        const expectedBalance = 100.00 + 50.00; // Initial + deposit amount

        if (!user || Math.abs(user.walletBalance - expectedBalance) > 0.001) {
            throw new Error(
                `Balance should be credited once. Expected: ${expectedBalance}, Got: ${user?.walletBalance}`
            );
        }

        return {
            success: true,
            message: "Duplicate detection test passed",
            initialBalance: 100.00,
            finalBalance: user?.walletBalance,
        };
    },
});

/**
 * Test: Balance crediting
 */
export const testBalanceCrediting = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // 1. Create test user with zero balance
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
        ];

        const fromAddress = "0x1234567890123456789012345678901234567890";
        const toAddress = "0x0987654321098765432109876543210987654321";
        const network = "polygon";

        for (let i = 0; i < deposits.length; i++) {
            const deposit = deposits[i];
            const txHash = `0x${now.toString(16)}${i}`;
            const amountRaw = (deposit.amount * 1000000).toString(); // 6 decimals

            // Log deposit
            const result = await ctx.runMutation(internal.blockchainSync.logDeposit, {
                userId,
                txHash,
                fromAddress,
                toAddress,
                amount: deposit.amount,
                amountRaw,
                blockNumber: 12345 + i,
                network,
                contractAddress: toAddress,
            });

            if (!result.success) {
                throw new Error(`Deposit ${i} failed: ${result.message || "Unknown error"}`);
            }

            // Verify balance
            const user = await ctx.db.get(userId);
            if (!user) {
                throw new Error("User not found");
            }

            if (Math.abs(user.walletBalance - deposit.expected) > 0.001) {
                throw new Error(
                    `Balance mismatch after deposit ${i}. ` +
                    `Expected: ${deposit.expected}, Got: ${user.walletBalance}`
                );
            }
        }

        // Final balance check
        const finalUser = await ctx.db.get(userId);
        const expectedFinalBalance = 136.25;

        if (!finalUser || Math.abs(finalUser.walletBalance - expectedFinalBalance) > 0.001) {
            throw new Error(
                `Final balance mismatch. Expected: ${expectedFinalBalance}, Got: ${finalUser?.walletBalance}`
            );
        }

        return {
            success: true,
            message: "Balance crediting test passed",
            depositsProcessed: deposits.length,
            finalBalance: finalUser?.walletBalance,
        };
    },
});

/**
 * Test: Notification creation
 */
export const testNotificationCreation = mutation({
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
            walletBalance: 100.00,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        const txHash = `0x${now.toString(16)}notification`;
        const fromAddress = "0x1234567890123456789012345678901234567890";
        const toAddress = "0x0987654321098765432109876543210987654321";
        const amount = 75.50;

        // 2. Log deposit
        await ctx.runMutation(internal.blockchainSync.logDeposit, {
            userId,
            txHash,
            fromAddress,
            toAddress,
            amount,
            amountRaw: "75500000",
            blockNumber: 12345,
            network: "polygon",
            contractAddress: toAddress,
        });

        // 3. Verify notification created
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

        // 4. Verify notification fields
        if (depositNotification.type !== "earnings") {
            throw new Error(`Notification type mismatch. Expected: earnings, Got: ${depositNotification.type}`);
        }

        if (!depositNotification.title.includes("Deposit Received")) {
            throw new Error(`Notification title incorrect: ${depositNotification.title}`);
        }

        if (!depositNotification.message.includes(amount.toFixed(2))) {
            throw new Error("Notification message missing deposit amount");
        }

        if (depositNotification.read !== false) {
            throw new Error("Notification should be unread initially");
        }

        if (!depositNotification.data || !depositNotification.data.txHash) {
            throw new Error("Notification data missing txHash");
        }

        if (depositNotification.data.txHash !== txHash) {
            throw new Error("Notification txHash mismatch");
        }

        if (!depositNotification.data.amount || Math.abs(depositNotification.data.amount - amount) > 0.001) {
            throw new Error("Notification amount mismatch");
        }

        return {
            success: true,
            message: "Notification creation test passed",
            notificationId: depositNotification._id,
            notification: {
                title: depositNotification.title,
                message: depositNotification.message,
                data: depositNotification.data,
            },
        };
    },
});

/**
 * Test: Unlinked deposit handling
 */
export const testUnlinkedDepositHandling = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        const txHash = `0x${now.toString(16)}unlinked`;
        const fromAddress = "0x9999999999999999999999999999999999999999"; // Not linked to any user
        const toAddress = "0x0987654321098765432109876543210987654321";
        const amount = 50.00;

        // Try to log deposit with null userId (unlinked)
        const result = await ctx.runMutation(internal.blockchainSync.logDeposit, {
            userId: null as any, // Unlinked deposit
            txHash,
            fromAddress,
            toAddress,
            amount,
            amountRaw: "50000000",
            blockNumber: 12345,
            network: "polygon",
            contractAddress: toAddress,
        });

        // Should still succeed (deposit is logged but not credited)
        if (!result.success) {
            throw new Error(`Unlinked deposit log creation failed: ${result.message || "Unknown error"}`);
        }

        // Verify deposit log exists
        const depositLog = await ctx.runQuery(internal.blockchainSync.getDepositByTxHash, {
            txHash,
        });

        if (!depositLog) {
            throw new Error("Unlinked deposit log not found");
        }

        // Verify userId is null
        if (depositLog.userId !== null) {
            throw new Error(`Expected null userId for unlinked deposit, got: ${depositLog.userId}`);
        }

        // Verify no transactions were created (userId was null)
        const allTransactions = await ctx.db.query("transactions").collect();
        const relatedTransactions = allTransactions.filter((t) => 
            t.description && t.description.includes(txHash.substring(0, 10))
        );

        if (relatedTransactions.length > 0) {
            throw new Error("No transactions should be created for unlinked deposits");
        }

        // Verify no notifications were created
        const allNotifications = await ctx.db.query("notifications").collect();
        const relatedNotifications = allNotifications.filter((n) =>
            n.data && typeof n.data === "object" && "txHash" in n.data && n.data.txHash === txHash
        );

        if (relatedNotifications.length > 0) {
            throw new Error("No notifications should be created for unlinked deposits");
        }

        return {
            success: true,
            message: "Unlinked deposit handling test passed",
            depositLogId: depositLog._id,
            userId: depositLog.userId, // Should be null
        };
    },
});

/**
 * Run all blockchain sync tests
 */
export const runAllTests = mutation({
    args: {},
    handler: async (ctx) => {
        const results: any[] = [];

        try {
            const result1 = await ctx.runMutation(api.blockchainSyncTests.testDepositLogCreation, {});
            results.push({ test: "testDepositLogCreation", ...result1 });
        } catch (error: any) {
            results.push({ test: "testDepositLogCreation", success: false, error: error.message });
        }

        try {
            const result2 = await ctx.runMutation(api.blockchainSyncTests.testDuplicateDetection, {});
            results.push({ test: "testDuplicateDetection", ...result2 });
        } catch (error: any) {
            results.push({ test: "testDuplicateDetection", success: false, error: error.message });
        }

        try {
            const result3 = await ctx.runMutation(api.blockchainSyncTests.testBalanceCrediting, {});
            results.push({ test: "testBalanceCrediting", ...result3 });
        } catch (error: any) {
            results.push({ test: "testBalanceCrediting", success: false, error: error.message });
        }

        try {
            const result4 = await ctx.runMutation(api.blockchainSyncTests.testNotificationCreation, {});
            results.push({ test: "testNotificationCreation", ...result4 });
        } catch (error: any) {
            results.push({ test: "testNotificationCreation", success: false, error: error.message });
        }

        try {
            const result5 = await ctx.runMutation(api.blockchainSyncTests.testUnlinkedDepositHandling, {});
            results.push({ test: "testUnlinkedDepositHandling", ...result5 });
        } catch (error: any) {
            results.push({ test: "testUnlinkedDepositHandling", success: false, error: error.message });
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
