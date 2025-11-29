import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Admin Reports and Analytics
 * Comprehensive data queries for admin dashboard
 */

// ==================== SYSTEM OVERVIEW ====================

export const getSystemOverview = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const stakes = await ctx.db.query("stakes").collect();
        const transactions = await ctx.db.query("transactions").collect();
        const withdrawals = await ctx.db.query("withdrawals").collect();

        const activeStakes = stakes.filter(s => s.status === "active");
        const completedStakes = stakes.filter(s => s.status === "completed");
        const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");

        // Calculate total volumes
        const totalStakeVolume = stakes.reduce((sum, s) => sum + s.amount, 0);
        const activeStakeVolume = activeStakes.reduce((sum, s) => sum + s.amount, 0);
        const totalTeamVolume = users.reduce((sum, u) => sum + (u.teamVolume || 0), 0);

        // Calculate total balances
        const totalWalletBalance = users.reduce((sum, u) => sum + (u.walletBalance || 0), 0);

        // Calculate total transactions by type
        const totalYieldPaid = transactions
            .filter(t => t.type === "yield")
            .reduce((sum, t) => sum + t.amount, 0);

        const totalCommissionsPaid = transactions
            .filter(t => t.type.includes("commission"))
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            users: {
                total: users.length,
                withActiveStakes: users.filter(u =>
                    activeStakes.some(s => s.userId === u._id)
                ).length,
            },
            stakes: {
                total: stakes.length,
                active: activeStakes.length,
                completed: completedStakes.length,
                totalVolume: totalStakeVolume,
                activeVolume: activeStakeVolume,
            },
            financial: {
                totalTeamVolume,
                totalWalletBalance,
                totalYieldPaid,
                totalCommissionsPaid,
                pendingWithdrawals: pendingWithdrawals.length,
                pendingWithdrawalAmount: pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0),
            },
            transactions: {
                total: transactions.length,
                last24h: transactions.filter(t =>
                    t.timestamp > Date.now() - 24 * 60 * 60 * 1000
                ).length,
            },
        };
    },
});

// ==================== SYSTEM-WIDE STAKE REPORT ====================

export const getSystemStakeReport = query({
    args: {
        dateRange: v.union(
            v.literal("today"),
            v.literal("week"),
            v.literal("month"),
            v.literal("all"),
            v.literal("custom")
        ),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        let filterStartDate = 0;
        let filterEndDate = now;

        // Calculate date range
        if (args.dateRange === "today") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filterStartDate = today.getTime();
        } else if (args.dateRange === "week") {
            filterStartDate = now - (7 * 24 * 60 * 60 * 1000);
        } else if (args.dateRange === "month") {
            filterStartDate = now - (30 * 24 * 60 * 60 * 1000);
        } else if (args.dateRange === "custom" && args.startDate && args.endDate) {
            filterStartDate = args.startDate;
            filterEndDate = args.endDate;
        }

        // Get all stakes and transactions
        const allStakes = await ctx.db.query("stakes").collect();
        const allTransactions = await ctx.db.query("transactions").collect();
        const users = await ctx.db.query("users").collect();

        // Filter stakes by date range
        const stakesInRange = allStakes.filter(s =>
            s.startDate >= filterStartDate && s.startDate <= filterEndDate
        );

        const activeStakes = allStakes.filter(s => s.status === "active");
        const expiredStakes = allStakes.filter(s => s.status === "completed");

        // Calculate summary statistics
        const totalStakeValue = stakesInRange.reduce((sum, s) => sum + s.amount, 0);
        const averageStakeAmount = stakesInRange.length > 0
            ? totalStakeValue / stakesInRange.length
            : 0;

        // Calculate total yield paid in range
        const yieldTransactions = allTransactions.filter(t =>
            t.type === "yield" &&
            t.timestamp >= filterStartDate &&
            t.timestamp <= filterEndDate
        );
        const totalYieldPaid = yieldTransactions.reduce((sum, t) => sum + t.amount, 0);

        // Group stakes by day
        const stakesByDay: Record<string, { newStakes: number; stakeValue: number; yieldPaid: number }> = {};

        stakesInRange.forEach(stake => {
            const date = new Date(stake.startDate).toISOString().split('T')[0];
            if (!stakesByDay[date]) {
                stakesByDay[date] = { newStakes: 0, stakeValue: 0, yieldPaid: 0 };
            }
            stakesByDay[date].newStakes++;
            stakesByDay[date].stakeValue += stake.amount;
        });

        yieldTransactions.forEach(tx => {
            const date = new Date(tx.timestamp).toISOString().split('T')[0];
            if (!stakesByDay[date]) {
                stakesByDay[date] = { newStakes: 0, stakeValue: 0, yieldPaid: 0 };
            }
            stakesByDay[date].yieldPaid += tx.amount;
        });

        // Group stakes by cycle
        const stakesByCycle: Record<number, { count: number; totalValue: number; averageYield: number }> = {};

        stakesInRange.forEach(stake => {
            if (!stakesByCycle[stake.cycleDays]) {
                stakesByCycle[stake.cycleDays] = { count: 0, totalValue: 0, averageYield: 0 };
            }
            stakesByCycle[stake.cycleDays].count++;
            stakesByCycle[stake.cycleDays].totalValue += stake.amount;
            stakesByCycle[stake.cycleDays].averageYield += stake.amount * stake.dailyRate * stake.cycleDays / 100;
        });

        // Calculate average yield per cycle
        Object.keys(stakesByCycle).forEach(key => {
            const cycle = stakesByCycle[parseInt(key)];
            if (cycle.count > 0) {
                cycle.averageYield = cycle.averageYield / cycle.count;
            }
        });

        // Get top stakers
        const userStakeMap: Record<string, { userName: string; userEmail: string; totalStaked: number; activeStakes: number }> = {};

        stakesInRange.forEach(stake => {
            const userId = stake.userId;
            if (!userStakeMap[userId]) {
                const user = users.find(u => u._id === userId);
                userStakeMap[userId] = {
                    userName: user?.name || "Unknown",
                    userEmail: user?.email || "Unknown",
                    totalStaked: 0,
                    activeStakes: 0,
                };
            }
            userStakeMap[userId].totalStaked += stake.amount;
            if (stake.status === "active") {
                userStakeMap[userId].activeStakes++;
            }
        });

        const topStakers = Object.values(userStakeMap)
            .sort((a, b) => b.totalStaked - a.totalStaked)
            .slice(0, 10);

        return {
            summary: {
                totalStakes: stakesInRange.length,
                totalStakeValue,
                activeStakes: activeStakes.length,
                expiredStakes: expiredStakes.length,
                totalYieldPaid,
                averageStakeAmount,
            },
            stakesByDay: Object.entries(stakesByDay)
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => a.date.localeCompare(b.date)),
            stakesByCycle: Object.entries(stakesByCycle)
                .map(([days, data]) => ({ days: parseInt(days), ...data }))
                .sort((a, b) => a.days - b.days),
            topStakers,
            recentStakes: stakesInRange
                .sort((a, b) => b.startDate - a.startDate)
                .slice(0, 20)
                .map(stake => {
                    const user = users.find(u => u._id === stake.userId);
                    // Get actual yield paid from transactions
                    const yieldTransactions = allTransactions.filter(t =>
                        t.type === "yield" && t.referenceId === stake._id
                    );
                    const actualYieldPaid = yieldTransactions.reduce((sum, t) => sum + t.amount, 0);
                    const expectedTotal = stake.amount * stake.dailyRate * stake.cycleDays / 100;

                    return {
                        _id: stake._id,
                        userName: user?.name || "Unknown",
                        userEmail: user?.email || "Unknown",
                        amount: stake.amount,
                        cycleDays: stake.cycleDays,
                        dailyRate: stake.dailyRate,
                        status: stake.status,
                        startDate: stake.startDate,
                        endDate: stake.endDate,
                        actualYieldPaid,
                        expectedTotal,
                        daysElapsed: Math.min(
                            Math.floor((now - stake.startDate) / (24 * 60 * 60 * 1000)),
                            stake.cycleDays
                        ),
                    };
                }),
        };
    },
});

