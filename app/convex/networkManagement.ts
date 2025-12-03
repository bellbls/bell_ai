import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Network Management API
 * Manages blockchain network configurations for multi-chain support
 */

/**
 * Initialize network configurations
 * Call this once to set up the three networks
 */
export const initializeNetworks = mutation({
    args: {},
    handler: async (ctx) => {
        // Check if networks already exist
        const existing = await ctx.db.query("blockchain_networks").collect();
        if (existing.length > 0) {
            return { success: false, message: "Networks already initialized" };
        }

        const networks = [
            {
                network: "polygon",
                name: "Polygon",
                chainId: 137,
                contractAddress: "", // To be filled after deployment
                usdtAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
                rpcUrl: "https://polygon-rpc.com",
                isActive: false, // Activate after contract deployment
                isPaused: false,
                lowBalanceThreshold: 500,
                decimals: 6,
                blockExplorer: "https://polygonscan.com",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            {
                network: "bsc",
                name: "BNB-BSC(BEP20)",
                chainId: 56,
                contractAddress: "", // To be filled after deployment
                usdtAddress: "0x55d398326f99059fF775485246999027B3197955",
                rpcUrl: "https://bsc-dataseed.binance.org",
                isActive: false,
                isPaused: false,
                lowBalanceThreshold: 500,
                decimals: 18, // BSC USDT uses 18 decimals!
                blockExplorer: "https://bscscan.com",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            {
                network: "arbitrum",
                name: "Arbitrum",
                chainId: 42161,
                contractAddress: "", // To be filled after deployment
                usdtAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                rpcUrl: "https://arb1.arbitrum.io/rpc",
                isActive: false,
                isPaused: false,
                lowBalanceThreshold: 500,
                decimals: 6,
                blockExplorer: "https://arbiscan.io",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
        ];

        for (const network of networks) {
            await ctx.db.insert("blockchain_networks", network);
        }

        return { success: true, message: "Networks initialized successfully" };
    },
});

/**
 * Get all networks
 */
export const getAllNetworks = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("blockchain_networks").collect();
    },
});

/**
 * Get active networks only
 */
export const getActiveNetworks = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("blockchain_networks")
            .withIndex("by_isActive", (q) => q.eq("isActive", true))
            .collect();
    },
});

/**
 * Get network by name
 */
export const getNetwork = query({
    args: { network: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("blockchain_networks")
            .withIndex("by_network", (q) => q.eq("network", args.network))
            .first();
    },
});

/**
 * Update network configuration (admin only)
 */
export const updateNetwork = mutation({
    args: {
        network: v.string(),
        contractAddress: v.optional(v.string()),
        rpcUrl: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        isPaused: v.optional(v.boolean()),
        lowBalanceThreshold: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const networkDoc = await ctx.db
            .query("blockchain_networks")
            .withIndex("by_network", (q) => q.eq("network", args.network))
            .first();

        if (!networkDoc) {
            throw new Error(`Network ${args.network} not found`);
        }

        const updates: any = { updatedAt: Date.now() };
        if (args.contractAddress !== undefined) updates.contractAddress = args.contractAddress;
        if (args.rpcUrl !== undefined) updates.rpcUrl = args.rpcUrl;
        if (args.isActive !== undefined) updates.isActive = args.isActive;
        if (args.isPaused !== undefined) updates.isPaused = args.isPaused;
        if (args.lowBalanceThreshold !== undefined) updates.lowBalanceThreshold = args.lowBalanceThreshold;

        await ctx.db.patch(networkDoc._id, updates);

        return { success: true, message: `Network ${args.network} updated` };
    },
});

/**
 * Pause deposits on a network (admin only)
 */
export const pauseNetwork = mutation({
    args: { network: v.string() },
    handler: async (ctx, args) => {
        const networkDoc = await ctx.db
            .query("blockchain_networks")
            .withIndex("by_network", (q) => q.eq("network", args.network))
            .first();

        if (!networkDoc) {
            throw new Error(`Network ${args.network} not found`);
        }

        await ctx.db.patch(networkDoc._id, {
            isPaused: true,
            updatedAt: Date.now(),
        });

        // Create admin alert
        await ctx.db.insert("admin_alerts", {
            type: "deposit_paused",
            network: args.network,
            severity: "warning",
            title: `${networkDoc.name} Deposits Paused`,
            message: `Deposits have been paused on ${networkDoc.name}`,
            isRead: false,
            createdAt: Date.now(),
        });

        return { success: true, message: `${networkDoc.name} deposits paused` };
    },
});

/**
 * Resume deposits on a network (admin only)
 */
export const resumeNetwork = mutation({
    args: { network: v.string() },
    handler: async (ctx, args) => {
        const networkDoc = await ctx.db
            .query("blockchain_networks")
            .withIndex("by_network", (q) => q.eq("network", args.network))
            .first();

        if (!networkDoc) {
            throw new Error(`Network ${args.network} not found`);
        }

        await ctx.db.patch(networkDoc._id, {
            isPaused: false,
            updatedAt: Date.now(),
        });

        // Create admin alert
        await ctx.db.insert("admin_alerts", {
            type: "deposit_paused",
            network: args.network,
            severity: "info",
            title: `${networkDoc.name} Deposits Resumed`,
            message: `Deposits have been resumed on ${networkDoc.name}`,
            isRead: false,
            createdAt: Date.now(),
        });

        return { success: true, message: `${networkDoc.name} deposits resumed` };
    },
});

