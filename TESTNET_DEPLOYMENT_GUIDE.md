# Testnet Deployment Guide - Complete Step-by-Step

This guide will walk you through deploying your VaultForwarder smart contract to Polygon Mumbai testnet and configuring your entire deposit flow for testing.

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js and npm installed
- [ ] MetaMask or another Web3 wallet installed
- [ ] A wallet with some testnet MATIC (for gas)
- [ ] Access to your Convex dashboard
- [ ] Hot wallet private key ready (for deployment)

---

## Step 1: Set Up Environment Variables

### 1.1 Create `.env` File in Contracts Directory

Navigate to the `contracts` directory and create a `.env` file:

```bash
cd contracts
```

Create `.env` file with the following content:

```env
# Private Key for Hot Wallet (0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3)
PRIVATE_KEY=your_hot_wallet_private_key_here

# Testnet RPC URLs (using free public endpoints - you can use Alchemy/Infura for better reliability)
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# Optional: Better RPC endpoints (sign up at Alchemy/Infura for free tier)
# MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY

# Optional: For contract verification
POLYGONSCAN_API_KEY=your_polygonscan_api_key_optional
```

⚠️ **SECURITY WARNING**: 
- Never commit `.env` to Git
- Never share your private key
- Use a dedicated test wallet for deployments

### 1.2 Get Testnet MATIC (Gas Tokens)