// ==================== RANK DISTRIBUTION ====================

export const getRankDistribution = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();

        const distribution: Record<string, number> = {};
        const ranks = ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"];

        // Initialize all ranks
        ranks.forEach(rank => distribution[rank] = 0);

        // Count users per rank
        users.forEach(user => {
            const rank = user.currentRank || "B0";
            distribution[rank] = (distribution[rank] || 0) + 1;
        });

        // Convert to array format for charts
        return ranks.map(rank => ({
            name: rank,
            value: distribution[rank],
            percentage: users.length > 0
                ? ((distribution[rank] / users.length) * 100).toFixed(1)
                : "0",
        }));
    },
});

// ==================== STAKING ANALYTICS ====================

export const getStakingAnalytics = query({
    args: {},
    handler: async (ctx) => {
        const stakes = await ctx.db.query("stakes").collect();
        const config = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "staking_cycles"))
            .unique();

        const cycles = config?.value || [];

        // Group stakes by cycle
        const byCycle: Record<number, { count: number; volume: number; active: number }> = {};

        cycles.forEach((cycle: any) => {
            byCycle[cycle.days] = { count: 0, volume: 0, active: 0 };
        });

        stakes.forEach(stake => {
            if (!byCycle[stake.cycleDays]) {
                byCycle[stake.cycleDays] = { count: 0, volume: 0, active: 0 };
            }
            byCycle[stake.cycleDays].count++;
            byCycle[stake.cycleDays].volume += stake.amount;
            if (stake.status === "active") {
                byCycle[stake.cycleDays].active++;
            }
        });

        return Object.entries(byCycle).map(([days, data]) => ({
            cycle: `${days} Days`,
            days: parseInt(days),
            count: data.count,
            volume: data.volume,
            active: data.active,
        }));
    },
});

// ==================== REVENUE TRENDS ====================

export const getRevenueTrends = query({
    args: { days: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const daysToShow = args.days || 30;
        const transactions = await ctx.db.query("transactions").collect();
        const blsConfig = await ctx.db.query("blsConfig").first();
        const conversionRate = blsConfig?.conversionRate || 1.0;

        const now = Date.now();
        const startDate = now - (daysToShow * 24 * 60 * 60 * 1000);

        // Group transactions by day
        const dailyData: Record<string, {
            yield: number;
            commissions: number;
            deposits: number;
            withdrawals: number;
            yieldBLS: number;
            commissionsBLS: number;
        }> = {};

        transactions
            .filter(t => t.timestamp >= startDate)
            .forEach(t => {
                const date = new Date(t.timestamp).toISOString().split('T')[0];

                if (!dailyData[date]) {
                    dailyData[date] = { 
                        yield: 0, 
                        commissions: 0, 
                        deposits: 0, 
                        withdrawals: 0,
                        yieldBLS: 0,
                        commissionsBLS: 0,
                    };
                }

                if (t.type === "yield") {
                    dailyData[date].yield += t.amount;
                } else if (t.type === "bls_earned") {
                    // BLS earned - check if it's yield or commission from description
                    const desc = t.description?.toLowerCase() || "";
                    const usdtAmount = t.amount * conversionRate;
                    
                    if (desc.includes("staking yield") || desc.includes("daily yield")) {
                        dailyData[date].yield += usdtAmount;
                        dailyData[date].yieldBLS += t.amount;
                    } else if (desc.includes("commission") || desc.includes("referral") || desc.includes("bonus")) {
                        dailyData[date].commissions += usdtAmount;
                        dailyData[date].commissionsBLS += t.amount;
                    }
                } else if (t.type.includes("commission")) {
                    dailyData[date].commissions += t.amount;
                } else if (t.type === "deposit") {
                    dailyData[date].deposits += Math.abs(t.amount);
                } else if (t.type === "withdrawal") {
                    dailyData[date].withdrawals += Math.abs(t.amount);
                }
            });

        // Convert to array and sort by date
        return Object.entries(dailyData)
            .map(([date, data]) => ({
                date,
                ...data,
                total: data.yield + data.commissions,
                totalBLS: blsConfig?.isEnabled ? (data.yieldBLS + data.commissionsBLS) : null,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    },
});

// ==================== TOP PERFORMERS ====================

export const getTopPerformers = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit || 10;
        const users = await ctx.db.query("users").collect();

        // Sort by team volume
        const topByVolume = [...users]
            .sort((a, b) => (b.teamVolume || 0) - (a.teamVolume || 0))
            .slice(0, limit)
            .map(u => ({
                _id: u._id,
                name: u.name,
                email: u.email,
                rank: u.currentRank,
                teamVolume: u.teamVolume || 0,
                directReferrals: u.directReferralsCount || 0,
                walletBalance: u.walletBalance || 0,
            }));

        // Sort by wallet balance (earnings)
        const topByEarnings = [...users]
            .sort((a, b) => (b.walletBalance || 0) - (a.walletBalance || 0))
            .slice(0, limit)
            .map(u => ({
                _id: u._id,
                name: u.name,
                email: u.email,
                rank: u.currentRank,
                teamVolume: u.teamVolume || 0,
                directReferrals: u.directReferralsCount || 0,
                walletBalance: u.walletBalance || 0,
            }));

        // Sort by direct referrals
        const topByReferrals = [...users]
            .sort((a, b) => (b.directReferralsCount || 0) - (a.directReferralsCount || 0))
            .slice(0, limit)
            .map(u => ({
                _id: u._id,
                name: u.name,
                email: u.email,
                rank: u.currentRank,
                teamVolume: u.teamVolume || 0,
                directReferrals: u.directReferralsCount || 0,
                walletBalance: u.walletBalance || 0,
            }));

        return {
            byVolume: topByVolume,
            byEarnings: topByEarnings,
            byReferrals: topByReferrals,
        };
    },
});

