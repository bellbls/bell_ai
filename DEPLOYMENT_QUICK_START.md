# ⚡ Quick Start: Deploy in 10 Minutes

## 🎯 **Goal**
Get Polygon network working with deposits in 10 minutes.

---

## **STEP 1: Setup (2 minutes)**

### 1.1 Get Your Private Key

1. Open MetaMask
2. Click your account icon (top right)
3. Click "Account Details"
4. Click "Show Private Key"
5. Enter your password
6. **Copy the private key** (example: `abc123def456...`)

⚠️ **IMPORTANT:** Never share this with anyone!

### 1.2 Create Environment File

```bash
# Navigate to contracts folder
cd contracts

# Create a new file called .env
# On Windows: notepad .env
# On Mac/Linux: nano .env

# Paste this content:
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE_WITHOUT_0x
POLYGONSCAN_API_KEY=optional_for_now
```

**Replace `YOUR_PRIVATE_KEY_HERE_WITHOUT_0x` with your actual private key!**

---

## **STEP 2: Get Testnet Tokens (3 minutes)**

### 2.1 Get Free MATIC from Faucet

1. Go to: https://faucet.polygon.technology/
2. Select network: **Mumbai**
3. Paste your wallet address
4. Click "Submit"
5. Wait 1 minute for tokens

### 2.2 Verify You Have MATIC

```bash
# Check your balance
npx hardhat run scripts/checkBalance.js --network mumbai
```

**Expected output:**
```
Account Address: 0xYourAddress
Balance: 0.5 MATIC
✅ Balance is sufficient for deployment!
```

---

## **STEP 3: Deploy to Testnet (2 minutes)**

### 3.1 Run Deploy Command

```bash
npx hardhat run scripts/deploy.js --network mumbai
```

### 3.2 Save Contract Address

**Look for this line in the output:**
```
✅ VaultForwarder deployed!
   Contract Address: 0x1234567890123456789012345678901234567890
```

**📝 WRITE THIS DOWN!** You'll need it in Step 4.

Example: `0x1234567890123456789012345678901234567890`

---

## **STEP 4: Activate Network (1 minute)**

### Option A: Via Admin Dashboard (Recommended)

1. Go to `http://localhost:3000/admin`
2. Enter admin passcode: `admin123`
3. Click **"Blockchain"** tab in sidebar
4. Find **"Polygon Mumbai"** card
5. Click **"Edit"** or **"Update"**
6. Paste your contract address
7. Toggle **"Active"** to ON
8. Click **"Save"**

### Option B: Via Convex Dashboard

1. Go to your Convex dashboard
2. Go to "Functions" tab
3. Find `networkManagement:updateNetworkConfig`
4. Click "Run"
5. Fill in:
   ```json
   {
     "network": "mumbai",
     "contractAddress": "0xYOUR_CONTRACT_ADDRESS_HERE",
     "isActive": true
   }
   ```
6. Click "Run function"

---

## **STEP 5: Test Deposit (2 minutes)**

### 5.1 Get Test USDT

Unfortunately, you'll need test USDT tokens for Mumbai. You have two options:

**Option A: Use Mainnet (Recommended - Skip to Step 6)**

**Option B: Deploy Test Token**
- This requires additional setup
- Skip to Step 6 for now and test on mainnet

---

## **STEP 6: Deploy to Mainnet (DO THIS!)**

### 6.1 Get Real MATIC

You need ~$0.10 worth of MATIC:
1. Buy MATIC on Coinbase/Binance
2. Send 0.1 MATIC to your wallet address

### 6.2 Deploy to Polygon Mainnet

```bash
npx hardhat run scripts/deploy.js --network polygon
```

### 6.3 Save Production Contract Address

**Look for:**
```
✅ VaultForwarder deployed!
   Contract Address: 0xABCDEF1234567890ABCDEF1234567890ABCDEF12
   Block Explorer: https://polygonscan.com/address/0xABCDEF...
```

**📝 SAVE THIS ADDRESS!** This is your production contract.

Example: `0xABCDEF1234567890ABCDEF1234567890ABCDEF12`

