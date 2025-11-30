# Deposit Manual Test Checklist

Comprehensive manual testing guide for all deposit flows. Use this checklist to verify all deposit functionality works correctly.

---

## Prerequisites

Before starting manual tests, ensure:

- [ ] Smart contract deployed to testnet (see TESTNET_DEPLOYMENT_GUIDE.md)
- [ ] Network configured in Convex database
- [ ] Frontend updated with contract address
- [ ] Test USDT obtained on testnet
- [ ] Wallet connected and network switched to testnet

---

## Test 1: Manual Deposit (Admin/API)

### Setup
- [ ] Create a test user account
- [ ] Note initial balance

### Test Steps

#### 1.1 Valid Deposit
1. [ ] Call `wallet.deposit` mutation with:
   - Valid userId
   - Amount: 100.00
   - Optional: txHash
   - Optional: method
2. [ ] Verify response:
   - [ ] `success: true`
   - [ ] `newBalance` = oldBalance + 100.00
   - [ ] Success message present
3. [ ] Check database:
   - [ ] User balance updated correctly
   - [ ] Transaction record created
   - [ ] Transaction description includes method/txHash if provided

#### 1.2 Invalid Amount Tests
- [ ] Test with amount = 0 → Should fail with validation error
- [ ] Test with amount < 0 → Should fail with validation error
- [ ] Test with amount = NaN → Should fail with validation error

#### 1.3 User Not Found
- [ ] Test with non-existent userId → Should fail with USER_NOT_FOUND error

#### 1.4 Multiple Deposits
- [ ] Make 3 deposits: 50, 25, 100
- [ ] Verify balance updates correctly: initial + 175
- [ ] Verify 3 transaction records created

**Expected Results**:
- ✅ All valid deposits succeed
- ✅ Balance updates correctly
- ✅ Transactions logged properly
- ✅ Invalid inputs rejected with clear errors

---

## Test 2: Blockchain Deposit (Frontend)

### Setup
- [ ] Connect Web3 wallet (MetaMask)
- [ ] Switch to testnet (Mumbai/Polygon testnet)
- [ ] Ensure wallet has test USDT balance
- [ ] Ensure wallet has test MATIC for gas
- [ ] Create/link user account with wallet address

### Test Steps

#### 2.1 Wallet Connection
1. [ ] Open Deposit Modal
2. [ ] Click "Connect Wallet"
3. [ ] Select MetaMask
4. [ ] Approve connection
5. [ ] Verify:
   - [ ] Wallet address displayed
   - [ ] Network is correct (Mumbai)
   - [ ] Balance is shown

#### 2.2 Network Selection
1. [ ] Verify available networks listed
2. [ ] Select Polygon network
3. [ ] Verify network switches correctly
4. [ ] Verify balance updates for selected network

#### 2.3 Amount Entry
1. [ ] Enter amount: 50.00 USDT
2. [ ] Verify:
   - [ ] Balance check shows current USDT balance
   - [ ] Minimum deposit amount displayed
   - [ ] "Use Max" button works
3. [ ] Try invalid amounts:
   - [ ] Amount > balance → Should show error
   - [ ] Amount < minimum → Should show error
   - [ ] Amount = 0 → Should show error

#### 2.4 USDT Approval (First Time)
1. [ ] If allowance < amount:
   - [ ] Approval step appears
   - [ ] Click "Approve USDT"
   - [ ] Confirm in MetaMask
   - [ ] Wait for approval confirmation
2. [ ] Verify:
   - [ ] Approval transaction succeeds
   - [ ] Proceeds to deposit step

#### 2.5 Deposit Execution
1. [ ] Review deposit details:
   - [ ] Amount: 50.00 USDT
   - [ ] Network: Polygon
   - [ ] Split: 2.5% hot (1.25), 97.5% cold (48.75)
2. [ ] Click "Confirm Deposit"
3. [ ] Confirm in MetaMask
4. [ ] Wait for transaction confirmation
5. [ ] Verify:
   - [ ] Transaction hash displayed
   - [ ] Success message shown
   - [ ] Link to block explorer works

#### 2.6 Verify on Blockchain
1. [ ] Open block explorer (Mumbai Polygonscan)
2. [ ] Search for transaction hash
3. [ ] Verify:
   - [ ] Transaction confirmed
   - [ ] DepositMade event emitted
   - [ ] Event shows correct:
     - [ ] User address
     - [ ] Amount
     - [ ] Hot wallet amount (2.5%)
     - [ ] Cold wallet amount (97.5%)
4. [ ] Check contract balance:
   - [ ] Contract has 2.5% of deposit
5. [ ] Check cold wallet:
   - [ ] Cold wallet received 97.5% of deposit

#### 2.7 Multiple Deposits
- [ ] Make 2-3 deposits from same wallet
- [ ] Verify each transaction succeeds
- [ ] Verify no duplicate detection issues