// ==================== RECENT ACTIVITIES ====================

export const getRecentActivities = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;

        const transactions = await ctx.db
            .query("transactions")
            .order("desc")
            .take(limit);

        const blsConfig = await ctx.db.query("blsConfig").first();
        const conversionRate = blsConfig?.conversionRate || 1.0;

        const activities = await Promise.all(
            transactions.map(async (t) => {
                const user = await ctx.db.get(t.userId);
                const isBLS = t.type === "bls_earned";
                const usdtAmount = isBLS ? (t.amount * conversionRate) : t.amount;
                const blsAmount = isBLS ? t.amount : null;

                return {
                    _id: t._id,
                    type: t.type,
                    amount: usdtAmount, // USDT equivalent
                    blsAmount: blsAmount, // BLS amount if applicable
                    isBLS: isBLS,
                    description: t.description,
                    timestamp: t.timestamp,
                    userName: user?.name || "Unknown",
                    userEmail: user?.email || "Unknown",
                };
            })
        );

        return activities;
    },
});

// ==================== COMMISSION BREAKDOWN ====================

export const getCommissionBreakdown = query({
    args: {},
    handler: async (ctx) => {
        const transactions = await ctx.db.query("transactions").collect();
        const blsConfig = await ctx.db.query("blsConfig").first();
        const conversionRate = blsConfig?.conversionRate || 1.0;

        const breakdown = {
            direct: 0,
            indirect: 0,
            vrank: 0,
            binary: 0,
        };

        const blsBreakdown = {
            direct: 0,
            indirect: 0,
            vrank: 0,
            binary: 0,
        };

        transactions.forEach(t => {
            if (t.type === "bls_earned") {
                // BLS earned transactions - convert to USDT equivalent
                const usdtAmount = t.amount * conversionRate;
                const blsAmount = t.amount;
                
                // Determine commission type from description or metadata
                const desc = t.description?.toLowerCase() || "";
                if (desc.includes("direct") || desc.includes("l1")) {
                    breakdown.direct += usdtAmount;
                    blsBreakdown.direct += blsAmount;
                } else if (desc.includes("indirect") || desc.includes("l2")) {
                    breakdown.indirect += usdtAmount;
                    blsBreakdown.indirect += blsAmount;
                } else if (desc.includes("b-rank") || desc.includes("vrank") || desc.includes("rank bonus")) {
                    breakdown.vrank += usdtAmount;
                    blsBreakdown.vrank += blsAmount;
                } else if (desc.includes("binary")) {
                    breakdown.binary += usdtAmount;
                    blsBreakdown.binary += blsAmount;
                }
            } else {
                // Regular USDT transactions
                if (t.type === "commission_direct") {
                    breakdown.direct += t.amount;
                } else if (t.type === "commission_indirect") {
                    breakdown.indirect += t.amount;
                } else if (t.type === "commission_vrank") {
                    breakdown.vrank += t.amount;
                } else if (t.type === "commission_binary") {
                    breakdown.binary += t.amount;
                }
            }
        });

        const total = breakdown.direct + breakdown.indirect + breakdown.vrank + breakdown.binary;
        const blsTotal = blsBreakdown.direct + blsBreakdown.indirect + blsBreakdown.vrank + blsBreakdown.binary;

        return {
            breakdown,
            blsBreakdown: blsConfig?.isEnabled ? blsBreakdown : null,
            total,
            blsTotal: blsConfig?.isEnabled ? blsTotal : null,
            percentages: {
                direct: total > 0 ? ((breakdown.direct / total) * 100).toFixed(1) : "0",
                indirect: total > 0 ? ((breakdown.indirect / total) * 100).toFixed(1) : "0",
                vrank: total > 0 ? ((breakdown.vrank / total) * 100).toFixed(1) : "0",
                binary: total > 0 ? ((breakdown.binary / total) * 100).toFixed(1) : "0",
            },
            isBLSEnabled: blsConfig?.isEnabled || false,
        };
    },
});

// ==================== USER GROWTH ====================

export const getUserGrowth = query({
    args: { days: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const daysToShow = args.days || 30;
        const users = await ctx.db.query("users").collect();

        const now = Date.now();
        const startDate = now - (daysToShow * 24 * 60 * 60 * 1000);

        // Group users by registration date
        const dailyGrowth: Record<string, number> = {};

        users
            .filter(u => u.createdAt >= startDate)
            .forEach(u => {
                const date = new Date(u.createdAt).toISOString().split('T')[0];
                dailyGrowth[date] = (dailyGrowth[date] || 0) + 1;
            });

        // Convert to array and calculate cumulative
        let cumulative = users.filter(u => u.createdAt < startDate).length;

        return Object.entries(dailyGrowth)
            .map(([date, count]) => {
                cumulative += count;
                return {
                    date,
                    newUsers: count,
                    totalUsers: cumulative,
                };
            })
            .sort((a, b) => a.date.localeCompare(b.date));
    },
});

// ==================== EXPORT DATA ====================

export const exportAllData = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const stakes = await ctx.db.query("stakes").collect();
        const transactions = await ctx.db.query("transactions").collect();
        const withdrawals = await ctx.db.query("withdrawals").collect();

        return {
            users: users.map(u => ({
                id: u._id,
                name: u.name,
                email: u.email,
                rank: u.currentRank,
                teamVolume: u.teamVolume,
                directReferrals: u.directReferralsCount,
                walletBalance: u.walletBalance,
                referralCode: u.referralCode,
                createdAt: new Date(u.createdAt).toISOString(),
            })),
            stakes: stakes.map(s => ({
                id: s._id,
                userId: s.userId,
                amount: s.amount,
                cycleDays: s.cycleDays,
                dailyRate: s.dailyRate,
                status: s.status,
                startDate: new Date(s.startDate).toISOString(),
                endDate: new Date(s.endDate).toISOString(),
            })),
            transactions: transactions.map(t => ({
                id: t._id,
                userId: t.userId,
                amount: t.amount,
                type: t.type,
                description: t.description,
                timestamp: new Date(t.timestamp).toISOString(),
            })),
            withdrawals: withdrawals.map(w => ({
                id: w._id,
                userId: w.userId,
                amount: w.amount,
                address: w.address,
                status: w.status,
                requestDate: new Date(w.requestDate).toISOString(),
            })),
        };
    },
});

// ==================== CRON LOGS ====================

export const getCronLogs = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;

        const logs = await ctx.db
            .query("cron_logs")
            .order("desc")
            .take(limit);

        return logs;
    },
});
// ==================== WITHDRAWAL FEES REPORT ====================

