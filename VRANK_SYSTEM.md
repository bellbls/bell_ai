# V-Rank and Referral Bonus System Documentation

## Overview
This document explains the complete V-Rank and Referral Bonus system implementation for AnchorChain.

---

## 1. Referral Bonus System

### Bonus Structure
The referral bonus system has **2 levels**:

- **L1 (Direct Referral)**: 15% of the referral's stake daily yield
- **L2 (Indirect Referral)**: 10% of the referral's stake daily yield

### Example Calculation
If User A refers User B, and User B refers User C:

**User C stakes $1,000 for 30 days @ 0.6% daily**
- Daily Yield: $1,000 × 0.6% = $6

**User B (L1 to User C):**
- Receives: 15% of $6 = $0.90 daily

**User A (L2 to User C):**
- Receives: 10% of $6 = $0.60 daily

---

## 2. V-Rank System

### Rank Levels (V0 - V9)

| Rank | Min Team Volume | Min Direct Referrals | Structure Requirement | Commission Rate |
|------|----------------|---------------------|----------------------|-----------------|
| V0   | $0             | 0                   | None                 | 0%              |
| V1   | $3,000         | 5                   | None                 | 20%             |
| V2   | $10,000        | 5                   | 2 × V1               | 25%             |
| V3   | $30,000        | 5                   | 2 × V2               | 30%             |
| V4   | $100,000       | 5                   | 2 × V3               | 35%             |
| V5   | $300,000       | 5                   | 2 × V4               | 40%             |
| V6   | $1,000,000     | 5                   | 2 × V5               | 45%             |
| V7   | $3,000,000     | 5                   | 2 × V6               | 50%             |
| V8   | $10,000,000    | 5                   | 2 × V7               | 55%             |
| V9   | $30,000,000    | 5                   | 2 × V8               | 60%             |

### Rank Requirements Explained

#### Team Volume
- **Definition**: Accumulative stake amount from all downline referrals (direct and indirect)
- **Calculation**: Sum of all active stakes in your entire network
- **Dynamic**: Decreases when stakes expire

#### Direct Referrals
- **Definition**: Users you personally referred using your referral code
- **Minimum**: 5 direct referrals for all ranks V1-V9

#### Structure Requirement
- **Applies to**: V2 and above
- **Rule**: Must have at least 2 direct referrals who achieved the previous rank
- **Example**: 
  - To reach V2, you need 2 of your 5 direct referrals to be V1 or higher
  - To reach V3, you need 2 of your 5 direct referrals to be V2 or higher

---

## 3. V-Rank Bonus Calculation

### How It Works
V-Rank bonus is earned from your **direct referrals' daily yields** based on your current rank's commission rate.

### V1 Example (Detailed)

**Scenario:**
You have 5 direct referrals with the following stakes:

1. **Referral 1**: $600 for 30 days @ 0.6% daily = $3.60 daily
2. **Referral 2**: $600 for 90 days @ 0.75% daily = $4.50 daily
3. **Referral 3**: $600 for 90 days @ 0.75% daily = $4.50 daily
4. **Referral 4**: $600 for 7 days @ 0.45% daily = $2.70 daily
5. **Referral 5**: $600 for 7 days @ 0.45% daily = $2.70 daily

**Total Direct Referrals Daily Yield**: $18.00

**Your V1 Rank Bonus:**
- Commission Rate: 20%
- Daily Bonus: 20% × $18.00 = $3.60 daily

**Note:** The example in the requirements showed $10.8 total yield, but with the calculation above it's $18. The V1 bonus would be 20% of whatever the actual total is.

### V2 Example

**Scenario:**
- Team Volume: $15,000
- Direct Referrals: 6 (3 are V1, 2 are V0, 1 is V2)
- Structure: ✓ (Has 3 V1+ directs, needs only 2)

**Your Direct Referrals' Combined Daily Yield**: $50

**Your V2 Rank Bonus:**
- Commission Rate: 25%
- Daily Bonus: 25% × $50 = $12.50 daily

---

## 4. Total Daily Earnings Example

Let's say you're V2 with the following network:

### Your Direct Referrals (5 people)
- Combined daily yield: $50
- **V-Rank Bonus**: 25% × $50 = $12.50

### Your Indirect Referrals (L2)
- Person A (your direct) has 3 referrals
- Those 3 referrals have combined daily yield: $30
- **L2 Referral Bonus**: 10% × $30 = $3.00

### Your Direct Referrals' Stakes (L1)
- Your 5 directs earn $50 daily total
- **L1 Referral Bonus**: 15% × $50 = $7.50

### Total Daily Passive Income
- V-Rank Bonus: $12.50
- L1 Bonus: $7.50
- L2 Bonus: $3.00
- **Total**: $23.00 daily (without your own stakes)

