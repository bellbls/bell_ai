import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Low Balance Monitor
 * Checks hot wallet balances across all networks and creates alerts when low
 * Runs as a cron job every hour
 */

/**
 * Check balances for all active networks
 */
export const checkBalances = internalAction({
    args: {},
    handler: async (ctx) => {
        const startTime = Date.now();
        let checkedCount = 0;
        let lowBalanceCount = 0;
        const errors: string[] = [];

        try {
            // Get all active networks
            const networks = await ctx.runQuery(internal.networkManagement.getActiveNetworks, {});

            if (!networks || networks.length === 0) {
                console.log("No active networks to monitor");
                return {
                    success: true,
                    message: "No active networks",
                    checkedCount: 0,
                };
            }

            console.log(`Checking balances for ${networks.length} active networks...`);

            // Initialize ethers
            const ethers = await import("ethers");

            // Check each network
            for (const network of networks) {
                try {
                    if (!network.contractAddress || network.contractAddress === "") {
                        console.log(`Skipping ${network.name}: No contract address configured`);
                        continue;
                    }

                    if (!network.rpcUrl) {
                        console.log(`Skipping ${network.name}: No RPC URL configured`);
                        continue;
                    }

                    // Connect to network
                    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
                    const usdtContract = new ethers.Contract(
                        network.usdtAddress,
                        ["function balanceOf(address) view returns (uint256)"],
                        provider
                    );

                    // Get contract balance
                    const balanceWei = await usdtContract.balanceOf(network.contractAddress);
                    const balanceDecimal = Number(ethers.formatUnits(balanceWei, network.decimals));

                    console.log(`${network.name}: $${balanceDecimal.toFixed(2)}`);

                    // Update network balance in database
                    await ctx.runMutation(internal.networkManagement.updateNetworkBalance, {
                        network: network.network,
                        balance: balanceDecimal,
                    });

                    checkedCount++;

                    // Check if low
                    if (balanceDecimal < network.lowBalanceThreshold) {
                        lowBalanceCount++;
                        console.log(`⚠️ LOW BALANCE: ${network.name} - $${balanceDecimal.toFixed(2)} < $${network.lowBalanceThreshold}`);
                    }

                } catch (error: any) {
                    console.error(`Error checking ${network.name}:`, error.message);
                    errors.push(`${network.name}: ${error.message}`);

                    // Create network error alert
                    await ctx.runMutation(internal.adminAlerts.createAlert, {
                        type: "network_error",
                        network: network.network,
                        severity: "warning",
                        title: `Balance Check Failed: ${network.name}`,
                        message: `Failed to check balance on ${network.name}: ${error.message}`,
                        data: { error: error.message },
                    });
                }
            }

            // Log cron execution
            await ctx.runMutation(internal.blockchainSync.logCronExecution, {
                jobName: "low-balance-monitor",
                status: errors.length > 0 ? "failed" : "success",
                message: `Checked ${checkedCount} networks, ${lowBalanceCount} low balances`,
                executionTimeMs: Date.now() - startTime,
                details: errors.length > 0 ? JSON.stringify({ errors }) : undefined,
            });

            return {
                success: true,
                checkedCount,
                lowBalanceCount,
                errors: errors.length > 0 ? errors : undefined,
                executionTimeMs: Date.now() - startTime,
            };

        } catch (error: any) {
            console.error("Low balance monitor error:", error);

            // Log error
            await ctx.runMutation(internal.blockchainSync.logCronExecution, {
                jobName: "low-balance-monitor",
                status: "failed",
                message: `Error: ${error.message}`,
                executionTimeMs: Date.now() - startTime,
                details: error.stack,
            });

            throw error;
        }
    },
});
