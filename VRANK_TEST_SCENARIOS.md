# V-Rank System Test Scenarios

This file contains detailed test scenarios to validate the V-Rank and Referral Bonus system implementation.

---

## Test Scenario 1: Basic V1 Achievement

### Setup
1. User A registers (V0 rank, $0 team volume)
2. User A refers 5 users (B, C, D, E, F)
3. Each referred user stakes $600

### Stakes Details
| User | Amount | Period | Daily Rate | Daily Yield |
|------|--------|--------|-----------|-------------|
| B    | $600   | 30d    | 0.6%      | $3.60       |
| C    | $600   | 90d    | 0.75%     | $4.50       |
| D    | $600   | 90d    | 0.75%     | $4.50       |
| E    | $600   | 7d     | 0.45%     | $2.70       |
| F    | $600   | 7d     | 0.45%     | $2.70       |

### Expected Results After All Stakes Created

**User A Status:**
- Current Rank: V1 ✅
- Team Volume: $3,000 ✅
- Direct Referrals: 5 ✅
- Structure: N/A (V1 has no structure requirement)

**Daily Rewards Distribution (First Day):**

User B's $3.60 yield:
- User B receives: $3.60 (own yield)
- User A receives: $0.54 (15% L1 bonus) + $0.72 (20% V1 bonus) = $1.26

User C's $4.50 yield:
- User C receives: $4.50 (own yield)
- User A receives: $0.675 (15% L1 bonus) + $0.90 (20% V1 bonus) = $1.575

User D's $4.50 yield:
- User D receives: $4.50 (own yield)
- User A receives: $0.675 (15% L1 bonus) + $0.90 (20% V1 bonus) = $1.575

User E's $2.70 yield:
- User E receives: $2.70 (own yield)
- User A receives: $0.405 (15% L1 bonus) + $0.54 (20% V1 bonus) = $0.945

User F's $2.70 yield:
- User F receives: $2.70 (own yield)
- User A receives: $0.405 (15% L1 bonus) + $0.54 (20% V1 bonus) = $0.945

**User A Total Daily Income:**
- L1 Bonuses: $2.70 (15% of $18.00)
- V1 Bonuses: $3.60 (20% of $18.00)
- **Total: $6.30/day**

### Transactions Created for User A
```
Type: commission_direct, Amount: $2.70, Description: "L1 Referral Bonus from [directs]"
Type: commission_vrank, Amount: $3.60, Description: "V1 Rank Bonus from [directs]"
```

---

## Test Scenario 2: V2 Achievement with Structure

### Setup
1. User A is V1 (from Scenario 1)
2. Users B and C each refer 5 users and achieve V1 rank
3. Additional stakes bring User A's team volume to $10,000

### User A's Direct Referrals Status
| User | Rank | Team Volume | Direct Referrals |
|------|------|-------------|------------------|
| B    | V1   | $3,000      | 5                |
| C    | V1   | $3,000      | 5                |
| D    | V0   | $0          | 0                |
| E    | V0   | $0          | 0                |
| F    | V0   | $0          | 0                |

### Expected Results

**User A Status:**
- Current Rank: V2 ✅
- Team Volume: $10,000+ ✅
- Direct Referrals: 5 ✅
- Structure: 2 × V1 (B and C) ✅

**User A's New Daily Income:**
- L1 Bonuses: 15% of directs' yields
- L2 Bonuses: 10% of indirects' yields (B's and C's referrals)
- V2 Bonus: 25% of directs' yields (increased from 20%)

**Example Daily Calculation:**
- Direct referrals (B,C,D,E,F) total yield: $50/day
- Indirect referrals (B's 5 + C's 5) total yield: $36/day

User A receives:
- L1: 15% × $50 = $7.50
- L2: 10% × $36 = $3.60
- V2: 25% × $50 = $12.50
- **Total: $23.60/day**

---

## Test Scenario 3: Dynamic Downgrade - Stake Expiration

### Setup
1. User A is V2 with $10,500 team volume
2. A $1,000 stake from User B's network expires

### Before Expiration
- User A Rank: V2
- Team Volume: $10,500
- Meets all V2 requirements ✅

### After Expiration
- User A Rank: V1 (auto-downgraded)
- Team Volume: $9,500
- Does NOT meet V2 volume requirement ($10,000) ❌

### Expected Behavior
1. Stake status changes to "completed"
2. `updateTeamVolume()` called with -$1,000
3. User A's team volume: $10,500 → $9,500
4. `updateRank()` called for User A
5. User A fails V2 volume check
6. User A rank: V2 → V1
7. User A's referrer's rank is also checked (recursive)

### Impact on Earnings
- V2 Bonus (25%) → V1 Bonus (20%)
- If directs earn $50/day: $12.50/day → $10.00/day
- Loss: $2.50/day in V-Rank bonus

