# BLS Payout Report Fix Plan

## Problem Identified

The Comprehensive Stake Report shows USDT payouts even when the BLS system is enabled. This is a critical bug that causes incorrect financial reporting.

## Root Cause Analysis

### Bug 1: Incorrect Transaction Type When BLS is Enabled
**Location:** `app/convex/rewards.ts:86`

**Issue:** When BLS is enabled, the code calls `creditBLS` with `transactionType: "yield"`:
```typescript
await ctx.runMutation(internal.bls.creditBLS, {
    accountId: stake.accountId || undefined,
    userId: stake.userId || undefined,
    amount: dailyYield,
    description: `Daily yield for $${stake.amount} stake (${stake.cycleDays} days)`,
    referenceId: stake._id,
    transactionType: "yield",  // ❌ BUG: Should be "bls_earned" or omitted
});
```

**Impact:** The `creditBLS` function in `bls.ts` uses `args.transactionType || "bls_earned"`, but since `"yield"` is explicitly passed, it creates transactions with type `"yield"` instead of `"bls_earned"`. This causes the report to incorrectly classify BLS payouts as USDT payouts.

### Bug 2: Report Query Missing BLS Transactions (When userId not provided)
**Location:** `app/convex/reports/comprehensiveStakeReport.ts:42-47`

**Issue:** When querying all transactions (no userId filter), the code only queries for `"yield"` type transactions:
```typescript
yieldTransactions = await ctx.db
    .query("transactions")
    .withIndex("by_type", (q) => q.eq("type", "yield"))
    .order("desc")
    .collect();
```

**Impact:** BLS transactions (`"bls_earned"`) are only added later if `includeBLS` is true, but the initial query structure is inconsistent.

## Fix Plan

### Fix 1: Correct Transaction Type in Rewards Distribution
**File:** `app/convex/rewards.ts`
**Line:** ~86

**Change:** When BLS is enabled, either:
- Option A: Remove `transactionType` parameter (let it default to `"bls_earned"`)
- Option B: Explicitly set `transactionType: "bls_earned"`

**Recommended:** Option A (remove the parameter) since `creditBLS` already defaults to `"bls_earned"`.

### Fix 2: Improve Report Query Logic
**File:** `app/convex/reports/comprehensiveStakeReport.ts`
**Lines:** 42-58

**Change:** Ensure BLS transactions are always included when querying all transactions, not just when `includeBLS` is true. The logic should be consistent whether `userId` is provided or not.

### Fix 3: Add Account Support to Report Queries
**File:** `app/convex/reports/comprehensiveStakeReport.ts`

**Change:** Update queries to support both `accountId` and `userId` for multi-account compatibility, similar to other queries in the codebase.

## Implementation Steps

1. **Fix rewards.ts** - Remove or correct `transactionType` parameter when BLS is enabled
2. **Fix comprehensiveStakeReport.ts** - Ensure BLS transactions are always queried correctly
3. **Add accountId support** - Update report queries to support multi-account system
4. **Test** - Verify that:
   - When BLS is enabled, all new payouts create `"bls_earned"` transactions
   - Reports correctly show BLS vs USDT payouts
   - Historical data (old "yield" transactions) is still correctly identified as USDT

## Testing Checklist

- [ ] Enable BLS system in admin panel
- [ ] Run daily rewards distribution
- [ ] Verify new transactions have type `"bls_earned"` (not `"yield"`)
- [ ] Check Comprehensive Stake Report - should show BLS payouts, not USDT
- [ ] Verify old transactions (before BLS was enabled) still show as USDT
- [ ] Test with both accountId and userId
- [ ] Verify report summary totals (BLS vs USDT) are correct

## Notes

- Historical transactions with type `"yield"` created before BLS was enabled are correct and should remain as USDT
- Only new transactions created after BLS is enabled should be affected
- The report logic correctly identifies `"bls_earned"` vs `"yield"` based on transaction type, so fixing the transaction creation will automatically fix the report