export const getWithdrawalFeesReport = query({
    args: {
        dateRange: v.union(
            v.literal("today"),
            v.literal("week"),
            v.literal("month"),
            v.literal("all"),
            v.literal("custom")
        ),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        let filterStartDate = 0;
        let filterEndDate = now;

        // Calculate date range
        if (args.dateRange === "today") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filterStartDate = today.getTime();
        } else if (args.dateRange === "week") {
            filterStartDate = now - (7 * 24 * 60 * 60 * 1000);
        } else if (args.dateRange === "month") {
            filterStartDate = now - (30 * 24 * 60 * 60 * 1000);
        } else if (args.dateRange === "custom" && args.startDate && args.endDate) {
            filterStartDate = args.startDate;
            filterEndDate = args.endDate;
        }

        const withdrawals = await ctx.db.query("withdrawals").collect();

        // Filter withdrawals by date range and status (only completed/sent/approved have fees realized ideally, but we track all requests)
        // Assuming we want to report on all requests that have a fee calculated
        const filteredWithdrawals = withdrawals.filter(w =>
            w.requestDate >= filterStartDate &&
            w.requestDate <= filterEndDate &&
            w.fee !== undefined
        );

        const totalFees = filteredWithdrawals.reduce((sum, w) => sum + (w.fee || 0), 0);
        const totalAmount = filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0);

        // Join with user info
        const detailedWithdrawals = await Promise.all(filteredWithdrawals.map(async (w) => {
            const user = await ctx.db.get(w.userId);
            return {
                _id: w._id,
                userName: user?.name || "Unknown",
                userEmail: user?.email || "Unknown",
                amount: w.amount,
                fee: w.fee || 0,
                netAmount: w.netAmount || w.amount,
                status: w.status,
                requestDate: w.requestDate,
            };
        }));

        return {
            summary: {
                totalFees,
                totalAmount,
                count: filteredWithdrawals.length,
            },
            withdrawals: detailedWithdrawals.sort((a, b) => b.requestDate - a.requestDate),
        };
    },
});

// ==================== B-RANK PAYOUT REPORT ====================

export const getBRankPayoutReport = query({
    args: {
        dateRange: v.union(
            v.literal("today"),
            v.literal("week"),
            v.literal("month"),
            v.literal("all"),
            v.literal("custom")
        ),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        let filterStartDate = 0;
        let filterEndDate = now;

        // Calculate date range
        if (args.dateRange === "today") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filterStartDate = today.getTime();
        } else if (args.dateRange === "week") {
            filterStartDate = now - (7 * 24 * 60 * 60 * 1000);
        } else if (args.dateRange === "month") {
            filterStartDate = now - (30 * 24 * 60 * 60 * 1000);
        } else if (args.dateRange === "custom" && args.startDate && args.endDate) {
            filterStartDate = args.startDate;
            filterEndDate = args.endDate;
        }

        // Get BLS config
        const blsConfig = await ctx.db.query("blsConfig").first();
        const conversionRate = blsConfig?.conversionRate || 1.0;

        // Fetch all B-Rank commission transactions (both USDT and BLS)
        const usdtTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_type", (q) => q.eq("type", "commission_vrank"))
            .collect();

        const blsTransactions = await ctx.db
            .query("transactions")
            .withIndex("by_type", (q) => q.eq("type", "bls_earned"))
            .collect();

        // Filter BLS transactions that are B-Rank related (check description)
        const blsBRankTransactions = blsTransactions.filter(t => {
            const desc = t.description?.toLowerCase() || "";
            return desc.includes("b-rank") || desc.includes("vrank") || desc.includes("rank bonus");
        });

        // Combine and filter by date range
        const allTransactions = [
            ...usdtTransactions.map(t => ({ ...t, isBLS: false })),
            ...blsBRankTransactions.map(t => ({ ...t, isBLS: true }))
        ];

        const filteredTransactions = allTransactions.filter(t =>
            t.timestamp >= filterStartDate &&
            t.timestamp <= filterEndDate
        );

        // Calculate summary (convert BLS to USDT equivalent)
        const totalPaid = filteredTransactions.reduce((sum, t) => {
            if (t.isBLS) {
                return sum + (t.amount * conversionRate);
            }
            return sum + t.amount;
        }, 0);

        const totalBLS = filteredTransactions
            .filter(t => t.isBLS)
            .reduce((sum, t) => sum + t.amount, 0);

        const count = filteredTransactions.length;
        const averagePayout = count > 0 ? totalPaid / count : 0;

        // Get detailed transaction list with user info
        const detailedTransactions = await Promise.all(filteredTransactions.map(async (t) => {
            const user = await ctx.db.get(t.userId);

            // Extract source user from description (e.g., "B1 Rank Bonus from John's stake")
            const descriptionMatch = t.description.match(/from (.+)'s stake/);
            const sourceUserName = descriptionMatch ? descriptionMatch[1] : "Unknown";

            // Extract rank from description (e.g., "B1 Rank Bonus...")
            const rankMatch = t.description.match(/^(B\d+)/);
            const rank = rankMatch ? rankMatch[1] : "Unknown";

            // Calculate USDT equivalent for BLS transactions
            const usdtAmount = t.isBLS ? (t.amount * conversionRate) : t.amount;
            const blsAmount = t.isBLS ? t.amount : null;

            return {
                _id: t._id,
                userName: user?.name || "Unknown",
                userEmail: user?.email || "Unknown",
                userRank: user?.currentRank || "B0",
                rank: rank,
                amount: usdtAmount, // USDT equivalent
                blsAmount: blsAmount, // BLS amount if applicable
                isBLS: t.isBLS || false,
                sourceUserName: sourceUserName,
                timestamp: t.timestamp,
                description: t.description,
            };
        }));

        // Sort by timestamp (newest first)
        detailedTransactions.sort((a, b) => b.timestamp - a.timestamp);

        // Calculate running totals
        let runningTotal = 0;
        const transactionsWithRunningTotal = detailedTransactions.reverse().map(t => {
            runningTotal += t.amount;
            return {
                ...t,
                runningTotal,
            };
        }).reverse();

        return {
            summary: {
                totalPaid,
                totalBLS: blsConfig?.isEnabled ? totalBLS : null,
                count,
                averagePayout,
            },
            transactions: transactionsWithRunningTotal,
            isBLSEnabled: blsConfig?.isEnabled || false,
            conversionRate: conversionRate,
        };
    },
});

// ==================== UNILEVEL SYSTEM STATS ====================

