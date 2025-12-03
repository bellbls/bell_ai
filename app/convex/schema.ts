import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Logins table - stores authentication credentials
  logins: defineTable({
    email: v.string(),
    password: v.optional(v.string()),
    
    // Security & Auth Fields
    emailVerified: v.optional(v.boolean()),  // Email verification status
    emailVerificationToken: v.optional(v.string()),  // Token for email verification
    emailVerificationExpiry: v.optional(v.number()),  // Token expiry timestamp
    passwordResetToken: v.optional(v.string()),  // Token for password reset
    passwordResetExpiry: v.optional(v.number()),  // Token expiry timestamp
    lastLoginAt: v.optional(v.number()),  // Last successful login
    lastLoginIp: v.optional(v.string()),  // IP address of last login
    loginAttempts: v.optional(v.number()),  // Failed login attempts counter
    lockedUntil: v.optional(v.number()),  // Account lock expiry (for brute force protection)
    twoFactorEnabled: v.optional(v.boolean()),  // 2FA enabled status
    twoFactorSecret: v.optional(v.string()),  // TOTP secret for 2FA (encrypted)
    twoFactorBackupCodes: v.optional(v.array(v.string())),  // Hashed backup codes
    twoFactorSetupAt: v.optional(v.number()),  // When 2FA was enabled
    twoFactorRequiredAt: v.optional(v.number()),  // When user was required to set up 2FA (for grace period tracking)

    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_emailVerificationToken", ["emailVerificationToken"])  // For email verification
    .index("by_passwordResetToken", ["passwordResetToken"]),  // For password reset

  // Accounts table - stores account-specific business data
  accounts: defineTable({
    loginId: v.id("logins"),  // Link to login
    name: v.string(),
    referralCode: v.string(),
    referrerId: v.optional(v.id("accounts")), // Direct Sponsor (account, not login)
    role: v.optional(v.string()), // "admin" or undefined for regular users
    isDefault: v.optional(v.boolean()), // Is this the default account for the login?
    isDeleted: v.optional(v.boolean()), // Soft delete flag

    // Binary Tree Fields
    parentId: v.optional(v.id("accounts")), // Upline in Binary Tree
    leftLegId: v.optional(v.id("accounts")),
    rightLegId: v.optional(v.id("accounts")),
    position: v.optional(v.union(v.literal("left"), v.literal("right"))),

    currentRank: v.string(), // "B0", "B1", ...
    teamVolume: v.number(), // USDT
    directReferralsCount: v.number(),
    walletBalance: v.number(),

    // Web3 Deposit Address (for receiving blockchain deposits)
    depositAddress: v.optional(v.string()),  // Account's Ethereum address for deposits
    depositAddressLinkedAt: v.optional(v.number()),  // When address was linked

    // Unilevel Commission Tracking
    activeDirectReferrals: v.optional(v.number()),      // Count of directs with active stakes
    unlockedLevels: v.optional(v.number()),             // Calculated: activeDirectReferrals × 2 (max 10)
    lastUnlockUpdate: v.optional(v.number()),           // When unlock was last calculated

    // B-Rank Bonus Capping
    totalBRankBonusReceived: v.optional(v.number()),    // Total B-Rank bonuses received (lifetime)

    // BellCoin Stable (BLS) Balance
    blsBalance: v.optional(v.number()),                  // BLS balance (off-chain points)

    createdAt: v.number(),
  })
    .index("by_loginId", ["loginId"])
    .index("by_referralCode", ["referralCode"])
    .index("by_referrerId", ["referrerId"])
    .index("by_parentId", ["parentId"])
    .index("by_depositAddress", ["depositAddress"])  // Ensure unique deposit addresses
    .index("by_isDeleted", ["isDeleted"]),

  // Account members - for future team/member access
  account_members: defineTable({
    accountId: v.id("accounts"),
    loginId: v.id("logins"),
    role: v.union(v.literal("owner"), v.literal("member")),
    permissions: v.optional(v.object({
      canStake: v.optional(v.boolean()),
      canWithdraw: v.optional(v.boolean()),
      canViewReports: v.optional(v.boolean()),
    })),
    invitedAt: v.optional(v.number()),
    joinedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_accountId", ["accountId"])
    .index("by_loginId", ["loginId"])
    .index("by_accountId_loginId", ["accountId", "loginId"]),

  // Keep users table for backward compatibility during migration
  users: defineTable({
    name: v.string(),
    email: v.string(),
    password: v.optional(v.string()),
    referralCode: v.string(),
    referrerId: v.optional(v.id("users")), // Direct Sponsor
    role: v.optional(v.string()), // "admin" or undefined for regular users

    // Binary Tree Fields
    parentId: v.optional(v.id("users")), // Upline in Binary Tree
    leftLegId: v.optional(v.id("users")),
    rightLegId: v.optional(v.id("users")),
    position: v.optional(v.union(v.literal("left"), v.literal("right"))),

    currentRank: v.string(), // "B0", "B1", ...
    teamVolume: v.number(), // USDT
    directReferralsCount: v.number(),
    walletBalance: v.number(),

    // Web3 Deposit Address (for receiving blockchain deposits)
    depositAddress: v.optional(v.string()),  // User's Ethereum address for deposits
    depositAddressLinkedAt: v.optional(v.number()),  // When address was linked

    // Security & Auth Fields (Convex Auth)
    emailVerified: v.optional(v.boolean()),  // Email verification status
    emailVerificationToken: v.optional(v.string()),  // Token for email verification
    emailVerificationExpiry: v.optional(v.number()),  // Token expiry timestamp
    passwordResetToken: v.optional(v.string()),  // Token for password reset
    passwordResetExpiry: v.optional(v.number()),  // Token expiry timestamp
    lastLoginAt: v.optional(v.number()),  // Last successful login
    lastLoginIp: v.optional(v.string()),  // IP address of last login
    loginAttempts: v.optional(v.number()),  // Failed login attempts counter
    lockedUntil: v.optional(v.number()),  // Account lock expiry (for brute force protection)
    twoFactorEnabled: v.optional(v.boolean()),  // 2FA enabled status
    twoFactorSecret: v.optional(v.string()),  // TOTP secret for 2FA (encrypted)
    twoFactorBackupCodes: v.optional(v.array(v.string())),  // Hashed backup codes
    twoFactorSetupAt: v.optional(v.number()),  // When 2FA was enabled
    twoFactorRequiredAt: v.optional(v.number()),  // When user was required to set up 2FA (for grace period tracking)

    // Unilevel Commission Tracking
    activeDirectReferrals: v.optional(v.number()),      // Count of directs with active stakes
    unlockedLevels: v.optional(v.number()),             // Calculated: activeDirectReferrals × 2 (max 10)
    lastUnlockUpdate: v.optional(v.number()),           // When unlock was last calculated

    // B-Rank Bonus Capping
    totalBRankBonusReceived: v.optional(v.number()),    // Total B-Rank bonuses received (lifetime)

    // BellCoin Stable (BLS) Balance
    blsBalance: v.optional(v.number()),                  // BLS balance (off-chain points)

    createdAt: v.number(),
  })
    .index("by_referralCode", ["referralCode"])
    .index("by_referrerId", ["referrerId"])
    .index("by_parentId", ["parentId"])
    .index("by_email", ["email"])
    .index("by_depositAddress", ["depositAddress"])  // Ensure unique deposit addresses
    .index("by_emailVerificationToken", ["emailVerificationToken"])  // For email verification
    .index("by_passwordResetToken", ["passwordResetToken"]),  // For password reset

  stakes: defineTable({
    accountId: v.optional(v.id("accounts")),  // Changed from userId - optional during migration
    amount: v.number(),
    cycleDays: v.number(),
    dailyRate: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(v.literal("active"), v.literal("completed")),
    lastYieldDate: v.optional(v.number()),
    // Keep userId for backward compatibility during migration
    userId: v.optional(v.id("users")),
  })
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_status", ["status"]),

  transactions: defineTable({
    accountId: v.optional(v.id("accounts")),  // Changed from userId - optional during migration
    amount: v.number(),
    type: v.union(
      v.literal("deposit"),
      v.literal("withdrawal"),
      v.literal("yield"),
      v.literal("commission_direct"),
      v.literal("commission_indirect"),
      v.literal("commission_vrank"),
      v.literal("commission_binary"),
      v.literal("commission_unilevel"),  // NEW: Unilevel commission
      v.literal("bls_earned"),          // BLS earned from rewards
      v.literal("bls_swap")              // BLS swapped to USDT
    ),
    referenceId: v.optional(v.string()),
    description: v.string(),
    timestamp: v.number(),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),

    // NEW: Commission metadata for tracking
    commissionLevel: v.optional(v.number()),         // L1-L10 for unilevel
    commissionRate: v.optional(v.number()),          // 0.01-0.03
    sourceStakeId: v.optional(v.id("stakes")),       // Which stake generated this
    sourceAccountId: v.optional(v.id("accounts")),   // Who generated the yield (changed from sourceUserId)
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    sourceUserId: v.optional(v.id("users")),
  })
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_type", ["type"]),

  withdrawals: defineTable({
    accountId: v.optional(v.id("accounts")),  // Changed from userId - optional during migration
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    amount: v.number(),
    fee: v.optional(v.number()),        // NEW: Withdrawal fee (5%)
    netAmount: v.optional(v.number()),  // NEW: Amount sent to user (amount - fee)
    address: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("executing"),      // NEW: Blockchain tx in progress
      v.literal("completed"),       // NEW: Funds sent successfully  
      v.literal("failed"),          // NEW: Blockchain tx failed
      v.literal("rejected"),
      v.literal("sent")  // Keeping for backward compatibility
    ),
    requestDate: v.number(),
    processedDate: v.optional(v.number()),
    adminId: v.optional(v.id("accounts")),  // Changed from users to accounts
    adminUserId: v.optional(v.id("users")),  // Keep for backward compatibility
    txHash: v.optional(v.string()),

    // NEW: Blockchain execution fields
    network: v.optional(v.string()),           // "polygon", "bsc", "arbitrum"
    transactionHash: v.optional(v.string()),   // Blockchain tx hash (new field name)
    executedAt: v.optional(v.number()),        // When funds were sent
    executionError: v.optional(v.string()),    // Error if tx failed
    retryAttempts: v.optional(v.number()),     // Number of retry attempts
    approvedBy: v.optional(v.string()),        // Admin wallet address who approved
    withdrawalSource: v.optional(v.union(      // Track source of withdrawal for audit
      v.literal("bls_swapped"),                // USDT from BLS swaps
      v.literal("direct_usdt")                 // Direct USDT (when BLS disabled)
    )),
  })
    .index("by_status", ["status"])
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_adminId", ["adminId"])
    .index("by_network", ["network"]),

  cron_logs: defineTable({
    jobName: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    message: v.string(),
    timestamp: v.number(),
    stakesProcessed: v.optional(v.number()),
    stakesExpired: v.optional(v.number()),
    totalYieldDistributed: v.optional(v.number()),
    totalCommissionsDistributed: v.optional(v.number()),
    executionTimeMs: v.optional(v.number()),
    details: v.optional(v.string()),
  }).index("by_timestamp", ["timestamp"]),

  notifications: defineTable({
    accountId: v.optional(v.id("accounts")),  // Changed from userId - optional during migration
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    type: v.union(
      v.literal("earnings"),
      v.literal("commission"),
      v.literal("referral"),
      v.literal("rank"),
      v.literal("stake"),
      v.literal("withdrawal"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()), // JSON metadata
    read: v.boolean(),
    createdAt: v.number(),
    icon: v.string(), // Icon identifier
  })
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_accountId_read", ["accountId", "read"])
    .index("by_userId_read", ["userId", "read"])  // Keep for migration
    .index("by_createdAt", ["createdAt"]),

  // Unilevel Commission History (for reporting)
  commission_history: defineTable({
    accountId: v.optional(v.id("accounts")),                    // Who earned the commission (changed from userId) - optional during migration
    sourceAccountId: v.optional(v.id("accounts")),              // Who generated the yield (changed from sourceUserId) - optional during migration
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    sourceUserId: v.optional(v.id("users")),
    sourceStakeId: v.id("stakes"),            // Which stake
    level: v.number(),                        // L1-L10
    rate: v.number(),                         // Commission rate applied
    yieldAmount: v.number(),                  // Source yield amount
    commissionAmount: v.number(),             // Commission earned
    timestamp: v.number(),                    // When earned
    date: v.string(),                         // "YYYY-MM-DD" for reporting
    week: v.string(),                         // "YYYY-WW" for weekly reports
    month: v.string(),                        // "YYYY-MM" for monthly reports
    year: v.number(),                         // Year for yearly reports
  })
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_sourceAccountId", ["sourceAccountId"])
    .index("by_sourceUserId", ["sourceUserId"])  // Keep for migration
    .index("by_date", ["date"])
    .index("by_week", ["week"])
    .index("by_month", ["month"])
    .index("by_year", ["year"])
    .index("by_accountId_date", ["accountId", "date"])
    .index("by_userId_date", ["userId", "date"])  // Keep for migration
    .index("by_accountId_month", ["accountId", "month"])
    .index("by_userId_month", ["userId", "month"]),  // Keep for migration

  configs: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  saved_wallets: defineTable({
    accountId: v.optional(v.id("accounts")),  // Changed from userId - optional during migration
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    address: v.string(),
    label: v.optional(v.string()),
    status: v.union(v.literal("locked"), v.literal("active")),
    createdAt: v.number(),
    unlockedAt: v.number(),
  })
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_accountId_status", ["accountId", "status"])
    .index("by_userId_status", ["userId", "status"]),  // Keep for migration

  // Blockchain sync state tracking
  blockchain_sync: defineTable({
    network: v.string(),  // e.g., "ethereum", "polygon", "bsc"
    contractAddress: v.string(),  // VaultUSDT contract address
    lastCheckedBlock: v.number(),  // Last block number checked for events
    lastSyncedAt: v.number(),  // Timestamp of last successful sync
    status: v.union(v.literal("syncing"), v.literal("idle"), v.literal("error")),
    errorMessage: v.optional(v.string()),
    eventsProcessed: v.optional(v.number()),  // Total events processed
  })
    .index("by_network", ["network"])
    .index("by_contractAddress", ["contractAddress"]),


  // Deposit transaction logs (for blockchain deposits)
  deposit_logs: defineTable({
    accountId: v.optional(v.id("accounts")),  // Changed from userId - optional during migration
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    txHash: v.string(),  // Blockchain transaction hash (unique)
    fromAddress: v.string(),  // Depositor's blockchain address
    toAddress: v.string(),  // Contract address (VaultUSDT)
    amount: v.number(),  // Amount in USDT (converted from Wei)
    amountRaw: v.string(),  // Raw amount in Wei (as string for precision)
    blockNumber: v.number(),  // Block number where deposit occurred
    timestamp: v.number(),  // When deposit was detected
    status: v.union(v.literal("pending"), v.literal("confirmed")),
    network: v.string(),  // Network name (e.g., "polygon", "bsc", "arbitrum")
    contractAddress: v.string(),  // Contract address for this network
  })
    .index("by_txHash", ["txHash"])  // Prevent duplicate processing
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_blockNumber", ["blockNumber"])
    .index("by_network", ["network"]),

  // Blockchain network configurations
  blockchain_networks: defineTable({
    network: v.string(),  // Network identifier (e.g., "polygon", "bsc", "arbitrum")
    name: v.string(),  // Display name (e.g., "Polygon", "BSC", "Arbitrum")
    chainId: v.number(),  // Chain ID
    contractAddress: v.string(),  // VaultForwarder contract address
    usdtAddress: v.string(),  // USDT token address on this network
    rpcUrl: v.string(),  // RPC endpoint
    isActive: v.boolean(),  // Is this network enabled?
    isPaused: v.boolean(),  // Are deposits paused?
    hotWalletBalance: v.optional(v.number()),  // Current hot wallet balance
    lastBalanceCheck: v.optional(v.number()),  // Last time balance was checked
    lowBalanceThreshold: v.number(),  // Alert threshold (default: 500)
    decimals: v.number(),  // USDT decimals on this network (6 or 18)
    blockExplorer: v.string(),  // Block explorer URL
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_network", ["network"])
    .index("by_isActive", ["isActive"])
    .index("by_contractAddress", ["contractAddress"]),

  // Admin alerts and notifications
  admin_alerts: defineTable({
    type: v.union(
      v.literal("low_balance"),
      v.literal("deposit_paused"),
      v.literal("withdrawal_failed"),
      v.literal("network_error"),
      v.literal("sync_error")
    ),
    network: v.optional(v.string()),  // Related network (if applicable)
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),  // Additional data (JSON)
    isRead: v.boolean(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  })
    .index("by_isRead", ["isRead"])
    .index("by_severity", ["severity"])
    .index("by_network", ["network"])
    .index("by_createdAt", ["createdAt"]),

  // Presale Node System Tables
  presaleConfig: defineTable({
    isActive: v.boolean(),              // Presale open/closed
    stakingOpen: v.boolean(),           // Public staking enabled
    totalNodes: v.number(),             // Total available nodes
    soldNodes: v.number(),              // Nodes sold so far
    pricePerNode: v.number(),           // $50 in USDT
    perUserLimit: v.number(),           // Max nodes per user
    startDate: v.number(),              // Presale start timestamp
    endDate: v.number(),                // Presale end timestamp
    vestingSchedule: v.object({
      immediate: v.number(),            // % unlocked immediately (e.g., 20)
      monthly: v.number(),              // % unlocked monthly (e.g., 80)
      months: v.number(),               // Vesting period (e.g., 4 months)
    }),
    stakingCycleDays: v.number(),       // Default stake duration
    stakingDailyRate: v.number(),       // Default daily yield %
  }),

  presaleOrders: defineTable({
    accountId: v.optional(v.id("accounts")),  // Changed from userId - optional during migration
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    quantity: v.number(),               // Number of nodes purchased
    totalAmount: v.number(),            // Total cost (quantity * $50)
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("converted"),
      v.literal("cancelled")
    ),
    paymentTxId: v.string(),            // Reference to transaction
    purchaseDate: v.number(),           // Order timestamp
    convertedDate: v.optional(v.number()), // When converted to stakes
    vestingSchedule: v.object({         // Copy of vesting rules at purchase
      immediate: v.number(),
      monthly: v.number(),
      months: v.number(),
    }),
    metadata: v.optional(v.object({
      ipAddress: v.optional(v.string()),
      userAgent: v.optional(v.string()),
    })),
  })
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_status", ["status"])
    .index("by_purchaseDate", ["purchaseDate"]),

  presaleStakes: defineTable({
    orderId: v.id("presaleOrders"),
    accountId: v.optional(v.id("accounts")),  // Changed from userId - optional during migration
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    nodeAmount: v.number(),             // Value of this vested portion
    unlockDate: v.number(),             // When this portion unlocks
    status: v.union(
      v.literal("locked"),
      v.literal("unlocked"),
      v.literal("claimed")
    ),
    claimedDate: v.optional(v.number()),
    stakeId: v.optional(v.id("stakes")), // Created stake after claim
  })
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_orderId", ["orderId"])
    .index("by_status", ["status"])
    .index("by_unlockDate", ["unlockDate"])
    .index("by_accountId_status", ["accountId", "status"])
    .index("by_userId_status", ["userId", "status"]),  // Keep for migration

  presaleAuditLog: defineTable({
    action: v.union(
      v.literal("purchase"),
      v.literal("payment"),
      v.literal("conversion"),
      v.literal("unlock"),
      v.literal("claim"),
      v.literal("admin_action")
    ),
    accountId: v.optional(v.id("accounts")),  // Changed from userId
    adminAccountId: v.optional(v.id("accounts")),  // Changed from adminId
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    adminId: v.optional(v.id("users")),
    orderId: v.optional(v.id("presaleOrders")),
    details: v.any(),                // Action-specific data
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
  })
    .index("by_action", ["action"])
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_timestamp", ["timestamp"]),

  // Convex Auth Tables
  authSessions: defineTable({
    loginId: v.id("logins"),  // Changed from userId to loginId
    currentAccountId: v.optional(v.id("accounts")),  // Currently active account
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    sessionToken: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_loginId", ["loginId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_sessionToken", ["sessionToken"]),

  authAccounts: defineTable({
    loginId: v.id("logins"),  // Changed from userId to loginId
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    provider: v.string(),  // "password", "google", etc.
    providerAccountId: v.string(),
    createdAt: v.number(),
  })
    .index("by_loginId", ["loginId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_provider_account", ["provider", "providerAccountId"]),

  // Security Audit Log
  security_audit_log: defineTable({
    loginId: v.optional(v.id("logins")),  // Changed from userId to loginId
    accountId: v.optional(v.id("accounts")),  // Optional account context
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),  // Optional for failed login attempts
    action: v.string(),  // "login", "logout", "password_change", "withdrawal", etc.
    status: v.union(v.literal("success"), v.literal("failed")),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.any()),  // Additional context (JSON)
    timestamp: v.number(),
  })
    .index("by_loginId", ["loginId"])
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"])
    .index("by_status", ["status"]),

  // Two-Factor Authentication Logs
  twoFactorLogs: defineTable({
    loginId: v.id("logins"),  // Changed from userId to loginId (2FA is per login, not per account)
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    action: v.union(
      v.literal("enabled"),
      v.literal("disabled"),
      v.literal("verified"),
      v.literal("failed"),
      v.literal("backup_used"),
      v.literal("backup_regenerated")
    ),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.any()),  // Additional context
  })
    .index("by_loginId", ["loginId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  // BellCoin Stable (BLS) Configuration
  blsConfig: defineTable({
    isEnabled: v.boolean(),              // Master toggle for BLS system
    conversionRate: v.number(),          // BLS to USDT rate (default 1.0)
    minSwapAmount: v.number(),           // Minimum swap amount
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // BLS Swap Requests
  blsSwapRequests: defineTable({
    accountId: v.optional(v.id("accounts")),  // Changed from userId - optional during migration
    // Keep for backward compatibility during migration
    userId: v.optional(v.id("users")),
    blsAmount: v.number(),               // Amount of BLS swapped
    usdtAmount: v.number(),              // Amount of USDT credited
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    timestamp: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_accountId", ["accountId"])
    .index("by_userId", ["userId"])  // Keep for migration
    .index("by_status", ["status"])
    .index("by_timestamp", ["timestamp"]),
});