1. Visit [Polygon Faucet](https://faucet.polygon.technology/)
2. Select "Mumbai" network
3. Enter your hot wallet address: `0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3`
4. Request MATIC tokens (usually ~0.5 MATIC)
5. Wait 1-2 minutes for tokens to arrive

**Alternative Faucets:**
- [Alchemy Faucet](https://www.alchemy.com/faucets/polygon-mumbai)
- [QuickNode Faucet](https://faucet.quicknode.com/polygon/mumbai)

Verify balance:
```bash
# Check balance on Mumbai testnet
# Visit: https://mumbai.polygonscan.com/address/0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3
```

---

## Step 2: Compile the Smart Contract

### 2.1 Install Dependencies (if not already done)

```bash
cd contracts
npm install
```

### 2.2 Compile the Contract

```bash
npx hardhat compile
```

Expected output:
```
Compiled 1 Solidity file successfully
```

If compilation succeeds, you're ready to deploy!

---

## Step 3: Deploy to Polygon Mumbai Testnet

### 3.1 Deploy the Contract

Run the deployment script:

```bash
npx hardhat run scripts/deploy.js --network mumbai
```

### 3.2 Expected Output

You should see something like:

```
🚀 Deploying VaultForwarder to mumbai...

📋 Configuration:
   Network: Polygon Mumbai
   Chain ID: 80001
   USDT Address: 0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832
   Cold Wallet: 0x074828a9a07f800d1da5836fe3140c6701d41b11
   Hot Wallet: 0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3
   Hot Wallet %: 2.5%

👤 Deploying from: 0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3
   Balance: 0.5 MATIC

⏳ Deploying contract...

✅ VaultForwarder deployed!
   Contract Address: 0x[YOUR_CONTRACT_ADDRESS]
   Transaction Hash: 0x[TX_HASH]
   Block Explorer: https://mumbai.polygonscan.com/address/0x[YOUR_CONTRACT_ADDRESS]

📊 Contract Details:
   USDT Token: 0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832
   Cold Wallet: 0x074828a9a07f800d1da5836fe3140c6701d41b11
   Owner (Hot Wallet): 0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3
   Hot Wallet %: 2.5%
   Low Balance Threshold: $500

💾 Deployment info saved to: deployments/mumbai.json
```

### 3.3 Save Your Contract Address

⚠️ **IMPORTANT**: Copy and save the contract address! You'll need it in the next steps.

Example format: `0x1234567890abcdef1234567890abcdef12345678`

---

## Step 4: Verify the Contract (Optional but Recommended)

### 4.1 Get Polygonscan API Key (Optional)

1. Visit [Polygonscan](https://polygonscan.com/)
2. Create a free account
3. Go to API Keys section
4. Create a new API key
5. Add it to your `.env` file: `POLYGONSCAN_API_KEY=your_key_here`

### 4.2 Verify the Contract

```bash
npx hardhat verify --network mumbai <YOUR_CONTRACT_ADDRESS> "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832" "0x074828a9a07f800d1da5836fe3140c6701d41b11" "0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3"
```

Replace `<YOUR_CONTRACT_ADDRESS>` with your actual deployed contract address.

Expected output:
```
Successfully verified contract VaultForwarder on Polygonscan.
```

---

## Step 5: Configure Backend (Convex)

### 5.1 Initialize Network Configuration (First Time Only)

If you haven't initialized networks yet, run this mutation in Convex Dashboard:

1. Go to your Convex Dashboard
2. Navigate to "Functions" tab
3. Find `networkManagement:initializeNetworks`
4. Run it (no arguments needed)

This creates the network entries in your database.

### 5.2 Update Network Configuration for Mumbai Testnet

You need to update the database with your deployed contract address. You have two options:

#### Option A: Using Convex Dashboard

1. Go to Convex Dashboard → Functions
2. Find `networkManagement:updateNetwork`
3. Run with these arguments:

```json
{
  "network": "polygon",
  "contractAddress": "0x[YOUR_CONTRACT_ADDRESS]",
  "rpcUrl": "https://rpc-mumbai.maticvigil.com",
  "isActive": true,
  "lowBalanceThreshold": 500
}
```

Replace `0x[YOUR_CONTRACT_ADDRESS]` with your actual contract address.

#### Option B: Using Convex Admin Panel (If Available)

1. Go to your admin panel in the app
2. Navigate to Network Management section
3. Update Polygon network with:
   - Contract Address: Your deployed address
   - RPC URL: `https://rpc-mumbai.maticvigil.com`
   - Is Active: ✅ Enabled
   - Is Paused: ❌ Not paused

### 5.3 Verify Network Configuration

Run this query in Convex Dashboard to verify:

1. Go to Functions → `networkManagement:getAllNetworks`
2. Run it
3. Check that Polygon network shows:
   - `contractAddress`: Your deployed address
   - `isActive`: `true`
   - `rpcUrl`: Mumbai RPC URL

---

## Step 6: Configure Frontend

### 6.1 Update Contract Address in Frontend Hook

Edit `app/hooks/useDepositContract.ts`:

Find the `NETWORK_CONTRACTS` object and update the Polygon entry:

```typescript
export const NETWORK_CONTRACTS: Record<string, NetworkContractConfig> = {
    polygon: {
        vaultAddress: "0x[YOUR_CONTRACT_ADDRESS]", // ← Update this!
        usdtAddress: "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832", // Mumbai testnet USDT
        decimals: 6,
    },
    // ... other networks
};
```

### 6.2 Update Web3 Wallet Configuration

Ensure your `useWeb3Wallet` hook includes Mumbai testnet configuration. Check `app/hooks/useWeb3Wallet.ts` and verify Mumbai is in `SUPPORTED_NETWORKS`.

The configuration should include:
- Chain ID: `80001`
- RPC URL: `https://rpc-mumbai.maticvigil.com`
- Block Explorer: `https://mumbai.polygonscan.com`

---

## Step 7: Get Test USDT Tokens

Before you can test deposits, you need test USDT tokens on Mumbai testnet.

### 7.1 Get Test USDT from Faucet

1. Visit [Polygon Faucet](https://faucet.polygon.technology/)
2. Select "Mumbai" network
3. Select "USDT" token (if available)

Or use a testnet faucet that provides USDT:
- Check if your MetaMask has a "Buy" button on Mumbai testnet
- Some testnets provide test tokens via faucets

### 7.2 Alternative: Mint Test USDT Directly

If you have access to the USDT contract on Mumbai:
1. Go to [Mumbai Polygonscan](https://mumbai.polygonscan.com/)
2. Search for USDT contract: `0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832`
3. Use "Write Contract" tab
4. Find `mint` function (if available)
5. Connect your wallet and mint test tokens

**Note**: Testnet USDT contracts may have special functions for testing. Check the contract on Polygonscan.

---

## Step 8: Test the Deposit Flow

### 8.1 Complete Deposit Flow Test

1. **Start Your Application**
   ```bash
   npm run dev
   ```

2. **Connect Wallet**
   - Open your app in browser
   - Click "Connect Wallet"
   - Select MetaMask
   - Switch to Mumbai testnet if not already connected
   - Ensure you have test USDT balance

3. **Open Deposit Modal**
   - Navigate to Wallet section
   - Click "Deposit" button
   - Select "Polygon" network

4. **Approve USDT (First Time Only)**
   - Enter deposit amount (e.g., 10 USDT)
   - Click "Approve USDT"
   - Confirm transaction in MetaMask
   - Wait for approval confirmation

5. **Execute Deposit**
   - After approval, click "Confirm Deposit"
   - Review the deposit details:
     - Amount: 10 USDT
     - To Hot Wallet (2.5%): 0.25 USDT
     - To Cold Wallet (97.5%): 9.75 USDT
   - Confirm transaction in MetaMask
   - Wait for transaction confirmation

6. **Verify on Blockchain**
   - Go to [Mumbai Polygonscan](https://mumbai.polygonscan.com/)
   - Search for your transaction hash
   - Verify:
     - DepositMade event was emitted
     - Funds were split correctly
     - 97.5% went to cold wallet
     - 2.5% stayed in contract

7. **Wait for Deposit Listener**
   - The deposit listener cron job runs every 60 seconds
   - Wait 1-2 minutes for the deposit to be processed
   - Check your wallet balance in the app - it should increase

8. **Verify in Database**
   - Check Convex Dashboard → Database
   - Look at `deposit_logs` table
   - Verify your deposit was logged with:
     - Correct user ID
     - Correct amount
     - Transaction hash
     - Status: "confirmed"
   - Check `transactions` table for deposit transaction
   - Check `notifications` table for deposit notification

---

## Step 9: Test Deposit Listener

### 9.1 Manually Trigger Deposit Listener

To test immediately without waiting for cron:

1. Go to Convex Dashboard → Functions
2. Find `multiNetworkDepositListener:checkForDeposits`
3. Run it (no arguments)
4. Check the logs/output

Expected output:
```
Monitoring 1 active networks for deposits...
📡 Checking Polygon for deposits...
Polygon: Querying blocks X to Y (N blocks)
Polygon: Found 1 deposit events
New deposit: 0x[USER_ADDRESS] → $10.00 (Polygon)
✅ Credited user@example.com: $10.00 (Polygon)
Polygon: Processed 1 deposits
```

### 9.2 Verify Deposit Processing

After the listener runs:

1. **Check Deposit Logs**
   - Database → `deposit_logs`
   - Should see entry with your transaction hash

2. **Check User Balance**
   - Database → `users` → Find your user
   - `walletBalance` should be increased

3. **Check Transaction**
   - Database → `transactions`
   - Should see deposit transaction with type "deposit"

4. **Check Notification**
   - Database → `notifications`
   - Should see deposit notification for user

---

## Step 10: Test Complete End-to-End Flow

### 10.1 Test Different Scenarios

1. **Minimum Deposit**
   - Try depositing the minimum amount (check your config)
   - Verify it works

2. **Multiple Deposits**
   - Make 2-3 deposits from the same wallet
   - Verify each is processed correctly
   - Check for duplicate detection

3. **Different User Addresses**
   - Link a different wallet address to a user
   - Make a deposit from that address
   - Verify user gets credited

4. **Error Scenarios**
   - Try depositing with insufficient balance
   - Try depositing when contract is paused (if you test pause)
   - Verify error messages are clear

---

## Troubleshooting

### Issue: "Insufficient funds for gas"

**Solution**: 
- Get more MATIC from faucet
- Check you're on Mumbai testnet, not mainnet

### Issue: "Contract deployment failed"

**Solution**:
- Check your private key is correct in `.env`
- Ensure you have enough MATIC for gas
- Try increasing gas limit in hardhat config

### Issue: "Deposit listener not finding deposits"

**Solution**:
- Check network is active in database: `isActive: true`
- Check contract address is correct in database
- Verify RPC URL is accessible
- Check cron job is running (every 60 seconds)
- Manually trigger listener to see errors

### Issue: "Deposit not crediting user balance"

**Solution**:
- Check deposit address is linked to user in database
- Verify deposit_logs table has the entry
- Check if deposit was marked as duplicate
- Verify `blockchainSync.logDeposit` ran successfully

### Issue: "Cannot approve USDT"

**Solution**:
- Ensure you have USDT balance on Mumbai testnet
- Check you're connected to Mumbai network in MetaMask
- Try resetting MetaMask account (Advanced → Reset Account)

### Issue: "Deposit transaction reverts"

**Solution**:
- Check contract is not paused
- Verify you approved enough USDT
- Check contract address is correct
- Verify you have sufficient USDT balance

---

## Next Steps After Successful Testnet Deployment

1. **Monitor the System**
   - Set up alerts for low balances
   - Monitor deposit listener logs
   - Check for any errors

2. **Test All Features**
   - Pause/resume deposits
   - Test withdrawals (if implemented)
   - Test low balance alerts

3. **Prepare for Mainnet**
   - Once testnet testing is complete
   - Follow similar steps for mainnet deployment
   - Update all configurations with mainnet addresses

4. **Security Review**
   - Review contract code one more time
   - Test emergency pause functionality
   - Verify all wallet addresses are correct

---

## Quick Reference

### Important Addresses (Mumbai Testnet)

- **USDT Contract**: `0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832`
- **Cold Wallet**: `0x074828a9a07f800d1da5836fe3140c6701d41b11`
- **Hot Wallet**: `0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3`
- **Your Contract**: `0x[YOUR_DEPLOYED_ADDRESS]` ← Save this!

### Important Links

- **Mumbai Block Explorer**: https://mumbai.polygonscan.com
- **Polygon Faucet**: https://faucet.polygon.technology/
- **Convex Dashboard**: https://dashboard.convex.dev

### Key Commands

```bash
# Deploy to Mumbai
npx hardhat run scripts/deploy.js --network mumbai

# Verify contract
npx hardhat verify --network mumbai <CONTRACT_ADDRESS> <USDT_ADDRESS> <COLD_WALLET> <HOT_WALLET>

# Check deployment info
cat deployments/mumbai.json
```

---

## Success Checklist

After completing all steps, verify:

- [ ] Contract deployed to Mumbai testnet
- [ ] Contract verified on Polygonscan (optional)
- [ ] Network configured in Convex database
- [ ] Frontend updated with contract address
- [ ] Test USDT obtained
- [ ] Successfully made a test deposit
- [ ] Deposit detected by listener
- [ ] User balance updated correctly
- [ ] Transaction logged in database
- [ ] Notification created for user

---

**Ready to test!** Start with Step 1 and work through each step carefully. If you encounter any issues, refer to the Troubleshooting section.
