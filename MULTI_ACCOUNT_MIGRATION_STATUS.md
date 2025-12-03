# Multi-Account Migration Status

## Overview
This document tracks the migration from `userId` (users table) to `accountId` (accounts table) for the multi-account system.

## ✅ Completed Migrations

### Backend Queries (Updated to accept both `accountId` and `userId`)
1. ✅ `users:getProfile` - Accepts both `accountId` and `userId`
2. ✅ `users:getDirectReferrals` - Accepts both `accountId` and `userId`
3. ✅ `users:getIndirectReferrals` - Accepts both `accountId` and `userId`
4. ✅ `users:getUnilevelTree` - Accepts both `accountId` and `userId`
5. ✅ `users:getUserEarnings` - Accepts both `accountId` and `userId`
6. ✅ `stakes:getUserStakes` - Accepts both `accountId` and `userId`
7. ✅ `wallet:getTransactionHistory` - Accepts both `accountId` and `userId`
8. ✅ `bls:getBLSBalance` - Accepts both `accountId` and `userId`
9. ✅ `presale:getUserOrders` - Accepts both `accountId` and `userId`
10. ✅ `addressBook:getAddresses` - Accepts both `accountId` and `userId`
11. ✅ `addressBook:addAddress` - Accepts both `accountId` and `userId`
12. ✅ `addressBook:deleteAddress` - Accepts both `accountId` and `userId`
13. ✅ `bls:getSwapHistory` - Accepts both `accountId` and `userId`
14. ✅ `bls:swapBLSToUSDT` - Accepts both `accountId` and `userId`
15. ✅ `wallet:getSwappedUSDTBalance` - Accepts both `accountId` and `userId`

### Frontend Updates (Updated to pass `accountId`)
1. ✅ `app/app/page.tsx` - All queries updated to use `activeAccountId` with `accountId` parameter
2. ✅ `app/components/PresaleView.tsx` - Updated to pass `accountId`
3. ✅ `app/components/WithdrawModal.tsx` - Updated to pass `accountId`
4. ✅ `app/components/AddressBook.tsx` - Updated to pass `accountId`
5. ✅ `app/components/SwapToCrypto.tsx` - Updated to pass `accountId`

## ⚠️ Important Notes

### Pattern for Backend Queries
When updating queries to support multi-account, use this pattern:

```typescript
export const myQuery = query({
    args: { 
        accountId: v.optional(v.id("accounts")),
        userId: v.optional(v.id("users")),  // Legacy support
    },
    handler: async (ctx, args) => {
        if (args.accountId) {
            // Query using accountId
            return await ctx.db
                .query("table_name")
                .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
                .collect();
        } else if (args.userId) {
            // Legacy: query using userId
            return await ctx.db
                .query("table_name")
                .withIndex("by_userId", (q) => q.eq("userId", args.userId))
                .collect();
        }
        return [];
    },
});
```

### Pattern for Frontend Calls
Always pass `accountId` (not `userId`) when calling queries:

```typescript
// ✅ CORRECT
const data = useCachedQuery(api.module.query, activeAccountId ? { accountId: activeAccountId as any } : "skip");

// ❌ WRONG
const data = useCachedQuery(api.module.query, activeAccountId ? { userId: activeAccountId as any } : "skip");
```

## 🔍 How to Prevent This Error

### Before Adding New Queries
1. **Always accept both `accountId` and `userId`** as optional parameters
2. **Query by `accountId` first**, then fallback to `userId` for legacy support
3. **Use the correct index** (`by_accountId` for accounts, `by_userId` for users)

### Before Calling Queries from Frontend
1. **Always use `accountId` parameter** (not `userId`)
2. **Get `activeAccountId` from `useAccount()` hook** or `AccountContext`
3. **Use `activeAccountId || accountId || userId`** as fallback chain

### Testing Checklist
- [ ] Query accepts `accountId` as optional parameter
- [ ] Query accepts `userId` as optional parameter (for legacy)
- [ ] Frontend passes `accountId` (not `userId`)
- [ ] Query works with both `accountId` and `userId`
- [ ] Query returns empty array/null when neither is provided

## 🐛 Common Errors

### Error: "Found ID from table `accounts`, which does not match the table name in validator `v.id("users")`"
**Cause:** Frontend is passing an `accountId` but the query expects `userId` as required.

**Fix:**
1. Update query to accept both `accountId` and `userId` as optional
2. Update frontend to pass `accountId` instead of `userId`

### Error: "Object is missing the required field `userId`"
**Cause:** Query still has `userId` as required (not optional).

**Fix:**
1. Change `userId: v.id("users")` to `userId: v.optional(v.id("users"))`
2. Add `accountId: v.optional(v.id("accounts"))`
3. Update handler to check for `accountId` first

## 📝 Remaining Work

### Mutations That May Need Updates
- `wallet:requestWithdrawal` - Currently accepts `userId`, but called via `walletActions:requestWithdrawalWith2FA` which should handle conversion
- `wallet:deposit` - May need to accept `accountId`
- Other mutations that directly use `userId` - Review on case-by-case basis

### Components to Review
- `app/components/SwapToCrypto.tsx` - Check if it uses `userId`
- `app/components/NotificationBell.tsx` - Check if it uses `userId`
- `app/components/BRankCapCard.tsx` - Check if it uses `userId`
- `app/components/UnilevelTreeViewer.tsx` - Check if it uses `userId`

## 🔄 Migration Strategy

1. **Backend First:** Update queries to accept both `accountId` and `userId`
2. **Frontend Second:** Update frontend calls to pass `accountId`
3. **Test:** Verify both `accountId` and `userId` paths work
4. **Document:** Update this file with completed migrations