export const getUnilevelSystemStats = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const transactions = await ctx.db.query("transactions").collect();

        // Calculate total commissions paid (unilevel commissions)
        const unilevelCommissions = transactions.filter(t => 
            t.type === "commission_indirect" || t.type.includes("unilevel")
        );
        const totalCommissionsPaid = unilevelCommissions.reduce((sum, t) => sum + t.amount, 0);

        // Count users with referrals
        const usersWithReferrals = users.filter(u => (u.directReferralsCount || 0) > 0).length;

        // Calculate average unlocked levels
        const totalUnlockedLevels = users.reduce((sum, u) => sum + (u.unlockedLevels || 0), 0);
        const averageUnlockedLevels = users.length > 0 ? totalUnlockedLevels / users.length : 0;

        // Get top recruiters
        const topRecruiters = [...users]
            .filter(u => (u.directReferralsCount || 0) > 0)
            .sort((a, b) => (b.directReferralsCount || 0) - (a.directReferralsCount || 0))
            .slice(0, 10)
            .map(u => ({
                _id: u._id,
                name: u.name,
                email: u.email,
                directReferrals: u.directReferralsCount || 0,
                activeDirectReferrals: u.activeDirectReferrals || 0,
                unlockedLevels: u.unlockedLevels || 0,
            }));

        // Calculate level distribution
        const levelCounts: Record<number, number> = {};
        for (let i = 0; i <= 10; i++) {
            levelCounts[i] = 0;
        }

        users.forEach(u => {
            const level = u.unlockedLevels || 0;
            levelCounts[level] = (levelCounts[level] || 0) + 1;
        });

        const levelDistribution = Object.entries(levelCounts)
            .map(([level, count]) => ({
                level: parseInt(level),
                count,
            }))
            .filter(item => item.count > 0)
            .sort((a, b) => a.level - b.level);

        return {
            totalUsers: users.length,
            usersWithReferrals,
            totalCommissionsPaid,
            averageUnlockedLevels,
            topRecruiters,
            levelDistribution,
        };
    },
});

// ==================== PRESALE ADMIN ====================

export const getPresaleStats = query({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db.query("presaleConfig").first();
        const orders = await ctx.db.query("presaleOrders").collect();
        const stakes = await ctx.db.query("presaleStakes").collect();

        if (!config) return null;

        const confirmedOrders = orders.filter(o => o.status === "confirmed" || o.status === "converted");
        const totalRevenue = confirmedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

        // Unique buyers
        const uniqueBuyers = new Set(confirmedOrders.map(o => o.userId)).size;
        const avgNodesPerUser = uniqueBuyers > 0
            ? config.soldNodes / uniqueBuyers
            : 0;

        // Daily sales data
        const salesByDay: Record<string, number> = {};
        confirmedOrders.forEach(o => {
            const date = new Date(o.purchaseDate).toISOString().split('T')[0];
            salesByDay[date] = (salesByDay[date] || 0) + o.quantity;
        });

        const dailySales = Object.entries(salesByDay)
            .map(([date, nodes]) => ({ date, nodes }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Recent orders
        const recentOrders = await Promise.all(
            orders
                .sort((a, b) => b.purchaseDate - a.purchaseDate)
                .slice(0, 20)
                .map(async (o) => {
                    const user = await ctx.db.get(o.userId);
                    return {
                        _id: o._id,
                        userName: user?.name || "Unknown",
                        userEmail: user?.email || "Unknown",
                        quantity: o.quantity,
                        totalAmount: o.totalAmount,
                        status: o.status,
                        purchaseDate: o.purchaseDate,
                    };
                })
        );

        // Enhanced metrics
        const totalOrders = orders.length;
        const conversionRate = totalOrders > 0 
            ? ((confirmedOrders.length / totalOrders) * 100) 
            : 0;
        
        const avgOrderValue = confirmedOrders.length > 0
            ? totalRevenue / confirmedOrders.length
            : 0;

        const revenuePerUser = uniqueBuyers > 0
            ? totalRevenue / uniqueBuyers
            : 0;

        // Time-based metrics
        const now = Date.now();
        const ordersByStatus = {
            pending: orders.filter(o => o.status === "pending").length,
            confirmed: orders.filter(o => o.status === "confirmed").length,
            converted: orders.filter(o => o.status === "converted").length,
            cancelled: orders.filter(o => o.status === "cancelled").length,
        };

        // Calculate average time to conversion
        const convertedOrders = orders.filter(o => o.status === "converted" && o.convertedDate);
        const avgTimeToConversion = convertedOrders.length > 0
            ? convertedOrders.reduce((sum, o) => {
                const timeToConvert = (o.convertedDate! - o.purchaseDate) / (1000 * 60 * 60 * 24); // days
                return sum + timeToConvert;
            }, 0) / convertedOrders.length
            : 0;

        // Growth metrics (last 7 days vs previous 7 days)
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
        
        const recentOrders7d = confirmedOrders.filter(o => o.purchaseDate >= sevenDaysAgo);
        const previousOrders7d = confirmedOrders.filter(o => 
            o.purchaseDate >= fourteenDaysAgo && o.purchaseDate < sevenDaysAgo
        );
        
        const recentRevenue7d = recentOrders7d.reduce((sum, o) => sum + o.totalAmount, 0);
        const previousRevenue7d = previousOrders7d.reduce((sum, o) => sum + o.totalAmount, 0);
        
        const revenueGrowth = previousRevenue7d > 0
            ? ((recentRevenue7d - previousRevenue7d) / previousRevenue7d) * 100
            : 0;

        const nodesGrowth = previousOrders7d.length > 0
            ? ((recentOrders7d.length - previousOrders7d.length) / previousOrders7d.length) * 100
            : 0;

        // Calculate total converted stake value
        const convertedStakes = await ctx.db
            .query("stakes")
            .filter((q) => {
                // Find stakes that were created from presale conversions
                // We can identify them by checking if they were created around conversion time
                // For now, we'll use a simpler approach - check all active stakes
                return q.eq(q.field("status"), "active");
            })
            .collect();
        
        const totalConvertedStakeValue = convertedStakes.reduce((sum, s) => sum + s.amount, 0);

        return {
            config,
            totalRevenue,
            soldNodes: config.soldNodes,
            totalNodes: config.totalNodes,
            uniqueBuyers,
            avgNodesPerUser,
            dailySales,
            recentOrders,
            vestedStakesCount: stakes.length,
            unlockedStakesCount: stakes.filter(s => s.status === "unlocked").length,
            claimedStakesCount: stakes.filter(s => s.status === "claimed").length,
            // Enhanced metrics
            totalOrders,
            conversionRate,
            avgOrderValue,
            revenuePerUser,
            ordersByStatus,
            avgTimeToConversion,
            revenueGrowth,
            nodesGrowth,
            totalConvertedStakeValue,
            convertedStakesCount: convertedOrders.length,
        };
    },
});

export const togglePresale = mutation({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db.query("presaleConfig").first();
        if (!config) throw new Error("Presale config not found");

        const newPresaleState = !config.isActive;

        // Sync: When presale is activated, pause staking
        // When presale is deactivated, keep staking state as is (don't auto-enable)
        if (newPresaleState) {
            // Presale is being activated - pause staking
            const stakingPausedConfig = await ctx.db
                .query("configs")
                .withIndex("by_key", (q) => q.eq("key", "staking_paused"))
                .first();
            
            if (stakingPausedConfig) {
                await ctx.db.patch(stakingPausedConfig._id, { value: true });
            } else {
                await ctx.db.insert("configs", {
                    key: "staking_paused",
                    value: true,
                });
            }
        }

        await ctx.db.patch(config._id, {
            isActive: newPresaleState,
        });

        await ctx.db.insert("presaleAuditLog", {
            action: "admin_action",
            details: {
                action: "toggle_presale",
                newState: newPresaleState,
                stakingPaused: newPresaleState, // Staking paused when presale is active
            },
            timestamp: Date.now(),
        });
    },
});