/**
 * Update network balance (internal - called by balance monitor)
 */
export const updateNetworkBalance = internalMutation({
    args: {
        network: v.string(),
        balance: v.number(),
    },
    handler: async (ctx, args) => {
        const networkDoc = await ctx.db
            .query("blockchain_networks")
            .withIndex("by_network", (q) => q.eq("network", args.network))
            .first();

        if (!networkDoc) {
            throw new Error(`Network ${args.network} not found`);
        }

        await ctx.db.patch(networkDoc._id, {
            hotWalletBalance: args.balance,
            lastBalanceCheck: Date.now(),
            updatedAt: Date.now(),
        });

        // Check if balance is low
        if (args.balance < networkDoc.lowBalanceThreshold) {
            // Create low balance alert
            await ctx.db.insert("admin_alerts", {
                type: "low_balance",
                network: args.network,
                severity: "critical",
                title: `Low Balance: ${networkDoc.name}`,
                message: `Hot wallet balance on ${networkDoc.name} is $${args.balance.toFixed(2)}, below threshold of $${networkDoc.lowBalanceThreshold}`,
                data: {
                    balance: args.balance,
                    threshold: networkDoc.lowBalanceThreshold,
                },
                isRead: false,
                createdAt: Date.now(),
            });
        }
    },
});

/**
 * Get network balances (all networks)
 */
export const getNetworkBalances = query({
    args: {},
    handler: async (ctx) => {
        const networks = await ctx.db.query("blockchain_networks").collect();
        return networks.map((n) => ({
            network: n.network,
            name: n.name,
            balance: n.hotWalletBalance || 0,
            threshold: n.lowBalanceThreshold,
            isLow: (n.hotWalletBalance || 0) < n.lowBalanceThreshold,
            lastCheck: n.lastBalanceCheck,
        }));
    },
});

/**
 * TEST HELPER: Activate all networks with dummy data for testing
 * This allows testing the admin panel without deploying contracts
 */
export const activateNetworksForTesting = mutation({
    args: {},
    handler: async (ctx) => {
        const networks = await ctx.db.query("blockchain_networks").collect();

        if (networks.length === 0) {
            return {
                success: false,
                message: "No networks found. Run initializeNetworks first."
            };
        }

        const updates = [];
        for (const network of networks) {
            // Set random balance between $200-$800
            const randomBalance = Math.floor(Math.random() * 600) + 200;

            await ctx.db.patch(network._id, {
                isActive: true,
                contractAddress: `0x${"1234567890abcdef".repeat(2)}${network.network.substring(0, 8)}`, // Dummy address
                hotWalletBalance: randomBalance,
                lastBalanceCheck: Date.now(),
                updatedAt: Date.now(),
            });
            updates.push({ name: network.name, balance: randomBalance });
        }

        return {
            success: true,
            message: `Activated ${updates.length} networks with test data`,
            networks: updates
        };
    },
});

/**
 * TEST HELPER: Create sample alerts for testing
 */
export const createTestAlerts = mutation({
    args: {},
    handler: async (ctx) => {
        const testAlerts = [
            {
                type: "low_balance" as const,
                network: "polygon",
                severity: "critical" as const,
                title: "Low Balance: Polygon",
                message: "Hot wallet balance on Polygon is $234.56, below threshold of $500",
                data: { balance: 234.56, threshold: 500 },
                isRead: false,
                createdAt: Date.now(),
            },
            {
                type: "deposit_paused" as const,
                network: "bsc",
                severity: "warning" as const,
                title: "BNB-BSC(BEP20) Deposits Paused",
                message: "Deposits have been paused on BNB-BSC(BEP20) for maintenance",
                isRead: false,
                createdAt: Date.now() - 3600000, // 1 hour ago
            },
            {
                type: "network_error" as const,
                network: "arbitrum",
                severity: "warning" as const,
                title: "Network Error: Arbitrum",
                message: "Failed to check balance on Arbitrum: RPC timeout",
                data: { error: "RPC timeout" },
                isRead: true,
                createdAt: Date.now() - 7200000, // 2 hours ago
                readAt: Date.now() - 3600000,
            },
            {
                type: "sync_error" as const,
                severity: "info" as const,
                title: "Deposit Sync Completed",
                message: "Successfully synced 15 deposits across all networks",
                isRead: false,
                createdAt: Date.now() - 1800000, // 30 minutes ago
            },
        ];

        const created = [];
        for (const alert of testAlerts) {
            const id = await ctx.db.insert("admin_alerts", alert);
            created.push(id);
        }

        return {
            success: true,
            message: `Created ${created.length} test alerts`,
            count: created.length
        };
    },
});

