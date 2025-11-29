import { mutation } from "./_generated/server";

/**
 * Create Test Users for Unilevel Commission Testing
 * Run: npx convex run testUnilevel:createTestUsers
 */
export const createTestUsers = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000);

        // 1. Create Root User (will receive commissions)
        const rootUserId = await ctx.db.insert("users", {
            name: "Root User",
            email: "root@test.com",
            password: "$2a$10$test", // hashed password
            referralCode: "ROOT123",
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        // 2. Create Direct Referral 1
        const direct1Id = await ctx.db.insert("users", {
            name: "Direct 1",
            email: "direct1@test.com",
            password: "$2a$10$test",
            referralCode: "DIR1",
            referrerId: rootUserId,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        // 3. Create Active Stake for Direct 1
        await ctx.db.insert("stakes", {
            userId: direct1Id,
            amount: 200,
            cycleDays: 30,
            dailyRate: 0.6,
            status: "active",
            startDate: now,
            endDate: thirtyDaysFromNow,
            lastYieldDate: now,
        });

        // 4. Create Direct Referral 2
        const direct2Id = await ctx.db.insert("users", {
            name: "Direct 2",
            email: "direct2@test.com",
            password: "$2a$10$test",
            referralCode: "DIR2",
            referrerId: rootUserId,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 0,
            createdAt: now,
            activeDirectReferrals: 0,
            unlockedLevels: 0,
        });

        // 5. Create Active Stake for Direct 2
        await ctx.db.insert("stakes", {
            userId: direct2Id,
            amount: 300,
            cycleDays: 30,
            dailyRate: 0.6,
            status: "active",
            startDate: now,
            endDate: thirtyDaysFromNow,
            lastYieldDate: now,
        });

        // 6. Update Root User's direct count
        await ctx.db.patch(rootUserId, {
            directReferralsCount: 2,
        });

        return {
            success: true,
            message: "Test users created successfully!",
            users: {
                root: { id: rootUserId, email: "root@test.com" },
                direct1: { id: direct1Id, email: "direct1@test.com", stake: 200 },
                direct2: { id: direct2Id, email: "direct2@test.com", stake: 300 },
            },
            nextSteps: [
                "1. Run: npx convex run rewards:distributeDailyRewards",
                "2. Check Root User - should have 2 active directs, 4 levels unlocked",
                "3. Check transactions - should see unilevel commissions",
            ],
        };
    },
});
