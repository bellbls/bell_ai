# 🚀 VaultForwarder Deployment Guide

## 📋 **Pre-Deployment Checklist**

### 1. **Get Your Wallet Ready**

#### Option A: Use Existing Wallet (Recommended)
- Open MetaMask
- Click account icon → Account Details → Export Private Key
- Enter password and copy private key
- **⚠️ NEVER share this key with anyone!**

#### Option B: Create New Wallet for Deployment
```bash
# You can create a new wallet specifically for deployment
# This is safer than using your main wallet
```

### 2. **Fund Your Wallet with Gas**

#### For Mumbai Testnet (FREE):
1. Go to [Polygon Faucet](https://faucet.polygon.technology/)
2. Select Mumbai network
3. Enter your wallet address
4. Get free testnet MATIC

#### For Polygon Mainnet:
- You need ~0.1 MATIC ($0.10) for deployment
- Buy MATIC on any exchange
- Transfer to your deployment wallet

### 3. **Get API Keys (Optional but Recommended)**

#### PolygonScan API Key (For Contract Verification):
1. Go to [polygonscan.com](https://polygonscan.com)
2. Sign up / Login
3. Go to API Keys section
4. Create new API key
5. Copy the key

---

## 🔧 **Setup Environment**

### Step 1: Create .env File

```bash
cd contracts
cp .env.example .env
```

### Step 2: Edit .env File

Open `.env` in a text editor and fill in:

```bash
# Your wallet's private key (WITHOUT the 0x prefix)
PRIVATE_KEY=abc123def456...

# PolygonScan API key (optional, for verification)
POLYGONSCAN_API_KEY=YOUR_KEY_HERE
```

### Step 3: Verify Setup

```bash
# Check that dependencies are installed
npm install

# Check your wallet balance
npx hardhat run scripts/checkBalance.js --network mumbai
```

---

## 🧪 **Deploy to Testnet (Mumbai)**

### Step 1: Deploy Contract

```bash
cd contracts
npx hardhat run scripts/deploy.js --network mumbai
```

**Expected Output:**
```
🚀 Deploying VaultForwarder to mumbai...

📋 Configuration:
   Network: Polygon Mumbai
   Chain ID: 80001
   USDT Address: 0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832
   Cold Wallet: 0x074828a9a07f800d1da5836fe3140c6701d41b11
   Hot Wallet: 0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3
   Hot Wallet %: 2.5%

👤 Deploying from: 0xYourAddress
   Balance: 0.5 MATIC

⏳ Deploying contract...

✅ VaultForwarder deployed!
   Contract Address: 0x1234567890123456789012345678901234567890
   Transaction Hash: 0xabcdef...
   Block Explorer: https://mumbai.polygonscan.com/address/0x1234...

💾 Deployment info saved to: deployments/mumbai.json
```

### Step 2: Save Contract Address

**IMPORTANT:** Copy the contract address from the output. You'll need it later!

Example: `0x1234567890123456789012345678901234567890`

### Step 3: Verify Contract (Optional)

```bash
npx hardhat verify --network mumbai \
  0x1234567890123456789012345678901234567890 \
  "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832" \
  "0x074828a9a07f800d1da5836fe3140c6701d41b11" \
  "0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3"
```

Replace the first address with your deployed contract address.

### Step 4: Test Deposit on Testnet

1. **Get Test USDT:**
   - Mumbai testnet USDT: `0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832`
   - You'll need to mint or get test USDT tokens
   - Or use a faucet if available

2. **Test via Frontend:**
   - Connect MetaMask to Mumbai network
   - Go to your app's deposit modal
   - Try depositing $10
   - Wait 60 seconds
   - Check if balance updated

---

## 🌐 **Deploy to Mainnet (Polygon)**

### ⚠️ **IMPORTANT SECURITY CHECKLIST**

Before deploying to mainnet:
- [ ] Contract verified on testnet
- [ ] Test deposits successful
- [ ] Cold wallet address is CORRECT
- [ ] Hot wallet address is CORRECT  
- [ ] You have enough MATIC for gas (~0.1 MATIC)
- [ ] You've backed up your private key securely
- [ ] You understand this cannot be undone

### Step 1: Deploy to Polygon Mainnet

```bash
npx hardhat run scripts/deploy.js --network polygon
```

**Expected Output:**
```
🚀 Deploying VaultForwarder to polygon...

📋 Configuration:
   Network: Polygon
   Chain ID: 137
   USDT Address: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
   Cold Wallet: 0x074828a9a07f800d1da5836fe3140c6701d41b11
   Hot Wallet: 0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3

👤 Deploying from: 0xYourAddress
   Balance: 0.15 MATIC

✅ VaultForwarder deployed!
   Contract Address: 0xABCDEF1234567890ABCDEF1234567890ABCDEF12
   Block Explorer: https://polygonscan.com/address/0xABCDEF...

💾 Deployment info saved to: deployments/polygon.json
```

### Step 2: **SAVE CONTRACT ADDRESS IMMEDIATELY**

**🔴 CRITICAL:** Copy this address somewhere safe!

Example: `0xABCDEF1234567890ABCDEF1234567890ABCDEF12`

### Step 3: Verify Contract on PolygonScan

```bash
npx hardhat verify --network polygon \
  0xABCDEF1234567890ABCDEF1234567890ABCDEF12 \
  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" \
  "0x074828a9a07f800d1da5836fe3140c6701d41b11" \
  "0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3"
```

---

## 🎛️ **Activate Network in Admin Panel**

### Method 1: Via Admin Dashboard UI

1. **Login to Admin Panel:**
   - Go to `http://localhost:3000/admin`
   - Enter admin passcode

2. **Navigate to Blockchain Tab:**
   - Click "Blockchain" in sidebar

3. **Initialize Networks (First Time Only):**
   - If you see "Initialize Networks" button, click it
   - This creates the 3 network entries in database

4. **Update Polygon Network:**
   - Find the Polygon card
   - Click "Edit" or "Update" button
   - Enter your contract address: `0xABCDEF...`
   - Toggle "Active" switch to ON
   - Save

5. **Verify Status:**
   - Network should show "Active" badge
   - Contract address should be displayed
   - Hot wallet balance should start showing (may take 1 min)

### Method 2: Via Convex Console (Alternative)

If admin UI is not ready, use Convex dashboard:

```typescript
// Go to your Convex dashboard
// Run this mutation:

await ctx.runMutation(api.networkManagement.updateNetworkConfig, {
    network: "polygon",
    contractAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
    isActive: true
});
```

---

## ✅ **Test Production Deposit**

### Step 1: Prepare Test User

1. **Create test user account** in your app
2. **Link deposit address:**
   - Go to Settings (when UI is ready)
   - Link your MetaMask address
   - Or for now, manually update user in Convex dashboard

### Step 2: Execute Test Deposit

1. **Connect MetaMask to Polygon Mainnet**
   - Network: Polygon Mainnet
   - Chain ID: 137

2. **Open Deposit Modal**
   - Go to Wallet → Deposit
   - Select Polygon network
   - Enter amount: $10 USDT

3. **Approve USDT (First Time Only)**
   - Click "Approve USDT"
   - Confirm transaction in MetaMask
   - Wait for confirmation (~10 seconds)

4. **Execute Deposit**
   - Click "Deposit"
   - Confirm transaction in MetaMask
   - Wait for confirmation (~10 seconds)

5. **Wait for Detection**
   - Deposit listener runs every 60 seconds
   - Wait 1-2 minutes
   - Refresh page

6. **Verify Success:**
   - ✅ User balance increased by $10
   - ✅ Transaction shows in history
   - ✅ Hot wallet balance increased (check admin panel)
   - ✅ Cold wallet received 97.5% ($9.75)

---

## 🔍 **Verify Deployment**

### Check Contract on PolygonScan:

```
https://polygonscan.com/address/0xYOUR_CONTRACT_ADDRESS

Verify:
- ✅ Contract is verified (green checkmark)
- ✅ Owner is your hot wallet
- ✅ USDT token address is correct
- ✅ Cold wallet address is correct
```

### Check Convex Logs:

```bash
# In your Convex dashboard, check cron logs:
# Should see: "Processed N deposits from blocks X-Y"
```

### Check Admin Panel:

```
Admin → Blockchain Tab:
- ✅ Polygon shows "Active"
- ✅ Contract address displayed
- ✅ Hot wallet balance updating
- ✅ No error alerts
```

---

## 🐛 **Troubleshooting**

### Issue: "Insufficient funds for gas"
**Solution:** Add more MATIC to your deployment wallet

### Issue: "Invalid API key"
**Solution:** Double-check your PolygonScan API key in .env

### Issue: "Network not found"
**Solution:** Make sure you're using correct network name: `polygon`, `mumbai`, `bsc`, etc.

### Issue: Contract deployed but not showing in admin
**Solution:** 
1. Check if networks are initialized: `api.networkManagement.getAllNetworks`
2. Manually update config: `api.networkManagement.updateNetworkConfig`

### Issue: Deposits not being detected
**Solution:**
1. Check Convex cron is running: Look for `multi-network-deposit-listener` logs
2. Verify network is active in DB
3. Check contract address is correct
4. Verify RPC URL is working

---

## 📊 **Post-Deployment Monitoring**

### First 24 Hours:

- [ ] Check cron logs every hour
- [ ] Monitor first 5 deposits closely
- [ ] Verify all balances match
- [ ] Check hot wallet balance stays above $500
- [ ] Test withdrawal execution

### Ongoing:

- [ ] Daily: Check sync status in admin panel
- [ ] Weekly: Reconcile on-chain vs database deposits
- [ ] Monthly: Review hot wallet balance trends

---

## 🔐 **Security Best Practices**

1. **Never commit .env file** (already in .gitignore)
2. **Use hardware wallet** for contract ownership in production
3. **Enable multi-sig** for withdrawals above $1000
4. **Monitor low balance alerts**
5. **Keep backup** of all deployment addresses
6. **Test on testnet** before every mainnet deployment

---

## 📞 **Need Help?**

### Useful Commands:

```bash
# Check your wallet balance
npx hardhat run scripts/checkBalance.js --network polygon

# View deployment history
cat deployments/polygon.json

# Test RPC connection
npx hardhat console --network polygon
```

### Useful Links:

- [Hardhat Documentation](https://hardhat.org/docs)
- [PolygonScan](https://polygonscan.com)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

---

## 🎉 **Success!**

Once deployed and tested, you should have:
- ✅ Contract deployed and verified on Polygon
- ✅ Network active in admin panel
- ✅ First test deposit successful
- ✅ Balance automatically credited
- ✅ Hot/cold wallet split working
- ✅ Deposit listener running every 60 seconds

**You're ready for production! 🚀**

---

## 🔄 **Deploy to Other Networks**

Once Polygon is working, deploy to BSC and Arbitrum:

```bash
# BSC Mainnet
npx hardhat run scripts/deploy.js --network bsc

# Arbitrum Mainnet
npx hardhat run scripts/deploy.js --network arbitrum
```

Then activate each network in the admin panel!


