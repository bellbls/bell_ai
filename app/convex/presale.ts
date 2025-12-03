import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// --- Configuration ---

export const getConfig = query({
    args: {},
    handler: async (ctx) => {
        const config = await ctx.db.query("presaleConfig").first();
        return config;
    },
});

export const initializeConfig = mutation({
    args: {
        totalNodes: v.number(),
        pricePerNode: v.number(),
        perUserLimit: v.number(),
        startDate: v.number(),
        endDate: v.number(),
        vestingSchedule: v.object({
            immediate: v.number(),
            monthly: v.number(),
            months: v.number(),
        }),
        stakingCycleDays: v.number(),
        stakingDailyRate: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("presaleConfig").first();
        if (existing) throw new Error("Config already exists");

        await ctx.db.insert("presaleConfig", {
            isActive: true,
            stakingOpen: false,
            soldNodes: 0,
            ...args,
        });
    },
});

export const updatePresaleConfig = mutation({
    args: {
        totalNodes: v.optional(v.number()),
        pricePerNode: v.optional(v.number()),
        perUserLimit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const config = await ctx.db.query("presaleConfig").first();
        if (!config) throw new Error("Presale config not found");

        const updates: any = {};
        
        if (args.totalNodes !== undefined) {
            if (args.totalNodes < config.soldNodes) {
                throw new Error(`Cannot set total nodes to ${args.totalNodes}. Already sold ${config.soldNodes} nodes.`);
            }
            updates.totalNodes = args.totalNodes;
        }
        
        if (args.pricePerNode !== undefined) {
            if (args.pricePerNode <= 0) {
                throw new Error("Price per node must be greater than 0");
            }
            updates.pricePerNode = args.pricePerNode;
        }
        
        if (args.perUserLimit !== undefined) {
            if (args.perUserLimit <= 0) {
                throw new Error("Per user limit must be greater than 0");
            }
            updates.perUserLimit = args.perUserLimit;
        }

        await ctx.db.patch(config._id, updates);

        // Log audit
        await ctx.db.insert("presaleAuditLog", {
            action: "admin_action",
            details: {
                action: "update_config",
                updates: args,
            },
            timestamp: Date.now(),
        });

        return { success: true };
    },
});

// --- User Queries ---

export const getUserOrders = query({
    args: { 
        userId: v.optional(v.id("users")),
        accountId: v.optional(v.id("accounts")),
    },
    handler: async (ctx, args) => {
        if (args.accountId) {
            return await ctx.db
                .query("presaleOrders")
                .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
                .collect();
        } else if (args.userId) {
            // Legacy: query by userId
            return await ctx.db
                .query("presaleOrders")
                .withIndex("by_userId", (q) => q.eq("userId", args.userId))
                .collect();
        }
        return [];
    },
});

export const getUserVestedStakes = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("presaleStakes")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();
    },
});

// --- Purchase Logic ---