export const openStaking = mutation({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db.query("presaleConfig").first();
        if (!config) throw new Error("Presale config not found");
        if (config.stakingOpen) throw new Error("Staking is already open");

        // 1. Update Presale Config
        await ctx.db.patch(config._id, {
            stakingOpen: true,
            isActive: false, // Close presale when staking opens
        });

        // 2. Enable Staking System (sync with presale)
        const stakingPausedConfig = await ctx.db
            .query("configs")
            .withIndex("by_key", (q) => q.eq("key", "staking_paused"))
            .first();
        
        if (stakingPausedConfig) {
            await ctx.db.patch(stakingPausedConfig._id, { value: false }); // Enable staking
        } else {
            await ctx.db.insert("configs", {
                key: "staking_paused",
                value: false, // Enable staking
            });
        }

        // 3. Trigger Conversion
        const orders = await ctx.db
            .query("presaleOrders")
            .withIndex("by_status", (q) => q.eq("status", "confirmed"))
            .collect();

        const now = Date.now();
        const monthMs = 30 * 24 * 60 * 60 * 1000;

        for (const order of orders) {
            const { quantity, userId, vestingSchedule } = order;

            const immediate = order.totalAmount * (vestingSchedule.immediate / 100);
            const monthlyTotal = order.totalAmount * (vestingSchedule.monthly / 100);
            const monthlyPortion = monthlyTotal / vestingSchedule.months;

            // Create immediate unlock
            if (immediate > 0) {
                await ctx.db.insert("presaleStakes", {
                    orderId: order._id,
                    userId,
                    nodeAmount: immediate,
                    unlockDate: now,
                    status: "unlocked",
                });
            }

            // Create monthly vesting stakes
            for (let i = 1; i <= vestingSchedule.months; i++) {
                await ctx.db.insert("presaleStakes", {
                    orderId: order._id,
                    userId,
                    nodeAmount: monthlyPortion,
                    unlockDate: now + (i * monthMs),
                    status: "locked",
                });
            }

            // Update order status
            await ctx.db.patch(order._id, {
                status: "converted",
                convertedDate: now,
            });
        }

        await ctx.db.insert("presaleAuditLog", {
            action: "admin_action",
            details: {
                action: "open_staking",
                convertedOrders: orders.length
            },
            timestamp: now,
        });

        return { success: true, convertedCount: orders.length };
    },
});

export const convertAllOrders = mutation({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db.query("presaleConfig").first();
        if (!config) throw new Error("Presale config not found");

        // Get all confirmed orders that haven't been converted yet
        const orders = await ctx.db
            .query("presaleOrders")
            .withIndex("by_status", (q) => q.eq("status", "confirmed"))
            .collect();

        if (orders.length === 0) {
            return { success: true, convertedCount: 0, message: "No orders to convert" };
        }

        const now = Date.now();
        const oneYearMs = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
        const endDate = now + oneYearMs;
        let convertedCount = 0;
        let totalStakeAmount = 0;
        const userStakes: Map<string, { userId: any; totalAmount: number; stakeIds: any[] }> = new Map();

        // Import required functions
        const { notify } = await import("./notifications");
        const { updateTeamVolume } = await import("./ranks");
        const { updateActiveDirects } = await import("./unilevel/activeDirectsCalculator");

        for (const order of orders) {
            const { userId, totalAmount } = order;
            const user = await ctx.db.get(userId);
            if (!user) continue;

            // Create 1-year stake directly (no vesting)
            const stakeId = await ctx.db.insert("stakes", {
                userId,
                amount: totalAmount,
                cycleDays: 365, // 1 year
                dailyRate: config.stakingDailyRate,
                startDate: now,
                endDate: endDate,
                status: "active",
                lastYieldDate: now,
            });

            // Log transaction
            await ctx.db.insert("transactions", {
                userId,
                amount: totalAmount,
                type: "deposit",
                referenceId: stakeId,
                description: `Presale Node Converted: ${order.quantity} node(s) → $${totalAmount} stake (1 year)`,
                timestamp: now,
            });

            // Update team volume for ranking
            await updateTeamVolume(ctx, userId, totalAmount);

            // Update referrer's active directs count (for Unilevel unlock)
            if (user.referrerId) {
                await updateActiveDirects(ctx, user.referrerId);
            }

            // Track user stakes for notification
            if (!userStakes.has(userId)) {
                userStakes.set(userId, {
                    userId,
                    totalAmount: 0,
                    stakeIds: [],
                });
            }
            const userStake = userStakes.get(userId)!;
            userStake.totalAmount += totalAmount;
            userStake.stakeIds.push(stakeId);

            // Update order status
            await ctx.db.patch(order._id, {
                status: "converted",
                convertedDate: now,
            });

            convertedCount++;
            totalStakeAmount += totalAmount;
        }

        // Send notifications to all affected users
        for (const [userId, stakeInfo] of userStakes.entries()) {
            const user = await ctx.db.get(userId as Id<"users">);
            if (!user) continue;

            await notify(
                ctx,
                userId,
                "stake",
                "🎉 Your Nodes Have Been Converted!",
                `Great news! Your ${stakeInfo.stakeIds.length} presale node(s) have been automatically converted into a 1-year staking position worth $${stakeInfo.totalAmount.toFixed(2)}. You can now start earning daily rewards and bonuses!`,
                "TrendingUp",
                {
                    totalAmount: stakeInfo.totalAmount,
                    stakeCount: stakeInfo.stakeIds.length,
                    stakeIds: stakeInfo.stakeIds,
                    cycleDays: 365,
                    dailyRate: config.stakingDailyRate,
                }
            );
        }

        // Log audit
        await ctx.db.insert("presaleAuditLog", {
            action: "admin_action",
            details: {
                action: "convert_all_orders",
                convertedCount,
                totalStakeAmount,
                usersAffected: userStakes.size,
            },
            timestamp: now,
        });

        return {
            success: true,
            convertedCount,
            totalStakeAmount,
            usersAffected: userStakes.size,
            message: `Successfully converted ${convertedCount} orders to 1-year stakes for ${userStakes.size} users`,
        };
    },
});

// ==================== ENHANCED PRESALE REPORTS ====================

