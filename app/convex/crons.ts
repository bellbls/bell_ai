import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
    "distribute-daily-rewards",
    { hourUTC: 0, minuteUTC: 0 }, // Run at midnight UTC
    api.rewards.distributeDailyRewards
);

// Multi-network deposit listener - runs every 60 seconds to check for blockchain deposits
crons.interval(
    "multi-network-deposit-listener",
    { seconds: 60 },
    internal.multiNetworkDepositListener.checkForDeposits
);

// Withdrawal executer - runs every 5 minutes to process approved withdrawals
crons.interval(
    "withdrawal-executer",
    { minutes: 5 },
    internal.withdrawalExecuter.executeWithdrawals
);

// Low balance monitor - runs every hour to check hot wallet balances
crons.interval(
    "low-balance-monitor",
    { hours: 1 },
    internal.lowBalanceMonitor.checkBalances
);

// Unlock vested presale stakes - runs daily
crons.daily(
    "unlock-vested-stakes",
    { hourUTC: 0, minuteUTC: 0 },
    api.presale.unlockVestedStakes
);

export default crons;
