# VaultForwarder Smart Contract - Deployment Guide

## Overview

This guide will help you deploy the VaultForwarder smart contract to Polygon, BSC, and Arbitrum networks.

**Contract Features:**
- ✅ Automatic fund forwarding (2.5% hot wallet, 97.5% cold wallet)
- ✅ OpenZeppelin audited base contracts
- ✅ Pausable deposits for emergency situations
- ✅ Low balance alerts
- ✅ Owner-only withdrawals
- ✅ Emergency withdraw function

**Your Configuration:**
- Cold Wallet: `0x074828a9a07f800d1da5836fe3140c6701d41b11`
- Hot Wallet: `0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3`
- Hot Wallet %: 2.5%
- Low Balance Alert: < $500

---

## Prerequisites

### 1. Install Dependencies

Already done! ✅

### 2. Get Private Key

You need the private key for your hot wallet (`0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3`).

**How to export from MetaMask:**
1. Open MetaMask
2. Click the 3 dots → Account Details
3. Click "Export Private Key"
4. Enter password
5. Copy the private key

⚠️ **SECURITY WARNING**: Never share this key or commit it to Git!

### 3. Get Native Tokens for Gas

You need small amounts of native tokens to deploy:

| Network | Token | Amount Needed | Where to Get |
|---------|-------|---------------|--------------|
| Polygon Mumbai (Testnet) | MATIC | ~0.1 MATIC | [Polygon Faucet](https://faucet.polygon.technology/) |
| BSC Testnet | BNB | ~0.01 BNB | [BSC Faucet](https://testnet.bnbchain.org/faucet-smart) |
| Arbitrum Sepolia (Testnet) | ETH | ~0.001 ETH | [Arbitrum Faucet](https://faucet.quicknode.com/arbitrum/sepolia) |

For mainnets, you'll need to buy:
- Polygon: ~$0.50 worth of MATIC
- BSC: ~$3 worth of BNB
- Arbitrum: ~$5 worth of ETH

---

## Step 1: Configure Environment

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your private key:
```env
PRIVATE_KEY=your_hot_wallet_private_key_here
```

3. (Optional) Add custom RPC URLs if you have Infura/Alchemy accounts:
```env
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
```

---

## Step 2: Compile Contract

```bash
npx hardhat compile
```

Expected output:
```
Compiled 1 Solidity file successfully
```

---

## Step 3: Deploy to Testnet (Polygon Mumbai)

**Why start with testnet?**
- Free to deploy and test
- No risk of losing real money
- Test all functionality before mainnet

### Deploy:

```bash
npx hardhat run scripts/deploy.js --network mumbai
```

### Expected Output:

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
   Balance: 0.1 MATIC

⏳ Deploying contract...

✅ VaultForwarder deployed!
   Contract Address: 0x... (SAVE THIS!)
   Transaction Hash: 0x...
   Block Explorer: https://mumbai.polygonscan.com/address/0x...

💾 Deployment info saved to: deployments/mumbai.json
```

**IMPORTANT**: Save the contract address! You'll need it for your backend.

---

## Step 4: Verify Contract

Verification makes your contract source code public on the block explorer.

```bash
npx hardhat verify --network mumbai <CONTRACT_ADDRESS> "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832" "0x074828a9a07f800d1da5836fe3140c6701d41b11" "0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3"
```

Replace `<CONTRACT_ADDRESS>` with the address from deployment.

---

## Step 5: Test on Testnet

### A. Get Test USDT

1. Go to [Mumbai USDT Faucet](https://faucet.polygon.technology/)
2. Request test USDT to your wallet
3. Wait for confirmation

### B. Test Deposit

1. Go to Mumbai Polygonscan
2. Navigate to your contract
3. Go to "Write Contract" tab
4. Connect your wallet
5. Find `deposit` function
6. First, approve USDT:
   - Go to USDT contract
   - Call `approve(vaultAddress, amount)`
7. Then call `deposit(amount)`
8. Check events to see fund split

### C. Verify Fund Forwarding

1. Check contract balance (should be 2.5% of deposit)
2. Check cold wallet balance (should receive 97.5%)
3. Verify `DepositMade` event was emitted

### D. Test Withdrawal

1. Call `withdraw(userAddress, amount)` as owner
2. Verify USDT transferred to user
3. Check `WithdrawalMade` event

### E. Test Pause/Resume

1. Call `pauseDeposits()`
2. Try to deposit (should fail)
3. Call `resumeDeposits()`
4. Deposit should work again

---

## Step 6: Deploy to Mainnet

**⚠️ ONLY AFTER SUCCESSFUL TESTNET TESTING!**

### Polygon Mainnet:

```bash
npx hardhat run scripts/deploy.js --network polygon
```

### BSC Mainnet:

```bash
npx hardhat run scripts/deploy.js --network bsc
```

### Arbitrum Mainnet:

```bash
npx hardhat run scripts/deploy.js --network arbitrum
```

**After each deployment:**
1. Save the contract address
2. Verify the contract
3. Update your backend configuration
4. Test with small amount first

---

## Step 7: Update Backend Configuration

After deploying to each network, update your backend:

1. Open `app/convex/depositListener.ts`
2. Add network configuration:

```typescript
const NETWORKS = {
  polygon: {
    name: "polygon",
    contractAddress: "0x...",  // From deployment
    rpcUrl: process.env.POLYGON_RPC_URL,
    usdtDecimals: 6,
  },
  bsc: {
    name: "bsc",
    contractAddress: "0x...",  // From deployment
    rpcUrl: process.env.BSC_RPC_URL,
    usdtDecimals: 18,  // BSC USDT uses 18 decimals!
  },
  arbitrum: {
    name: "arbitrum",
    contractAddress: "0x...",  // From deployment
    rpcUrl: process.env.ARBITRUM_RPC_URL,
    usdtDecimals: 6,
  },
};
```

---

## Deployment Costs

### Testnets (FREE):
- Polygon Mumbai: Free
- BSC Testnet: Free
- Arbitrum Sepolia: Free

### Mainnets:
- Polygon: ~$1
- BSC: ~$3
- Arbitrum: ~$5

**Total**: ~$10 for all 3 networks

---

## Security Checklist

Before going live:

- [ ] Tested deposit on testnet
- [ ] Tested withdrawal on testnet
- [ ] Verified fund forwarding (97.5% to cold wallet)
- [ ] Tested pause/resume functionality
- [ ] Verified low balance alerts work
- [ ] Tested emergency withdraw
- [ ] Contract verified on block explorer
- [ ] Private key stored securely
- [ ] Backend configured with correct addresses
- [ ] Tested with small mainnet amount first

---

## Troubleshooting

### "Insufficient funds for gas"
- Add more native tokens (MATIC/BNB/ETH) to hot wallet

### "USDT transfer failed"
- Make sure you approved USDT first
- Check USDT balance

### "Contract not verified"
- Get API key from block explorer
- Add to `.env`
- Run verify command again

### "Wrong network"
- Check you're connected to correct network in MetaMask
- Verify RPC URL in `.env`

---

## Next Steps

After successful deployment:

1. **Update Backend**: Add contract addresses to Convex config
2. **Test Deposit Listener**: Verify events are detected
3. **Test Withdrawal Executer**: Process a test withdrawal
4. **Monitor Balances**: Set up alerts for low balance
5. **Create Admin Panel**: Add network controls

---

## Support

If you encounter issues:

1. Check deployment logs in `deployments/` folder
2. Verify contract on block explorer
3. Test on testnet first
4. Check gas prices (may need to increase)

---

## Contract Addresses (After Deployment)

Save your deployed addresses here:

### Testnets:
- Polygon Mumbai: `_______________`
- BSC Testnet: `_______________`
- Arbitrum Sepolia: `_______________`

### Mainnets:
- Polygon: `_______________`
- BSC: `_______________`
- Arbitrum: `_______________`

---

**Ready to deploy?** Start with Step 1! 🚀