---

## Test Scenario 4: Dynamic Downgrade - Structure Break

### Setup
1. User A is V2
2. User B (one of A's V1 directs) has a major stake expire
3. User B's team volume drops below V1 requirement
4. User B downgrades from V1 to V0

### Before B's Downgrade
**User A:**
- Rank: V2
- Direct V1s: 2 (B and C)
- Structure: ✅

### After B's Downgrade
**User A:**
- Rank: V1 (auto-downgraded)
- Direct V1s: 1 (only C)
- Structure: ❌ (needs 2 × V1 for V2)

### Expected Behavior
1. User B's stake expires
2. User B's team volume decreases
3. `updateRank()` called for User B
4. User B: V1 → V0
5. `updateRank()` called for User A (recursive)
6. User A fails V2 structure check (only 1 × V1)
7. User A: V2 → V1

### Cascade Effect
If User A's referrer was V3 (needing 2 × V2), they would also be checked and potentially downgraded.

---

## Test Scenario 5: Multi-Level Referral Bonuses

### Network Structure
```
User A (You)
├─> User B (L1)
│   ├─> User G (L2)
│   ├─> User H (L2)
│   └─> User I (L2)
├─> User C (L1)
│   ├─> User J (L2)
│   └─> User K (L2)
└─> User D (L1)
```

### Stakes
- User B stakes: $1,000 @ 0.6% = $6/day
- User G stakes: $1,000 @ 0.6% = $6/day
- User H stakes: $1,000 @ 0.6% = $6/day

### Daily Rewards Distribution

**When User B's yield is distributed ($6):**
- User B: $6.00 (own yield)
- User A: $0.90 (15% L1 bonus)
- User A: $1.20 (20% V1 bonus, assuming A is V1)

**When User G's yield is distributed ($6):**
- User G: $6.00 (own yield)
- User B: $0.90 (15% L1 bonus)
- User B: $1.20 (20% V1 bonus, if B is V1)
- User A: $0.60 (10% L2 bonus)

**When User H's yield is distributed ($6):**
- User H: $6.00 (own yield)
- User B: $0.90 (15% L1 bonus)
- User B: $1.20 (20% V1 bonus, if B is V1)
- User A: $0.60 (10% L2 bonus)

### User A's Total Daily Income
- From B (L1): $0.90 + $1.20 = $2.10
- From G (L2): $0.60
- From H (L2): $0.60
- **Total: $3.30/day** (from these 3 stakes only)

### User B's Total Daily Income
- Own stake: $6.00
- From G (L1): $0.90 + $1.20 = $2.10
- From H (L1): $0.90 + $1.20 = $2.10
- **Total: $10.20/day**

---

## Test Scenario 6: Rank Progression Path

### User Journey: V0 → V9

**Month 1: Achieve V1**
- Refer 5 users
- Each stakes $600
- Team Volume: $3,000
- Rank: V0 → V1
- Daily Income: ~$6/day

**Month 3: Achieve V2**
- Help 2 directs reach V1
- Team grows to $10,000
- Rank: V1 → V2
- Daily Income: ~$25/day

**Month 6: Achieve V3**
- Help 2 directs reach V2
- Team grows to $30,000
- Rank: V2 → V3
- Daily Income: ~$80/day

**Month 12: Achieve V4**
- Help 2 directs reach V3
- Team grows to $100,000
- Rank: V3 → V4
- Daily Income: ~$300/day

**Year 2: Achieve V5**
- Help 2 directs reach V4
- Team grows to $300,000
- Rank: V4 → V5
- Daily Income: ~$1,000/day

**Year 3+: V6-V9**
- Continue building and supporting team
- Exponential growth potential
- V9 Daily Income: $5,000+/day

---

## Test Scenario 7: Transaction History Verification

### After 1 Day of Active Stakes

**User A's Wallet Transactions:**
```
[
  {
    type: "commission_direct",
    amount: 2.70,
    description: "L1 Referral Bonus from User B's stake",
    timestamp: [timestamp]
  },
  {
    type: "commission_vrank",
    amount: 3.60,
    description: "V1 Rank Bonus from User B's stake",
    timestamp: [timestamp]
  },
  {
    type: "commission_indirect",
    amount: 0.60,
    description: "L2 Referral Bonus from User G's stake",
    timestamp: [timestamp]
  }
]
```

**User A's Wallet Balance:**
- Starting: $0
- After Day 1: $6.90
- After Day 7: $48.30
- After Day 30: $207.00

---

## Test Scenario 8: Edge Cases

### Edge Case 1: Exactly Meeting Requirements
- Team Volume: $3,000 (exactly V1 minimum)
- Direct Referrals: 5 (exactly V1 minimum)
- **Expected**: Achieves V1 ✅

### Edge Case 2: One Dollar Short
- Team Volume: $2,999
- Direct Referrals: 5
- **Expected**: Remains V0 ❌

### Edge Case 3: Structure with Extra Qualified Directs
- Rank: V2 requirement (2 × V1)
- User has: 4 × V1 directs
- **Expected**: Achieves V2 ✅ (exceeds requirement)

### Edge Case 4: Mixed Rank Directs
- Rank: V3 requirement (2 × V2)
- User has: 1 × V3, 1 × V2, 3 × V1
- **Expected**: Achieves V3 ✅ (V3 counts as V2+)

### Edge Case 5: All Stakes Expire Simultaneously
- User A is V5 with $300,000 volume
- All stakes expire on same day
- Team volume drops to $0
- **Expected**: V5 → V0 (immediate downgrade)

### Edge Case 6: Circular Referral Prevention
- User A cannot refer User B if B is in A's upline
- System should prevent circular references
- **Expected**: Registration fails with error

---

## Test Scenario 9: Performance Test

### Large Network Simulation
- User A has 5 direct referrals
- Each direct has 5 referrals (25 L2)
- Each L2 has 5 referrals (125 L3)
- Total network: 155 users

### Daily Reward Distribution
- 155 active stakes
- Each yields $6/day
- Total yields: $930/day

### Expected Processing
1. Process 155 stake yields
2. Distribute L1 bonuses (155 transactions)
3. Distribute L2 bonuses (155 transactions)
4. Distribute V-Rank bonuses (155 transactions)
5. Total transactions: ~465/day

### Performance Requirements
- Process time: < 30 seconds
- No duplicate transactions
- Accurate balance updates
- Proper rank updates

---

## Validation Checklist

### Referral Bonus System
- [ ] L1 receives exactly 15% of direct's yield
- [ ] L2 receives exactly 10% of indirect's yield
- [ ] No bonuses beyond L2
- [ ] Bonuses stop if referrer doesn't exist

### V-Rank Bonus System
- [ ] Only direct referrer receives V-Rank bonus
- [ ] Bonus rate matches rank commission rate
- [ ] V0 users receive no V-Rank bonus
- [ ] Bonus calculated from direct referrals only

### Rank Requirements
- [ ] V1 requires $3K volume + 5 directs
- [ ] V2+ requires structure (2 × previous rank)
- [ ] All requirements must be met simultaneously
- [ ] Rank updates immediately on changes

### Dynamic Rank Updates
- [ ] Upgrades happen when requirements met
- [ ] Downgrades happen when requirements lost
- [ ] Rank changes propagate up the tree
- [ ] Team volume updates correctly on stake expiration

### Transaction Tracking
- [ ] All bonuses create transactions
- [ ] Transaction types are correct
- [ ] Wallet balances update accurately
- [ ] No duplicate transactions

### Edge Cases
- [ ] Handles exactly meeting requirements
- [ ] Handles one unit short of requirements
- [ ] Handles extra qualified directs
- [ ] Handles mixed rank directs
- [ ] Handles mass stake expirations
- [ ] Prevents circular referrals

---

## Automated Test Suite (Pseudocode)

```typescript
// Test 1: V1 Achievement
async function testV1Achievement() {
  const userA = await createUser();
  const directs = await createDirectReferrals(userA, 5);
  await createStakes(directs, 600);
  
  const updatedUser = await getUser(userA.id);
  assert(updatedUser.currentRank === "V1");
  assert(updatedUser.teamVolume === 3000);
}

// Test 2: Referral Bonus Distribution
async function testReferralBonuses() {
  const userA = await createUser();
  const userB = await createReferral(userA);
  await createStake(userB, 1000, 30); // $6/day yield
  
  await distributeDailyRewards();
  
  const transactions = await getTransactions(userA.id);
  const l1Bonus = transactions.find(t => t.type === "commission_direct");
  const vRankBonus = transactions.find(t => t.type === "commission_vrank");
  
  assert(l1Bonus.amount === 0.90); // 15% of $6
  assert(vRankBonus.amount === 1.20); // 20% of $6 (if V1)
}

// Test 3: Dynamic Downgrade
async function testDynamicDowngrade() {
  const userA = await setupV2User(); // V2 with $10,500 volume
  const stake = await findExpirableStake(userA, 1000);
  
  await expireStake(stake);
  
  const updatedUser = await getUser(userA.id);
  assert(updatedUser.currentRank === "V1");
  assert(updatedUser.teamVolume === 9500);
}
```

---

## Summary

These test scenarios cover:
✅ Basic rank achievement  
✅ Structure requirements  
✅ Dynamic upgrades  
✅ Dynamic downgrades  
✅ Multi-level bonuses  
✅ Rank progression  
✅ Transaction tracking  
✅ Edge cases  
✅ Performance testing  

Run these tests to ensure the V-Rank system works correctly in all scenarios.