---

## 5. Dynamic Rank System

### Automatic Upgrades
When you meet all requirements for a higher rank, you are **automatically upgraded** immediately.

### Automatic Downgrades
Your rank can **decrease immediately** if:

1. **Stakes Expire**: When your referrals' stakes expire, team volume decreases
2. **Volume Drops**: Team volume falls below the minimum requirement
3. **Structure Breaks**: Direct referrals get downgraded, breaking your structure requirement

### Example of Downgrade

**You are V2:**
- Team Volume: $10,500
- Direct Referrals: 5 (2 are V1, 3 are V0)

**What happens when a $1,000 stake expires:**
- New Team Volume: $9,500
- This is below V2 requirement ($10,000)
- **You are automatically downgraded to V1**

**What happens when one of your V1 directs loses their rank:**
- You now have only 1 V1 direct (need 2 for V2)
- **You are automatically downgraded to V1**

---

## 6. Staking Cycles

Available staking periods and their daily rates:

| Days | Daily Rate |
|------|-----------|
| 7    | 0.45%     |
| 30   | 0.60%     |
| 90   | 0.75%     |
| 360  | 1.00%     |

---

## 7. Transaction Types

The system tracks the following transaction types:

- `yield`: Daily yield from your own stakes
- `commission_direct`: L1 referral bonus (15%)
- `commission_indirect`: L2 referral bonus (10%)
- `commission_vrank`: V-Rank bonus (20%-60% based on rank)
- `deposit`: Stake creation
- `withdrawal`: Wallet withdrawal
- `commission_binary`: Reserved for future binary tree implementation

---

## 8. Implementation Details

### Files Modified

1. **`config.ts`**: Added V6-V9 rank rules with progressive requirements
2. **`schema.ts`**: Added new transaction types for tracking different bonuses
3. **`rewards.ts`**: Implemented separate functions for:
   - Referral bonuses (L1, L2)
   - V-Rank bonuses
   - Automatic stake expiration handling
4. **`ranks.ts`**: Enhanced dynamic rank update logic with:
   - Automatic upgrades
   - Automatic downgrades
   - Recursive rank checking up the tree

### Key Functions

#### `distributeReferralBonuses()`
- Distributes L1 (15%) and L2 (10%) bonuses
- Traverses up the referral tree
- Creates transactions for each level

#### `distributeVRankBonuses()`
- Calculates V-Rank bonus based on commission rate
- Only applies to direct referrer
- Only if referrer has V1+ rank

#### `updateTeamVolume()`
- Updates team volume for all uplines
- Handles both positive (stake created) and negative (stake expired) amounts
- Triggers rank updates after volume changes

#### `updateRank()`
- Checks all rank requirements
- Finds highest rank user qualifies for
- Handles both upgrades and downgrades
- Recursively updates upline ranks when structure changes

---

## 9. Future Enhancements

### Potential Improvements

1. **Active Referral Check**: Only count referrals with active stakes
2. **Binary Tree**: Implement binary tree structure for additional bonuses
3. **Rank History**: Track rank changes over time
4. **Performance Optimization**: Cache team volume calculations
5. **Rank Notifications**: Notify users of rank changes
6. **Leaderboard**: Show top earners by rank

---

## 10. Testing Scenarios

### Test Case 1: V1 Achievement
1. User A refers 5 users (B, C, D, E, F)
2. Each stakes $600
3. Total team volume: $3,000
4. **Expected**: User A achieves V1 rank

### Test Case 2: V2 Achievement
1. User A has 5 direct referrals
2. 2 of them achieve V1 rank
3. Team volume reaches $10,000
4. **Expected**: User A achieves V2 rank

### Test Case 3: Dynamic Downgrade
1. User A is V2
2. One of their V1 directs has a stake expire
3. That direct drops to V0
4. User A now has only 1 V1 direct
5. **Expected**: User A downgrades to V1

### Test Case 4: Bonus Distribution
1. User B (direct of User A) has $1,000 stake @ 0.6% daily
2. Daily yield: $6
3. **Expected Bonuses**:
   - User A (L1): $0.90 (15% of $6)
   - User A (V-Rank if V1): $1.20 (20% of $6)
   - User A's referrer (L2): $0.60 (10% of $6)

---

## Summary

The V-Rank and Referral Bonus system provides:

✅ **Dual Income Streams**: Referral bonuses (L1, L2) + V-Rank bonuses  
✅ **Progressive Ranks**: V0 to V9 with increasing benefits  
✅ **Dynamic Management**: Automatic upgrades and downgrades  
✅ **Fair Structure**: Requires building a strong team to advance  
✅ **Transparent Tracking**: All bonuses recorded as separate transactions  

This creates a sustainable and motivating reward system that encourages users to build and maintain active teams.
