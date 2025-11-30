# Deposit Function Reference Guide

Complete reference for all deposit-related functions in the system, including parameters, return values, dependencies, and usage examples.

---

## Table of Contents

1. [Manual Deposit Functions](#manual-deposit-functions)
2. [Blockchain Deposit Functions](#blockchain-deposit-functions)
3. [Deposit Listener Functions](#deposit-listener-functions)
4. [Helper/Utility Functions](#helper-utility-functions)
5. [Smart Contract Functions](#smart-contract-functions)

---

## Manual Deposit Functions

### `wallet.deposit`

**Location**: `app/convex/wallet.ts`

**Type**: Mutation

**Description**: Directly credits a user's wallet balance. Used for admin credits, testing, or manual adjustments. Does not interact with blockchain.

**Signature**:
```typescript
export const deposit = mutation({
    args: {
        userId: v.id("users"),
        amount: v.number(),
        txHash: v.optional(v.string()),
        method: v.optional(v.string()),
    },
    handler: async (ctx, args) => { ... }
});
```

**Parameters**:
- `userId` (required): Convex ID of the user to credit
- `amount` (required): Deposit amount in USD. Must be > 0
- `txHash` (optional): Transaction hash for reference/audit trail
- `method` (optional): Payment method (e.g., "crypto", "bank_transfer", "card")

**Returns**:
```typescript
{
    success: true,
    newBalance: number,  // Updated wallet balance
    message: string      // Success message
}
```

**Throws**:
- `VALIDATION_ERROR`: If amount <= 0
- `USER_NOT_FOUND`: If userId doesn't exist

**Dependencies**:
- `errors.isValidAmount()`: Validates amount
- `errors.createError()`: Creates error responses
- `errors.ErrorCodes`: Error code constants

**Database Updates**:
- `users.walletBalance`: Incremented by amount
- `transactions`: New record created

**Example Usage**:
```typescript
const result = await deposit({
    userId: "j1234567890abcdef",
    amount: 100.00,
    method: "manual",
    txHash: "0xabc123..."
});
// Returns: { success: true, newBalance: 150.00, message: "Successfully deposited $100.00" }
```

---

## Blockchain Deposit Functions

### Frontend Hook: `useDepositContract`

**Location**: `app/hooks/useDepositContract.ts`

**Type**: React Hook

**Description**: Provides functions and state for interacting with the deposit smart contract from the frontend.

**Signature**:
```typescript
export function useDepositContract(
    provider: BrowserProvider | null,
    signer: JsonRpcSigner | null,
    network: string | null
): DepositContractReturn
```

**Parameters**:
- `provider`: Ethers BrowserProvider instance (from wallet connection)
- `signer`: Ethers JsonRpcSigner instance (for signing transactions)
- `network`: Network identifier ("polygon" | "bsc" | "arbitrum")

**Returns**:
```typescript
{
    checkBalance: (userAddress: string) => Promise<string>,
    checkAllowance: (userAddress: string) => Promise<string>,
    approveUSDT: (amount: string) => Promise<string>,
    deposit: (amount: string) => Promise<string>,
    needsApproval: (userAddress: string, amount: string) => Promise<boolean>,
    isApproving: boolean,
    isDepositing: boolean,
    error: string | null,
    networkConfig: NetworkContractConfig | null,
}
```

**Dependencies**:
- `ethers`: For blockchain interaction
- `NETWORK_CONTRACTS`: Network configuration mapping

---

### `checkBalance`

**Location**: `app/hooks/useDepositContract.ts`

**Type**: Function (returned by hook)

**Description**: Checks user's USDT balance on the current network.

**Signature**:
```typescript
const checkBalance = async (userAddress: string): Promise<string>
```

**Parameters**:
- `userAddress`: Ethereum address to check balance for

**Returns**: 
- `Promise<string>`: Balance as decimal string (e.g., "100.5")

**Throws**:
- `Error("Unsupported network")`: If network not configured

**Example Usage**:
```typescript
const balance = await checkBalance("0x1234...");
console.log(balance); // "100.50"
```

---

### `checkAllowance`

**Location**: `app/hooks/useDepositContract.ts`

**Type**: Function (returned by hook)

**Description**: Checks how much USDT the vault contract is approved to spend.

**Signature**:
```typescript
const checkAllowance = async (userAddress: string): Promise<string>
```

**Parameters**:
- `userAddress`: Ethereum address to check allowance for

**Returns**:
- `Promise<string>`: Allowance as decimal string

**Example Usage**:
```typescript
const allowance = await checkAllowance("0x1234...");
console.log(allowance); // "50.00"
```

---

### `approveUSDT`

**Location**: `app/hooks/useDepositContract.ts`

**Type**: Function (returned by hook)

**Description**: Approves the vault contract to spend user's USDT.

**Signature**:
```typescript
const approveUSDT = async (amount: string): Promise<string>
```

**Parameters**:
- `amount`: Amount to approve as decimal string (e.g., "100.5")

**Returns**:
- `Promise<string>`: Transaction hash of approval transaction

**State Updates**:
- Sets `isApproving` to `true` during transaction
- Sets `error` if transaction fails

**Throws**:
- `Error("Wallet not connected")`: If signer not available
- `Error("Unsupported network")`: If network not configured
- Transaction errors from blockchain

**Example Usage**:
```typescript
try {
    const txHash = await approveUSDT("100.00");
    console.log("Approved:", txHash);
} catch (error) {
    console.error("Approval failed:", error);
}
```

---

### `deposit`

**Location**: `app/hooks/useDepositContract.ts`

**Type**: Function (returned by hook)

**Description**: Executes deposit transaction on the smart contract.

**Signature**:
```typescript
const deposit = async (amount: string): Promise<string>
```

**Parameters**:
- `amount`: Deposit amount as decimal string (e.g., "100.5")

**Returns**:
- `Promise<string>`: Transaction hash of deposit transaction

**Validation Steps**:
1. Checks wallet is connected
2. Validates network is supported
3. Checks contract is not paused
4. Validates amount conversion (round-trip check)
5. Executes deposit transaction

**State Updates**:
- Sets `isDepositing` to `true` during transaction
- Sets `error` if transaction fails

**Throws**:
- `Error("Wallet not connected")`: If signer not available
- `Error("Unsupported network")`: If network not configured
- `Error("Deposits are currently paused")`: If contract paused
- `Error("Invalid deposit amount")`: If amount invalid
- `Error("Amount precision error")`: If conversion fails
- Transaction errors from blockchain

**Example Usage**:
```typescript
try {
    const txHash = await deposit("100.00");
    console.log("Deposit transaction:", txHash);
    // Wait for listener to process...
} catch (error) {
    console.error("Deposit failed:", error);
}
```

---

### `needsApproval`

**Location**: `app/hooks/useDepositContract.ts`

**Type**: Function (returned by hook)

**Description**: Checks if approval is needed before depositing.

**Signature**:
```typescript
const needsApproval = async (
    userAddress: string,
    amount: string
): Promise<boolean>
```

**Parameters**:
- `userAddress`: Ethereum address to check
- `amount`: Deposit amount to check

**Returns**:
- `Promise<boolean>`: `true` if approval needed, `false` otherwise

**Example Usage**:
```typescript
const needApproval = await needsApproval("0x1234...", "100.00");
if (needApproval) {
    await approveUSDT("100.00");
}
```

---

## Deposit Listener Functions

### `multiNetworkDepositListener.checkForDeposits`

**Location**: `app/convex/multiNetworkDepositListener.ts`

**Type**: Internal Action

**Description**: Main entry point for deposit listener. Checks all active networks for new deposits.

**Signature**:
```typescript
export const checkForDeposits = internalAction({
    args: {},
    handler: async (ctx) => { ... }
});
```

**Parameters**: None (reads from database)

**Returns**:
```typescript
{
    success: boolean,
    eventsProcessed: number,
    networksChecked: number,
    errors?: string[],
    executionTimeMs: number,
}
```

**Dependencies**:
- `networkManagement.getActiveNetworks`: Gets active network configurations
- `checkNetworkDeposits`: Processes each network
- `blockchainSync.logCronExecution`: Logs execution

**Invoked By**: Cron job (every 60 seconds)

**Example Usage**:
```typescript
// Called automatically by cron
// Can also be manually triggered from Convex Dashboard
```

---

### `checkNetworkDeposits` (Internal)

**Location**: `app/convex/multiNetworkDepositListener.ts`

**Type**: Internal Function

**Description**: Checks a single network for new deposit events.

**Signature**:
```typescript
async function checkNetworkDeposits(
    ctx: any,
    network: any
): Promise<number>
```

**Parameters**:
- `ctx`: Convex action context
- `network`: Network configuration object

**Returns**:
- `Promise<number>`: Number of events processed

**Steps**:
1. Get sync state for network
2. Determine block range to query
3. Query blockchain for DepositMade events
4. Process each event
5. Update sync state

---

### `processDepositEvent` (Internal)

**Location**: `app/convex/multiNetworkDepositListener.ts`

**Type**: Internal Function

**Description**: Processes a single DepositMade event.

**Signature**:
```typescript
async function processDepositEvent(
    ctx: any,
    event: any,
    network: any
): Promise<void>
```

**Parameters**:
- `ctx`: Convex action context
- `event`: DepositMade event from blockchain
- `network`: Network configuration

**Steps**:
1. Extract event data (user, amount, txHash)
2. Check for duplicate (by txHash)
3. Find user by deposit address
4. Convert amount from wei to decimal
5. Call `blockchainSync.logDeposit` to credit user

**Dependencies**:
- `blockchainSync.getDepositByTxHash`: Duplicate check
- `depositAddress.getUserByDepositAddress`: User lookup
- `blockchainSync.logDeposit`: Credit user

---

### `blockchainSync.logDeposit`

**Location**: `app/convex/blockchainSync.ts`

**Type**: Internal Mutation

**Description**: Logs a detected deposit and credits user balance.

**Signature**:
```typescript
export const logDeposit = mutation({
    args: {
        userId: v.id("users") | null,
        txHash: v.string(),
        fromAddress: v.string(),
        toAddress: v.string(),
        amount: v.number(),
        amountRaw: v.string(),
        blockNumber: v.number(),
        network: v.string(),
        contractAddress: v.string(),
    },
    handler: async (ctx, args) => { ... }
});
```

**Parameters**:
- `userId`: User ID (null if unlinked deposit)
- `txHash`: Blockchain transaction hash (unique identifier)
- `fromAddress`: User's wallet address
- `toAddress`: Contract address
- `amount`: Deposit amount in decimal
- `amountRaw`: Deposit amount in wei (string)
- `blockNumber`: Block number of deposit
- `network`: Network identifier
- `contractAddress`: Contract address

**Returns**:
```typescript
{
    success: boolean,
    duplicate: boolean,
    depositId?: Id<"deposit_logs">,
    message: string,
}
```

**Duplicate Detection**: 
- Checks `deposit_logs` table by `txHash`
- Returns `{ success: false, duplicate: true }` if duplicate

**Database Updates**:
1. Inserts into `deposit_logs`
2. Updates `users.walletBalance` (if userId provided)
3. Inserts into `transactions`
4. Inserts into `notifications`

**Called By**: `processDepositEvent` in deposit listener

**Example Usage**:
```typescript
const result = await ctx.runMutation(internal.blockchainSync.logDeposit, {
    userId: "j123...",
    txHash: "0xabc123...",
    fromAddress: "0xuser...",
    toAddress: "0xcontract...",
    amount: 100.0,
    amountRaw: "100000000",
    blockNumber: 12345,
    network: "polygon",
    contractAddress: "0xcontract...",
});
```

---

## Helper/Utility Functions

### `blockchainSync.getDepositByTxHash`

**Location**: `app/convex/blockchainSync.ts`

**Type**: Query

**Description**: Retrieves a deposit log by transaction hash.

**Signature**:
```typescript
export const getDepositByTxHash = query({
    args: { txHash: v.string() },
    handler: async (ctx, args) => { ... }
});
```

**Parameters**:
- `txHash`: Transaction hash to search for

**Returns**:
- Deposit log object or `null` if not found

**Used For**: Duplicate detection

---

### `depositAddress.getUserByDepositAddress`

**Location**: `app/convex/depositAddress.ts`

**Type**: Query

**Description**: Finds user by linked deposit address.

**Signature**:
```typescript
export const getUserByDepositAddress = query({
    args: { address: v.string() },
    handler: async (ctx, args) => { ... }
});
```

**Parameters**:
- `address`: Ethereum address (case-insensitive search)

**Returns**:
- User object or `null` if not found

**Used For**: Linking deposits to users

---

### `depositAddress.setDepositAddress`

**Location**: `app/convex/depositAddress.ts`

**Type**: Mutation

**Description**: Links a deposit address to a user account.

**Signature**:
```typescript
export const setDepositAddress = mutation({
    args: {
        userId: v.id("users">,
        address: v.string(),
    },
    handler: async (ctx, args) => { ... }
});
```

**Parameters**:
- `userId`: User to link address to
- `address`: Ethereum address to link

**Validation**:
- Address format validation
- Uniqueness check (address can't be linked to another user)

**Returns**:
```typescript
{
    success: boolean,
    address: string,  // Normalized (lowercase)
    message: string,
}
```

---

### `errors.isValidAmount`

**Location**: `app/convex/errors.ts`

**Type**: Function

**Description**: Validates that an amount is a valid positive number.

**Signature**:
```typescript
export function isValidAmount(amount: number, min: number = 0): boolean
```

**Parameters**:
- `amount`: Number to validate
- `min`: Minimum value (default: 0)

**Returns**:
- `true` if valid, `false` otherwise

**Validation**:
- Checks type is number
- Checks not NaN
- Checks amount > min

---

### `errors.createError`

**Location**: `app/convex/errors.ts`

**Type**: Function

**Description**: Creates a standardized error response.

**Signature**:
```typescript
export function createError(
    code: string,
    customMessage?: string
): ConvexError<string>
```

**Parameters**:
- `code`: Error code from `ErrorCodes`
- `customMessage`: Optional custom message

**Returns**: ConvexError instance with user-friendly message

---

## Smart Contract Functions

### `VaultForwarder.deposit`

**Location**: `contracts/contracts/VaultForwarder.sol`

**Type**: External Function

**Description**: Receives USDT deposit from user and splits funds.

**Signature**:
```solidity
function deposit(uint256 amount) external whenNotPaused nonReentrant
```

**Parameters**:
- `amount`: Amount of USDT in smallest unit (wei)

**Requirements**:
- Contract must not be paused
- Amount must be > 0
- User must have approved contract to spend USDT
- User must have sufficient USDT balance

**Actions**:
1. Transfers USDT from user to contract
2. Calculates split: 2.5% hot wallet, 97.5% cold wallet
3. Forwards 97.5% to cold wallet
4. Keeps 2.5% in contract (hot wallet)
5. Checks low balance threshold
6. Emits `DepositMade` event

**Events Emitted**:
```solidity
event DepositMade(
    address indexed user,
    uint256 amount,
    uint256 toHotWallet,
    uint256 toColdWallet
);
```

**Security**:
- `nonReentrant`: Prevents reentrancy attacks
- `whenNotPaused`: Allows pausing deposits

---

### `VaultForwarder.pauseDeposits`

**Location**: `contracts/contracts/VaultForwarder.sol`

**Type**: External Function (Owner Only)

**Description**: Pauses all deposits (emergency function).

**Signature**:
```solidity
function pauseDeposits() external onlyOwner
```

**Effect**: All future `deposit()` calls will revert

---

### `VaultForwarder.resumeDeposits`

**Location**: `contracts/contracts/VaultForwarder.sol`

**Type**: External Function (Owner Only)

**Description**: Resumes deposits after pause.

**Signature**:
```solidity
function resumeDeposits() external onlyOwner
```

**Effect**: Allows `deposit()` calls again

---

## Function Dependencies Graph

```
checkForDeposits (cron entry point)
  ├── networkManagement.getActiveNetworks
  └── checkNetworkDeposits (for each network)
      ├── blockchainSync.getSyncState
      ├── blockchainSync.updateSyncState
      └── processDepositEvent (for each event)
          ├── blockchainSync.getDepositByTxHash
          ├── depositAddress.getUserByDepositAddress
          └── blockchainSync.logDeposit
              ├── users table (update balance)
              ├── deposit_logs table (insert)
              ├── transactions table (insert)
              └── notifications table (insert)

wallet.deposit (manual entry point)
  ├── errors.isValidAmount
  ├── errors.createError
  ├── users table (get)
  ├── users table (update balance)
  └── transactions table (insert)

useDepositContract (frontend hook)
  ├── NETWORK_CONTRACTS (config)
  └── Provides functions:
      ├── checkBalance
      ├── checkAllowance
      ├── approveUSDT
      ├── deposit
      └── needsApproval
```

---

## Error Code Reference

All deposit functions use centralized error codes from `app/convex/errors.ts`:

- `VALIDATION_ERROR`: General validation failure
- `USER_NOT_FOUND`: User doesn't exist
- `INSUFFICIENT_BALANCE`: Not enough funds (for withdrawals)
- `INVALID_AMOUNT`: Invalid deposit/withdrawal amount

---

## Usage Patterns

### Pattern 1: Manual Admin Deposit

```typescript
// Admin credits user directly
const result = await deposit({
    userId: user._id,
    amount: 100.00,
    method: "admin_credit",
});
```

### Pattern 2: User Blockchain Deposit

```typescript
// 1. User connects wallet (frontend)
const { deposit, approveUSDT, needsApproval } = useDepositContract(provider, signer, network);

// 2. Check if approval needed
if (await needsApproval(userAddress, amount)) {
    await approveUSDT(amount);
}

// 3. Execute deposit
const txHash = await deposit(amount);

// 4. Wait for listener to process (automatic)
// User balance updated within 60 seconds
```

### Pattern 3: Automatic Detection

```typescript
// Automatic (cron job)
// 1. Cron triggers checkForDeposits every 60 seconds
// 2. Listener queries blockchain for events
// 3. Processes each event:
//    - Check duplicate
//    - Find user
//    - Credit balance
//    - Create transaction & notification
```

---

**End of Function Reference**