**Expected Results**:
- ✅ All steps complete successfully
- ✅ Transactions confirmed on blockchain
- ✅ Funds split correctly
- ✅ Events emitted properly

---

## Test 3: Deposit Listener (Automatic Detection)

### Setup
- [ ] Complete a blockchain deposit (Test 2)
- [ ] Note transaction hash and block number
- [ ] Wait 1-2 minutes (listener runs every 60 seconds)

### Test Steps

#### 3.1 Automatic Processing
1. [ ] Wait for cron job to run (60 seconds)
2. [ ] Or manually trigger: `multiNetworkDepositListener:checkForDeposits`
3. [ ] Check Convex Dashboard logs for:
   - [ ] "Found X deposit events"
   - [ ] "Processing deposit: [txHash]"
   - [ ] "Credited user: $X"

#### 3.2 Verify Database Updates
1. [ ] Check `deposit_logs` table:
   - [ ] Entry exists with transaction hash
   - [ ] User ID correct
   - [ ] Amount correct
   - [ ] Network correct
   - [ ] Status: "confirmed"
2. [ ] Check `users` table:
   - [ ] Balance increased by deposit amount
   - [ ] Balance = oldBalance + depositAmount
3. [ ] Check `transactions` table:
   - [ ] Deposit transaction created
   - [ ] Type: "deposit"
   - [ ] Amount: deposit amount
   - [ ] ReferenceId: transaction hash
   - [ ] Status: "approved"
4. [ ] Check `notifications` table:
   - [ ] Notification created for user
   - [ ] Type: "earnings"
   - [ ] Title: "Deposit Received"
   - [ ] Message includes amount
   - [ ] Data includes txHash

#### 3.3 Verify User Experience
1. [ ] Log in as user who made deposit
2. [ ] Check wallet balance in app
3. [ ] Verify:
   - [ ] Balance updated
   - [ ] Transaction appears in history
   - [ ] Notification received

#### 3.4 Duplicate Detection
1. [ ] Try manually triggering listener again
2. [ ] Verify:
   - [ ] Deposit not processed twice
   - [ ] Logs show "Duplicate deposit detected"
   - [ ] Balance unchanged

**Expected Results**:
- ✅ Deposits automatically detected within 60 seconds
- ✅ All database tables updated correctly
- ✅ User balance credited
- ✅ Notifications sent
- ✅ Duplicates prevented

---

## Test 4: Edge Cases

### 4.1 Unlinked Deposit
1. [ ] Make deposit from wallet NOT linked to any user
2. [ ] Verify:
   - [ ] Deposit detected by listener
   - [ ] Deposit logged in `deposit_logs`
   - [ ] userId is null in deposit_logs
   - [ ] Admin alert created
   - [ ] No user balance credited
   - [ ] No notification created

### 4.2 Contract Paused
1. [ ] Pause deposits on contract (admin function)
2. [ ] Try to make deposit via frontend
3. [ ] Verify:
   - [ ] Error message: "Deposits are currently paused"
   - [ ] Transaction fails/reverts

### 4.3 Insufficient Balance
1. [ ] Try to deposit more than USDT balance
2. [ ] Verify:
   - [ ] Frontend shows error before transaction
   - [ ] Cannot proceed to confirmation

### 4.4 Insufficient Allowance
1. [ ] Reset approval (or use new amount)
2. [ ] Try to deposit without approval
3. [ ] Verify:
   - [ ] Approval step appears
   - [ ] Cannot deposit without approval

### 4.5 Network Mismatch
1. [ ] Switch wallet to wrong network
2. [ ] Try to deposit
3. [ ] Verify:
   - [ ] Error message prompts to switch network
   - [ ] Network switching works

### 4.6 Minimum Deposit
1. [ ] Try to deposit below minimum (check config)
2. [ ] Verify:
   - [ ] Error message shows minimum amount
   - [ ] Cannot proceed

**Expected Results**:
- ✅ All edge cases handled gracefully
- ✅ Clear error messages
- ✅ No incorrect balance updates
- ✅ System remains stable

---

## Test 5: Concurrent Deposits

### 5.1 Multiple Users
1. [ ] Create 2-3 test users
2. [ ] Link different wallet addresses to each
3. [ ] Make deposits simultaneously (within same block range)
4. [ ] Verify:
   - [ ] All deposits detected
   - [ ] Each user credited correctly
   - [ ] No duplicates or missed deposits

### 5.2 Same User, Multiple Deposits
1. [ ] Make 3 deposits quickly from same user
2. [ ] Verify:
   - [ ] All deposits processed
   - [ ] Balance = initial + sum of all deposits
   - [ ] All transactions logged
   - [ ] All notifications created

**Expected Results**:
- ✅ All deposits processed correctly
- ✅ No race conditions
- ✅ Balance calculations accurate

---

## Test 6: End-to-End Flow

### Complete User Journey

1. [ ] **User Registration**
   - [ ] Create account
   - [ ] Link wallet address

