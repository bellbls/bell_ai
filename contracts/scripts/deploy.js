const hre = require("hardhat");
const networks = require("../config/networks");

/**
 * Deploy VaultForwarder contract
 * Usage: npx hardhat run scripts/deploy.js --network <network-name>
 * Example: npx hardhat run scripts/deploy.js --network mumbai
 */
async function main() {
    const networkName = hre.network.name;
    console.log(`\n🚀 Deploying VaultForwarder to ${networkName}...`);

    // Get network configuration
    const networkConfig = networks[networkName];
    if (!networkConfig) {
        throw new Error(`Network ${networkName} not found in config`);
    }

    console.log(`\n📋 Configuration:`);
    console.log(`   Network: ${networkConfig.name}`);
    console.log(`   Chain ID: ${networkConfig.chainId}`);
    console.log(`   USDT Address: ${networkConfig.usdtAddress}`);
    console.log(`   Cold Wallet: ${networks.wallets.coldWallet}`);
    console.log(`   Hot Wallet: ${networks.wallets.hotWallet}`);
    console.log(`   Hot Wallet %: ${networks.vault.hotWalletPercentage}%`);

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n👤 Deploying from: ${deployer.address}`);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`   Balance: ${hre.ethers.formatEther(balance)} ${networkConfig.name === "BSC" ? "BNB" : networkConfig.name === "Polygon" ? "MATIC" : "ETH"}`);

    // Deploy contract
    console.log(`\n⏳ Deploying contract...`);
    const VaultForwarder = await hre.ethers.getContractFactory("VaultForwarder");
    const vault = await VaultForwarder.deploy(
        networkConfig.usdtAddress,
        networks.wallets.coldWallet,
        networks.wallets.hotWallet
    );

    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();

    console.log(`\n✅ VaultForwarder deployed!`);
    console.log(`   Contract Address: ${vaultAddress}`);
    console.log(`   Transaction Hash: ${vault.deploymentTransaction().hash}`);
    console.log(`   Block Explorer: ${networkConfig.blockExplorer}/address/${vaultAddress}`);

    // Calculate low balance threshold based on USDT decimals
    const lowBalanceThreshold = networks.vault.lowBalanceThreshold * (10 ** networkConfig.decimals);

    console.log(`\n📊 Contract Details:`);
    console.log(`   USDT Token: ${await vault.usdt()}`);
    console.log(`   Cold Wallet: ${await vault.coldWallet()}`);
    console.log(`   Owner (Hot Wallet): ${await vault.owner()}`);
    console.log(`   Hot Wallet %: ${await vault.HOT_WALLET_BPS() / 100}%`);
    console.log(`   Low Balance Threshold: $${networks.vault.lowBalanceThreshold}`);

    // Wait for block confirmations before verification
    console.log(`\n⏳ Waiting for block confirmations...`);
    await vault.deploymentTransaction().wait(5);

    console.log(`\n✅ Deployment complete!`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Verify contract: npx hardhat verify --network ${networkName} ${vaultAddress} "${networkConfig.usdtAddress}" "${networks.wallets.coldWallet}" "${networks.wallets.hotWallet}"`);
    console.log(`   2. Update backend config with contract address: ${vaultAddress}`);
    console.log(`   3. Test deposit functionality`);
    console.log(`   4. Monitor events for deposits`);

    // Save deployment info
    const fs = require('fs');
    const deploymentInfo = {
        network: networkName,
        networkConfig: networkConfig,
        contractAddress: vaultAddress,
        transactionHash: vault.deploymentTransaction().hash,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        configuration: {
            usdtAddress: networkConfig.usdtAddress,
            coldWallet: networks.wallets.coldWallet,
            hotWallet: networks.wallets.hotWallet,
            hotWalletPercentage: networks.vault.hotWalletPercentage,
            lowBalanceThreshold: networks.vault.lowBalanceThreshold,
        }
    };

    const deploymentsDir = './deployments';
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    fs.writeFileSync(
        `${deploymentsDir}/${networkName}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(`\n💾 Deployment info saved to: deployments/${networkName}.json`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
