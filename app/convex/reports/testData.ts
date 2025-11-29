import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const generate = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Create a test user
        const email = `report_test_${Date.now()}@example.com`;
        const userId = await ctx.db.insert("users", {
            name: "Report Test User",
            email: email,
            password: "hashed_password",
            referralCode: `REP${Date.now()}`,
            currentRank: "B0",
            teamVolume: 0,
            directReferralsCount: 0,
            walletBalance: 10000,
            createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days ago
        });

        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        // 2. Create Completed Stakes (Historical)
        // Stake 1: 7 days, completed 2 months ago
        const stake1Start = now - 60 * dayMs;
        const stake1End = stake1Start + 7 * dayMs;
        const stake1Id = await ctx.db.insert("stakes", {
            userId,
            amount: 1000,
            cycleDays: 7,
            dailyRate: 0.5,
            status: "completed",
            startDate: stake1Start,
            endDate: stake1End,
            lastYieldDate: stake1End,
        });

        // Generate yield transactions for Stake 1
        for (let i = 1; i <= 7; i++) {
            await ctx.db.insert("transactions", {
                userId,
                amount: 5, // 0.5% of 1000
                type: "yield",
                description: `Daily Yield for Stake ${stake1Id}`,
                timestamp: stake1Start + i * dayMs,
                referenceId: stake1Id,
            });
        }

        // Stake 2: 30 days, completed 1 week ago
        const stake2Start = now - 40 * dayMs;
        const stake2End = stake2Start + 30 * dayMs;
        const stake2Id = await ctx.db.insert("stakes", {
            userId,
            amount: 2000,
            cycleDays: 30,
            dailyRate: 0.6,
            status: "completed",
            startDate: stake2Start,
            endDate: stake2End,
            lastYieldDate: stake2End,
        });

        // Generate yield transactions for Stake 2
        for (let i = 1; i <= 30; i++) {
            await ctx.db.insert("transactions", {
                userId,
                amount: 12, // 0.6% of 2000
                type: "yield",
                description: `Daily Yield for Stake ${stake2Id}`,
                timestamp: stake2Start + i * dayMs,
                referenceId: stake2Id,
            });
        }

        // 3. Create Active Stakes
        // Stake 3: 90 days, started 45 days ago (Halfway)
        const stake3Start = now - 45 * dayMs;
        const stake3End = stake3Start + 90 * dayMs;
        const stake3Id = await ctx.db.insert("stakes", {
            userId,
            amount: 5000,
            cycleDays: 90,
            dailyRate: 0.8,
            status: "active",
            startDate: stake3Start,
            endDate: stake3End,
            lastYieldDate: now,
        });

        // Generate yield transactions for Stake 3 (up to now)
        for (let i = 1; i <= 45; i++) {
            await ctx.db.insert("transactions", {
                userId,
                amount: 40, // 0.8% of 5000
                type: "yield",
                description: `Daily Yield for Stake ${stake3Id}`,
                timestamp: stake3Start + i * dayMs,
                referenceId: stake3Id,
            });
        }

        // Stake 4: 30 days, started 5 days ago (New)
        const stake4Start = now - 5 * dayMs;
        const stake4End = stake4Start + 30 * dayMs;
        const stake4Id = await ctx.db.insert("stakes", {
            userId,
            amount: 3000,
            cycleDays: 30,
            dailyRate: 0.6,
            status: "active",
            startDate: stake4Start,
            endDate: stake4End,
            lastYieldDate: now,
        });

        // Generate yield transactions for Stake 4
        for (let i = 1; i <= 5; i++) {
            await ctx.db.insert("transactions", {
                userId,
                amount: 18, // 0.6% of 3000
                type: "yield",
                description: `Daily Yield for Stake ${stake4Id}`,
                timestamp: stake4Start + i * dayMs,
                referenceId: stake4Id,
            });
        }

        return {
            success: true,
            message: "Generated test data for Stake Reports",
            userId,
            email,
        };
    },
});