2. [ ] **First Deposit**
   - [ ] Connect wallet
   - [ ] Approve USDT (first time)
   - [ ] Make deposit: 100 USDT
   - [ ] Wait for confirmation

3. [ ] **Balance Update**
   - [ ] Wait 1-2 minutes
   - [ ] Check balance updated
   - [ ] Check transaction history
   - [ ] Check notification

4. [ ] **Second Deposit**
   - [ ] Make another deposit: 50 USDT
   - [ ] (No approval needed if allowance sufficient)
   - [ ] Verify balance increases correctly

5. [ ] **Use Balance**
   - [ ] Try to stake using deposited funds
   - [ ] Verify balance decreases correctly

**Expected Results**:
- ✅ Complete flow works smoothly
- ✅ All steps complete without errors
- ✅ Balance tracking accurate throughout

---

## Test 7: Error Recovery

### 7.1 Listener Errors
1. [ ] Temporarily break network config
2. [ ] Trigger listener
3. [ ] Verify:
   - [ ] Error logged in cron_logs
   - [ ] Sync state shows error
   - [ ] Fix config and retry
   - [ ] Listener recovers and processes pending deposits

### 7.2 Database Errors
1. [ ] Simulate database constraint error
2. [ ] Verify:
   - [ ] Error caught and logged
   - [ ] Other deposits continue processing
   - [ ] Error doesn't crash system

**Expected Results**:
- ✅ Errors handled gracefully
- ✅ System recovers automatically
- ✅ No data loss

---

## Test Results Template

### Test Execution Log

**Date**: ___________

**Tester**: ___________

**Environment**: Testnet (Mumbai)

**Test Results**:

| Test | Status | Notes |
|------|--------|-------|
| 1.1 Valid Deposit | ☐ Pass ☐ Fail | |
| 1.2 Invalid Amount | ☐ Pass ☐ Fail | |
| 1.3 User Not Found | ☐ Pass ☐ Fail | |
| 1.4 Multiple Deposits | ☐ Pass ☐ Fail | |
| 2.1 Wallet Connection | ☐ Pass ☐ Fail | |
| 2.2 Network Selection | ☐ Pass ☐ Fail | |
| 2.3 Amount Entry | ☐ Pass ☐ Fail | |
| 2.4 USDT Approval | ☐ Pass ☐ Fail | |
| 2.5 Deposit Execution | ☐ Pass ☐ Fail | |
| 2.6 Blockchain Verification | ☐ Pass ☐ Fail | |
| 2.7 Multiple Deposits | ☐ Pass ☐ Fail | |
| 3.1 Automatic Processing | ☐ Pass ☐ Fail | |
| 3.2 Database Updates | ☐ Pass ☐ Fail | |
| 3.3 User Experience | ☐ Pass ☐ Fail | |
| 3.4 Duplicate Detection | ☐ Pass ☐ Fail | |
| 4.1 Unlinked Deposit | ☐ Pass ☐ Fail | |
| 4.2 Contract Paused | ☐ Pass ☐ Fail | |
| 4.3 Insufficient Balance | ☐ Pass ☐ Fail | |
| 4.4 Insufficient Allowance | ☐ Pass ☐ Fail | |
| 4.5 Network Mismatch | ☐ Pass ☐ Fail | |
| 4.6 Minimum Deposit | ☐ Pass ☐ Fail | |
| 5.1 Multiple Users | ☐ Pass ☐ Fail | |
| 5.2 Same User Multiple | ☐ Pass ☐ Fail | |
| 6. End-to-End Flow | ☐ Pass ☐ Fail | |
| 7.1 Listener Errors | ☐ Pass ☐ Fail | |
| 7.2 Database Errors | ☐ Pass ☐ Fail | |

**Issues Found**:
1. 
2. 
3. 

**Overall Status**: ☐ Pass ☐ Fail

**Next Steps**:
- [ ] Fix any failing tests
- [ ] Retest failed scenarios
- [ ] Update documentation if needed

---

## Troubleshooting Common Issues

### Issue: Deposit not appearing in database

**Check**:
1. Transaction confirmed on blockchain?
2. Listener cron job running?
3. Network configured correctly?
4. User address linked to account?
5. Check Convex logs for errors

**Fix**:
- Manually trigger listener
- Check sync state
- Verify network config

### Issue: Balance not updating

**Check**:
1. Deposit logged in `deposit_logs`?
2. User ID correct in deposit_logs?
3. `logDeposit` mutation succeeded?
4. Check transaction table

**Fix**:
- Check deposit_logs userId field
- Verify user exists
- Check for errors in logs

### Issue: Frontend deposit failing

**Check**:
1. Wallet connected?
2. Correct network?
3. Sufficient USDT balance?
4. Contract address correct?
5. Contract not paused?

**Fix**:
- Check wallet connection
- Switch to correct network
- Verify contract address in frontend config

---

**End of Manual Test Checklist**