export const getDetailedPresaleReport = query({
    args: {
        dateRange: v.union(
            v.literal("today"),
            v.literal("week"),
            v.literal("month"),
            v.literal("all"),
            v.literal("custom")
        ),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        status: v.optional(v.union(
            v.literal("all"),
            v.literal("pending"),
            v.literal("confirmed"),
            v.literal("converted"),
            v.literal("cancelled")
        )),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        let filterStartDate = 0;
        let filterEndDate = now;

        // Calculate date range
        if (args.dateRange === "today") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filterStartDate = today.getTime();
        } else if (args.dateRange === "week") {
            filterStartDate = now - (7 * 24 * 60 * 60 * 1000);
        } else if (args.dateRange === "month") {
            filterStartDate = now - (30 * 24 * 60 * 60 * 1000);
        } else if (args.dateRange === "custom" && args.startDate && args.endDate) {
            filterStartDate = args.startDate;
            filterEndDate = args.endDate;
        }

        // Fetch all orders
        const allOrders = await ctx.db.query("presaleOrders").collect();
        
        // Filter orders by date and status
        let filteredOrders = allOrders.filter(o => 
            o.purchaseDate >= filterStartDate && 
            o.purchaseDate <= filterEndDate
        );

        if (args.status && args.status !== "all") {
            filteredOrders = filteredOrders.filter(o => o.status === args.status);
        }

        // Get detailed order information with user data
        const detailedOrders = await Promise.all(
            filteredOrders.map(async (order) => {
                const user = await ctx.db.get(order.userId);
                
                // Get vesting stakes for this order
                const vestingStakes = await ctx.db
                    .query("presaleStakes")
                    .filter((q) => q.eq(q.field("orderId"), order._id))
                    .collect();

                const totalVested = vestingStakes.reduce((sum, s) => sum + s.nodeAmount, 0);
                const unlockedAmount = vestingStakes
                    .filter(s => s.status === "unlocked" || s.status === "claimed")
                    .reduce((sum, s) => sum + s.nodeAmount, 0);
                const lockedAmount = vestingStakes
                    .filter(s => s.status === "locked")
                    .reduce((sum, s) => sum + s.nodeAmount, 0);

                return {
                    orderId: order._id,
                    userId: order.userId,
                    userName: user?.name || "Unknown",
                    userEmail: user?.email || "Unknown",
                    userRank: user?.currentRank || "B0",
                    quantity: order.quantity,
                    totalAmount: order.totalAmount,
                    status: order.status,
                    purchaseDate: order.purchaseDate,
                    convertedDate: order.convertedDate,
                    paymentTxId: order.paymentTxId,
                    vestingSchedule: order.vestingSchedule,
                    vestingProgress: {
                        totalVested,
                        unlockedAmount,
                        lockedAmount,
                        percentageUnlocked: totalVested > 0 ? (unlockedAmount / totalVested) * 100 : 0,
                    },
                    metadata: order.metadata,
                };
            })
        );

        // Calculate summary statistics
        const totalRevenue = filteredOrders
            .filter(o => o.status === "confirmed" || o.status === "converted")
            .reduce((sum, o) => sum + o.totalAmount, 0);

        const totalNodes = filteredOrders
            .filter(o => o.status === "confirmed" || o.status === "converted")
            .reduce((sum, o) => sum + o.quantity, 0);

        const uniqueBuyers = new Set(filteredOrders.map(o => o.userId)).size;

        const statusBreakdown = {
            pending: filteredOrders.filter(o => o.status === "pending").length,
            confirmed: filteredOrders.filter(o => o.status === "confirmed").length,
            converted: filteredOrders.filter(o => o.status === "converted").length,
            cancelled: filteredOrders.filter(o => o.status === "cancelled").length,
        };

        // Time series data
        const dailyMetrics: Record<string, { orders: number; revenue: number; nodes: number }> = {};
        filteredOrders.forEach(o => {
            const date = new Date(o.purchaseDate).toISOString().split('T')[0];
            if (!dailyMetrics[date]) {
                dailyMetrics[date] = { orders: 0, revenue: 0, nodes: 0 };
            }
            dailyMetrics[date].orders++;
            if (o.status === "confirmed" || o.status === "converted") {
                dailyMetrics[date].revenue += o.totalAmount;
                dailyMetrics[date].nodes += o.quantity;
            }
        });

        const timeSeriesData = Object.entries(dailyMetrics)
            .map(([date, metrics]) => ({ date, ...metrics }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate enhanced metrics for detailed report
        const allOrdersForReport = await ctx.db.query("presaleOrders").collect();
        const confirmedOrdersForReport = allOrdersForReport.filter(o => o.status === "confirmed" || o.status === "converted");
        const convertedOrdersForReport = allOrdersForReport.filter(o => o.status === "converted" && o.convertedDate);
        
        const avgTimeToConversion = convertedOrdersForReport.length > 0
            ? convertedOrdersForReport.reduce((sum, o) => {
                const timeToConvert = (o.convertedDate! - o.purchaseDate) / (1000 * 60 * 60 * 24); // days
                return sum + timeToConvert;
            }, 0) / convertedOrdersForReport.length
            : 0;

        // Growth metrics
        const reportNow = Date.now();
        const sevenDaysAgo = reportNow - (7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
        
        const recentOrders7d = confirmedOrdersForReport.filter(o => o.purchaseDate >= sevenDaysAgo);
        const previousOrders7d = confirmedOrdersForReport.filter(o => 
            o.purchaseDate >= fourteenDaysAgo && o.purchaseDate < sevenDaysAgo
        );
        
        const recentRevenue7d = recentOrders7d.reduce((sum, o) => sum + o.totalAmount, 0);
        const previousRevenue7d = previousOrders7d.reduce((sum, o) => sum + o.totalAmount, 0);
        
        const revenueGrowth = previousRevenue7d > 0
            ? ((recentRevenue7d - previousRevenue7d) / previousRevenue7d) * 100
            : 0;

        const nodesGrowth = previousOrders7d.length > 0
            ? ((recentOrders7d.length - previousOrders7d.length) / previousOrders7d.length) * 100
            : 0;

        // Get converted stakes value
        const allStakes = await ctx.db.query("stakes").collect();
        const totalConvertedStakeValue = allStakes.reduce((sum, s) => sum + s.amount, 0);

        return {
            summary: {
                totalOrders: filteredOrders.length,
                totalRevenue,
                totalNodes,
                uniqueBuyers,
                avgOrderValue: filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0,
                avgNodesPerOrder: filteredOrders.length > 0 ? totalNodes / filteredOrders.length : 0,
                statusBreakdown,
                avgTimeToConversion,
                revenueGrowth,
                nodesGrowth,
                convertedStakesCount: convertedOrdersForReport.length,
                totalConvertedStakeValue,
            },
            orders: detailedOrders.sort((a, b) => b.purchaseDate - a.purchaseDate),
            timeSeriesData,
        };
    },
});

export const getVestingScheduleReport = query({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db.query("presaleConfig").first();
        const allStakes = await ctx.db.query("presaleStakes").collect();
        const allOrders = await ctx.db.query("presaleOrders").collect();

        if (!config) return null;

        // Group stakes by unlock date
        const vestingTimeline: Record<string, { locked: number; unlocked: number; claimed: number; totalValue: number }> = {};
        
        allStakes.forEach(stake => {
            const date = new Date(stake.unlockDate).toISOString().split('T')[0];
            if (!vestingTimeline[date]) {
                vestingTimeline[date] = { locked: 0, unlocked: 0, claimed: 0, totalValue: 0 };
            }
            
            if (stake.status === "locked") {
                vestingTimeline[date].locked += stake.nodeAmount;
            } else if (stake.status === "unlocked") {
                vestingTimeline[date].unlocked += stake.nodeAmount;
            } else if (stake.status === "claimed") {
                vestingTimeline[date].claimed += stake.nodeAmount;
            }
            vestingTimeline[date].totalValue += stake.nodeAmount;
        });

        // User-level vesting details
        const userVesting: Record<string, any> = {};
        
        for (const stake of allStakes) {
            const userId = stake.userId;
            if (!userVesting[userId]) {
                const user = await ctx.db.get(userId);
                const userOrders = allOrders.filter(o => o.userId === userId);
                userVesting[userId] = {
                    userId,
                    userName: user?.name || "Unknown",
                    userEmail: user?.email || "Unknown",
                    totalPurchased: userOrders.reduce((sum, o) => sum + o.totalAmount, 0),
                    totalLocked: 0,
                    totalUnlocked: 0,
                    totalClaimed: 0,
                    nextUnlockDate: null as number | null,
                    nextUnlockAmount: 0,
                };
            }

            if (stake.status === "locked") {
                userVesting[userId].totalLocked += stake.nodeAmount;
                const now = Date.now();
                if (stake.unlockDate > now && (!userVesting[userId].nextUnlockDate || stake.unlockDate < userVesting[userId].nextUnlockDate)) {
                    userVesting[userId].nextUnlockDate = stake.unlockDate;
                    userVesting[userId].nextUnlockAmount = stake.nodeAmount;
                }
            } else if (stake.status === "unlocked") {
                userVesting[userId].totalUnlocked += stake.nodeAmount;
            } else if (stake.status === "claimed") {
                userVesting[userId].totalClaimed += stake.nodeAmount;
            }
        }

        const vestingTimelineArray = Object.entries(vestingTimeline)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const userVestingArray = Object.values(userVesting)
            .sort((a: any, b: any) => b.totalPurchased - a.totalPurchased);

        // Overall statistics
        const totalLocked = allStakes.filter(s => s.status === "locked").reduce((sum, s) => sum + s.nodeAmount, 0);
        const totalUnlocked = allStakes.filter(s => s.status === "unlocked").reduce((sum, s) => sum + s.nodeAmount, 0);
        const totalClaimed = allStakes.filter(s => s.status === "claimed").reduce((sum, s) => sum + s.nodeAmount, 0);
        const totalVesting = totalLocked + totalUnlocked + totalClaimed;

        return {
            summary: {
                totalVesting,
                totalLocked,
                totalUnlocked,
                totalClaimed,
                percentageLocked: totalVesting > 0 ? (totalLocked / totalVesting) * 100 : 0,
                percentageUnlocked: totalVesting > 0 ? (totalUnlocked / totalVesting) * 100 : 0,
                percentageClaimed: totalVesting > 0 ? (totalClaimed / totalVesting) * 100 : 0,
            },
            vestingTimeline: vestingTimelineArray,
            userVesting: userVestingArray,
        };
    },
});

export const getPresaleAuditLog = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 100;

        const auditLogs = await ctx.db
            .query("presaleAuditLog")
            .order("desc")
            .take(limit);

        return auditLogs.map(log => ({
            _id: log._id,
            action: log.action,
            details: log.details,
            timestamp: log.timestamp,
        }));
    },
});