export const purchaseNode = mutation({
    args: {
        userId: v.id("users"),
        quantity: v.number(),
    },
    handler: async (ctx, args) => {
        const { userId, quantity } = args;

        if (quantity <= 0) throw new Error("Invalid quantity");

        // 1. Get Config & Validate Presale Status
        const config = await ctx.db.query("presaleConfig").first();
        if (!config) throw new Error("Presale not configured");
        if (!config.isActive) throw new Error("Presale is not active");

        const now = Date.now();
        if (now < config.startDate) throw new Error("Presale has not started yet");
        if (now > config.endDate) throw new Error("Presale has ended");

        // 2. Check Supply
        if (config.soldNodes + quantity > config.totalNodes) {
            throw new Error(`Insufficient nodes available. Only ${config.totalNodes - config.soldNodes} remaining.`);
        }

        // 3. Check Per-User Limit
        const userOrders = await ctx.db
            .query("presaleOrders")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        const userTotalPurchased = userOrders.reduce((sum, o) => sum + o.quantity, 0);
        if (userTotalPurchased + quantity > config.perUserLimit) {
            throw new Error(`Purchase exceeds limit. You can only buy ${config.perUserLimit - userTotalPurchased} more nodes.`);
        }

        // 4. Check Wallet Balance
        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        const totalCost = quantity * config.pricePerNode;
        if (user.walletBalance < totalCost) {
            throw new Error(`Insufficient wallet balance. Required: $${totalCost}, Available: $${user.walletBalance}`);
        }

        // --- Atomic Transaction Execution ---

        // A. Deduct Balance
        await ctx.db.patch(userId, {
            walletBalance: user.walletBalance - totalCost,
        });

        // B. Create Transaction Record
        const txId = await ctx.db.insert("transactions", {
            userId,
            amount: -totalCost,
            type: "deposit", // Using deposit type for deduction as per schema, or could add specific type if needed
            description: `Presale Purchase: ${quantity} Node(s)`,
            timestamp: now,
            status: "approved",
        });

        // C. Create Presale Order
        const orderId = await ctx.db.insert("presaleOrders", {
            userId,
            quantity,
            totalAmount: totalCost,
            status: "confirmed",
            paymentTxId: txId, // Using the ID directly as string if schema expects string, or convert
            purchaseDate: now,
            vestingSchedule: config.vestingSchedule,
        });

        // D. Update Sold Count
        await ctx.db.patch(config._id, {
            soldNodes: config.soldNodes + quantity,
        });

        // E. Audit Log
        await ctx.db.insert("presaleAuditLog", {
            action: "purchase",
            userId,
            orderId,
            details: {
                quantity,
                cost: totalCost,
                pricePerNode: config.pricePerNode,
            },
            timestamp: now,
        });

        // F. Create Notification
        try {
            await ctx.db.insert("notifications", {
                userId: userId,
                type: "system" as const,
                title: "Node Purchase Successful",
                message: `You successfully purchased ${quantity} node${quantity > 1 ? 's' : ''} for $${totalCost.toFixed(2)}. Your nodes will be converted to stakes when staking goes live.`,
                icon: "Rocket",
                data: {
                    orderId: orderId.toString(),
                    quantity,
                    totalAmount: totalCost,
                    pricePerNode: config.pricePerNode,
                },
                read: false,
                createdAt: now,
            });
        } catch (notificationError) {
            // Log error but don't fail the purchase if notification fails
            console.error("Failed to create purchase notification:", notificationError);
        }

        return { orderId, success: true };
    },
});

export const claimStakes = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const { userId } = args;
        const now = Date.now();

        // 1. Get Config for default staking parameters
        const config = await ctx.db.query("presaleConfig").first();
        if (!config) throw new Error("Presale config not found");

        // 2. Find all unlocked but unclaimed stakes
        const unlockedStakes = await ctx.db
            .query("presaleStakes")
            .withIndex("by_userId_status", (q) =>
                q.eq("userId", userId).eq("status", "unlocked")
            )
            .collect();

        if (unlockedStakes.length === 0) {
            throw new Error("No unlocked stakes available to claim");
        }

        let totalClaimed = 0;
        const claimedStakeIds = [];

        // 3. Process each stake
        for (const stake of unlockedStakes) {
            // Create actual platform stake
            const endDate = now + (config.stakingCycleDays * 24 * 60 * 60 * 1000);

            const newStakeId = await ctx.db.insert("stakes", {
                userId,
                amount: stake.nodeAmount,
                cycleDays: config.stakingCycleDays,
                dailyRate: config.stakingDailyRate,
                startDate: now,
                endDate: endDate,
                status: "active",
            });

            // Update presale stake record
            await ctx.db.patch(stake._id, {
                status: "claimed",
                claimedDate: now,
                stakeId: newStakeId,
            });

            // Log audit
            await ctx.db.insert("presaleAuditLog", {
                action: "claim",
                userId,
                details: {
                    presaleStakeId: stake._id,
                    stakeId: newStakeId,
                    amount: stake.nodeAmount,
                },
                timestamp: now,
            });

            totalClaimed += stake.nodeAmount;
            claimedStakeIds.push(newStakeId);
        }

        return {
            success: true,
            claimedCount: unlockedStakes.length,
            totalAmount: totalClaimed,
            stakeIds: claimedStakeIds
        };
    },
});

export const unlockVestedStakes = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const lockedStakes = await ctx.db
            .query("presaleStakes")
            .withIndex("by_status", (q) => q.eq("status", "locked"))
            .collect();

        let unlockedCount = 0;

        for (const stake of lockedStakes) {
            if (stake.unlockDate <= now) {
                await ctx.db.patch(stake._id, {
                    status: "unlocked",
                });
                unlockedCount++;
            }
        }

        if (unlockedCount > 0) {
            await ctx.db.insert("presaleAuditLog", {
                action: "admin_action",
                details: {
                    action: "auto_unlock",
                    count: unlockedCount,
                },
                timestamp: now,
            });
        }

        return unlockedCount;
    },
});
