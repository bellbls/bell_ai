/**
 * Network Initialization Script
 * Run this once to set up the three blockchain networks
 * 
 * Usage: Open Convex dashboard -> Functions -> Run this mutation
 */

import { mutation } from "./_generated/server";

export const initializeNetworksOnce = mutation({
    args: {},
    handler: async (ctx) => {
        // Check if networks already exist
        const existing = await ctx.db.query("blockchain_networks").collect();
        if (existing.length > 0) {
            return {
                success: false,
                message: `Networks already initialized (${existing.length} networks found)`,
                networks: existing.map(n => ({ name: n.name, network: n.network, isActive: n.isActive }))
            };
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
                name: "BSC",
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

        const createdNetworks = [];
        for (const network of networks) {
            const id = await ctx.db.insert("blockchain_networks", network);
            createdNetworks.push({ id, name: network.name, network: network.network });
        }

        return {
            success: true,
            message: "Networks initialized successfully",
            networks: createdNetworks
        };
    },
});

/**
 * Helper: Activate a network for testing (without contract deployment)
 */
export const activateNetworkForTesting = mutation({
    args: {},
    handler: async (ctx) => {
        const networks = await ctx.db.query("blockchain_networks").collect();

        const updates = [];
        for (const network of networks) {
            await ctx.db.patch(network._id, {
                isActive: true,
                contractAddress: `0x${"0".repeat(40)}`, // Dummy address for testing
                hotWalletBalance: Math.random() * 1000, // Random balance for testing
                lastBalanceCheck: Date.now(),
            });
            updates.push(network.name);
        }

        return {
            success: true,
            message: `Activated ${updates.length} networks for testing`,
            networks: updates
        };
    },
});

/**
 * Helper: Create test alerts
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
                title: "BSC Deposits Paused",
                message: "Deposits have been paused on BSC for maintenance",
                isRead: false,
                createdAt: Date.now() - 3600000,
            },
            {
                type: "network_error" as const,
                network: "arbitrum",
                severity: "warning" as const,
                title: "Network Error: Arbitrum",
                message: "Failed to check balance on Arbitrum: RPC timeout",
                data: { error: "RPC timeout" },
                isRead: true,
                createdAt: Date.now() - 7200000,
                readAt: Date.now() - 3600000,
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
            alertIds: created
        };
    },
});