export const getPresaleUserAnalytics = query({
    args: {},
    handler: async (ctx) => {
        const orders = await ctx.db.query("presaleOrders").collect();
        const users = await ctx.db.query("users").collect();

        // Top buyers by amount
        const buyerStats: Record<string, { userId: any; totalSpent: number; totalNodes: number; orderCount: number }> = {};
        
        orders.forEach(order => {
            if (order.status === "confirmed" || order.status === "converted") {
                if (!buyerStats[order.userId]) {
                    buyerStats[order.userId] = {
                        userId: order.userId,
                        totalSpent: 0,
                        totalNodes: 0,
                        orderCount: 0,
                    };
                }
                buyerStats[order.userId].totalSpent += order.totalAmount;
                buyerStats[order.userId].totalNodes += order.quantity;
                buyerStats[order.userId].orderCount++;
            }
        });

        const topBuyers = await Promise.all(
            Object.values(buyerStats)
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, 20)
                .map(async (stat) => {
                    const user = await ctx.db.get(stat.userId as Id<"users">);
                    if (!user || !('name' in user)) {
                        return {
                            userId: stat.userId,
                            userName: "Unknown",
                            userEmail: "Unknown",
                            userRank: "B0",
                            totalSpent: stat.totalSpent,
                            totalNodes: stat.totalNodes,
                            orderCount: stat.orderCount,
                            avgOrderValue: stat.totalSpent / stat.orderCount,
                        };
                    }
                    return {
                        userId: stat.userId,
                        userName: user.name || "Unknown",
                        userEmail: user.email || "Unknown",
                        userRank: user.currentRank || "B0",
                        totalSpent: stat.totalSpent,
                        totalNodes: stat.totalNodes,
                        orderCount: stat.orderCount,
                        avgOrderValue: stat.totalSpent / stat.orderCount,
                    };
                })
        );

        // Buyer distribution by purchase size
        const distributionBuckets = {
            "1-10": 0,
            "11-25": 0,
            "26-50": 0,
            "51-100": 0,
            "100+": 0,
        };

        Object.values(buyerStats).forEach(stat => {
            if (stat.totalNodes <= 10) distributionBuckets["1-10"]++;
            else if (stat.totalNodes <= 25) distributionBuckets["11-25"]++;
            else if (stat.totalNodes <= 50) distributionBuckets["26-50"]++;
            else if (stat.totalNodes <= 100) distributionBuckets["51-100"]++;
            else distributionBuckets["100+"]++;
        });

        // Rank distribution of buyers
        const rankDistribution: Record<string, number> = {};
        await Promise.all(
            Object.keys(buyerStats).map(async (userId) => {
                const user = await ctx.db.get(userId as Id<"users">);
                const rank = (user && 'currentRank' in user) ? user.currentRank : "B0";
                rankDistribution[rank] = (rankDistribution[rank] || 0) + 1;
            })
        );

        return {
            topBuyers,
            distributionBuckets: Object.entries(distributionBuckets).map(([range, count]) => ({ range, count })),
            rankDistribution: Object.entries(rankDistribution)
                .map(([rank, count]) => ({ rank, count }))
                .sort((a, b) => a.rank.localeCompare(b.rank)),
            totalBuyers: Object.keys(buyerStats).length,
            totalOrders: orders.filter(o => o.status === "confirmed" || o.status === "converted").length,
            avgOrdersPerBuyer: Object.keys(buyerStats).length > 0 
                ? orders.filter(o => o.status === "confirmed" || o.status === "converted").length / Object.keys(buyerStats).length 
                : 0,
        };
    },
});
