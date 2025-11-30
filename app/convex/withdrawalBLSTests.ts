import { mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Test Suite for BLS Withdrawal Enforcement
 * Run: npx convex run withdrawalBLSTests:<testName>
 * 
 * Tests ensure withdrawals respect BLS system when enabled:
 * - testWithdrawalFailsWithoutSwappedUSDT: Withdrawal fails when BLS enabled and no swapped USDT
 * - testWithdrawalSucceedsWithSwappedUSDT: Withdrawal succeeds when BLS enabled and sufficient swapped USDT
 * - testWithdrawalWorksWhenBLSDisabled: Withdrawal works normally when BLS disabled
 * - testWithdrawalExceedsSwappedUSDT: Withdrawal fails when amount exceeds swapped USDT
 */

/**
 * Test: Withdrawal should fail when BLS enabled and no swapped USDT
 */
export const testWithdrawalFailsWithoutSwappedUSDT = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // 1. Create test user with USDT balance (not from swaps)
        const userId = await ctx.db.insert("users", {
            name: "Test User",
            email: `test${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `TEST${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 100,
            blsBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        // 2. Enable BLS system
        const blsConfig = await ctx.db.query("blsConfig").first();
        if (!blsConfig || !blsConfig.isEnabled) {
            await ctx.runMutation(api.bls.toggleBLSSystem, {});
        }

        // 3. Try to withdraw - should fail
        try {
            await ctx.runMutation(api.wallet.requestWithdrawal, {
                userId,
                amount: 50,
                address: "0x1234567890123456789012345678901234567890",
            });
            return { success: false, message: "Expected error but withdrawal succeeded" };
        } catch (error: any) {
            if (error.message?.includes("Insufficient swapped BLS balance")) {
                return { success: true, message: "Correctly rejected withdrawal without swapped USDT" };
            }
            return { success: false, message: `Unexpected error: ${error.message}` };
        }
    },
});

/**
 * Test: Withdrawal should succeed when BLS enabled and sufficient swapped USDT
 */
export const testWithdrawalSucceedsWithSwappedUSDT = mutation({
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
            walletBalance: 0,
            blsBalance: 100,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        // 2. Enable BLS system
        const blsConfig = await ctx.db.query("blsConfig").first();
        if (!blsConfig || !blsConfig.isEnabled) {
            await ctx.runMutation(api.bls.toggleBLSSystem, {});
        }

        // 3. Swap BLS to USDT
        await ctx.runMutation(api.bls.swapBLSToUSDT, {
            userId,
            blsAmount: 50,
        });

        // 4. Add saved address (required for withdrawal)
        const addressId = await ctx.db.insert("saved_wallets", {
            userId,
            address: "0x1234567890123456789012345678901234567890",
            label: "Test Wallet",
            network: "polygon",
            status: "ready",
            isReady: true,
            unlockedAt: 0,
            createdAt: now,
        });

        // 5. Try to withdraw - should succeed
        const result = await ctx.runMutation(api.wallet.requestWithdrawal, {
            userId,
            amount: 45,
            address: "0x1234567890123456789012345678901234567890",
        });

        return {
            success: result.success === true,
            message: result.success ? "Withdrawal succeeded correctly" : "Withdrawal failed unexpectedly",
            withdrawalId: result.withdrawalId,
        };
    },
});

/**
 * Test: Withdrawal should work normally when BLS disabled
 */
export const testWithdrawalWorksWhenBLSDisabled = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();

        // 1. Create test user with USDT balance
        const userId = await ctx.db.insert("users", {
            name: "Test User",
            email: `test${now}@example.com`,
            password: "$2a$10$test",
            referralCode: `TEST${now}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 100,
            blsBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        // 2. Disable BLS system (default state)
        const blsConfig = await ctx.db.query("blsConfig").first();
        if (blsConfig && blsConfig.isEnabled) {
            await ctx.runMutation(api.bls.toggleBLSSystem, {});
        }

        // 3. Add saved address
        await ctx.db.insert("saved_wallets", {
            userId,
            address: "0x1234567890123456789012345678901234567890",
            label: "Test Wallet",
            network: "polygon",
            status: "ready",
            isReady: true,
            unlockedAt: 0,
            createdAt: now,
        });

        // 4. Try to withdraw - should succeed (no BLS check)
        const result = await ctx.runMutation(api.wallet.requestWithdrawal, {
            userId,
            amount: 50,
            address: "0x1234567890123456789012345678901234567890",
        });

        return {
            success: result.success === true,
            message: result.success ? "Withdrawal succeeded when BLS disabled" : "Withdrawal failed unexpectedly",
            withdrawalId: result.withdrawalId,
        };
    },
});

/**
 * Test: Withdrawal amount exceeding swapped USDT should fail
 */
export const testWithdrawalExceedsSwappedUSDT = mutation({
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
            walletBalance: 0,
            blsBalance: 100,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        // 2. Enable BLS system
        const blsConfig = await ctx.db.query("blsConfig").first();
        if (!blsConfig || !blsConfig.isEnabled) {
            await ctx.runMutation(api.bls.toggleBLSSystem, {});
        }

        // 3. Swap small amount of BLS to USDT
        await ctx.runMutation(api.bls.swapBLSToUSDT, {
            userId,
            blsAmount: 10,
        });

        // 4. Add saved address
        await ctx.db.insert("saved_wallets", {
            userId,
            address: "0x1234567890123456789012345678901234567890",
            label: "Test Wallet",
            network: "polygon",
            status: "ready",
            isReady: true,
            unlockedAt: 0,
            createdAt: now,
        });

        // 5. Try to withdraw more than swapped - should fail
        try {
            await ctx.runMutation(api.wallet.requestWithdrawal, {
                userId,
                amount: 20, // More than the 10 BLS swapped
                address: "0x1234567890123456789012345678901234567890",
            });
            return { success: false, message: "Expected error but withdrawal succeeded" };
        } catch (error: any) {
            if (error.message?.includes("Insufficient swapped BLS balance")) {
                return { success: true, message: "Correctly rejected withdrawal exceeding swapped USDT" };
            }
            return { success: false, message: `Unexpected error: ${error.message}` };
        }
    },
});