### 6.4 Activate Polygon Mainnet

1. Go to Admin → Blockchain
2. Find **"Polygon"** card
3. Paste your **production** contract address
4. Toggle **"Active"** to ON
5. Save

---

## **STEP 7: Test Live Deposit! 🎉**

### 7.1 Connect MetaMask

1. Open your app at `http://localhost:3000`
2. Login or create account
3. Connect MetaMask
4. **Switch to Polygon network** (not Mumbai!)

### 7.2 Make Test Deposit

1. Go to **Wallet** tab
2. Click **"Deposit"**
3. Select **Polygon** network
4. Enter amount: **$10 USDT**
5. Click **"Approve USDT"** (first time only)
6. Confirm in MetaMask
7. Wait 10 seconds
8. Click **"Deposit"**
9. Confirm in MetaMask
10. Wait 10 seconds

### 7.3 Wait for Detection

- The deposit listener runs every 60 seconds
- Wait **1-2 minutes**
- Refresh the page

### 7.4 Verify Success

✅ **Check these:**
- User balance increased by $10
- Transaction shows in wallet history
- Admin panel shows hot wallet balance increased
- No errors in browser console

---

## **🎉 SUCCESS!**

If you see your balance increase, congratulations! Your deposit system is now live!

---

## **📊 What Just Happened?**

1. ✅ You deployed VaultForwarder contract to Polygon
2. ✅ You activated the network in your admin panel
3. ✅ User deposited $10 USDT to the contract
4. ✅ Contract split funds: $9.75 → Cold wallet, $0.25 → Hot wallet
5. ✅ Contract emitted DepositMade event
6. ✅ Cron job detected the event (runs every 60 seconds)
7. ✅ Backend credited user's balance automatically
8. ✅ Transaction logged in database

---

## **🐛 Troubleshooting**

### Issue: "Cannot find module 'dotenv'"
```bash
cd contracts
npm install
```

### Issue: "Insufficient funds"
- Get more MATIC from exchange
- Make sure you're on correct network

### Issue: "Private key error"
- Remove "0x" prefix from private key
- Check no extra spaces in .env file

### Issue: Balance didn't update
1. Check admin panel → Blockchain → Is Polygon active?
2. Check Convex dashboard → Cron logs
3. Wait full 2 minutes
4. Verify contract address is correct

### Issue: "Network not initialized"
```bash
# In Convex dashboard, run:
await ctx.runMutation(api.networkManagement.initializeNetworks, {});
```

---

## **🔐 Security Notes**

1. **Testnet first** - Always test on Mumbai before mainnet
2. **Small amount first** - Try $10 deposit before larger amounts
3. **Backup keys** - Save your contract address securely
4. **Monitor first day** - Check every deposit closely

---

## **📞 Quick Commands**

```bash
# Check balance
npx hardhat run scripts/checkBalance.js --network polygon

# View deployment info
cat deployments/polygon.json

# Deploy to BSC (after Polygon works)
npx hardhat run scripts/deploy.js --network bsc

# Deploy to Arbitrum
npx hardhat run scripts/deploy.js --network arbitrum
```

---

## **✅ Next Steps**

Now that Polygon is working:

1. **Test withdrawals** - Approve and execute a withdrawal
2. **Deploy to BSC** - Follow same steps for BSC network
3. **Deploy to Arbitrum** - Follow same steps for Arbitrum
4. **Add UI features:**
   - Deposit address linking
   - Deposit history table
   - Better error messages

---

## **🎯 Expected Timeline**

- ✅ **Setup:** 2 minutes
- ✅ **Get testnet tokens:** 3 minutes  
- ✅ **Deploy testnet:** 2 minutes
- ✅ **Deploy mainnet:** 1 minute
- ✅ **Activate network:** 1 minute
- ✅ **Test deposit:** 2 minutes

**Total:** ~10 minutes (excluding waiting for faucet/exchange)

---

**Ready? Let's deploy! 🚀**

Start with: `cd contracts && npx hardhat run scripts/checkBalance.js --network mumbai`


