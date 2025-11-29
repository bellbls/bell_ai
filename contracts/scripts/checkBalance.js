const hre = require("hardhat");

/**
 * Check wallet balance on a specific network
 * Usage: npx hardhat run scripts/checkBalance.js --network <network-name>
 * Example: npx hardhat run scripts/checkBalance.js --network mumbai
 */
async function main() {
    const networkName = hre.network.name;
    console.log(`\n🔍 Checking balance on ${networkName}...\n`);

    // Get the first account (deployer)
    const [account] = await hre.ethers.getSigners();
    
    console.log(`Account Address: ${account.address}`);
    
    // Get balance
    const balance = await hre.ethers.provider.getBalance(account.address);
    const balanceInEther = hre.ethers.formatEther(balance);
    
    // Determine native token name
    const tokenName = 
        networkName === "polygon" || networkName === "mumbai" ? "MATIC" :
        networkName === "bsc" || networkName === "bscTestnet" ? "BNB" :
        "ETH";
    
    console.log(`Balance: ${balanceInEther} ${tokenName}`);
    
    // Check if balance is sufficient for deployment
    const minimumBalance = 0.01; // 0.01 native tokens
    if (parseFloat(balanceInEther) < minimumBalance) {
        console.log(`\n⚠️  WARNING: Balance is low!`);
        console.log(`   You need at least ${minimumBalance} ${tokenName} for deployment.`);
        console.log(`   Current balance: ${balanceInEther} ${tokenName}`);
        
        if (networkName.includes("Testnet") || networkName === "mumbai") {
            console.log(`\n💡 Get testnet tokens:`);
            if (networkName === "mumbai") {
                console.log(`   - Polygon Faucet: https://faucet.polygon.technology/`);
            } else if (networkName === "bscTestnet") {
                console.log(`   - BSC Faucet: https://testnet.binance.org/faucet-smart`);
            }
        } else {
            console.log(`\n💡 Buy ${tokenName} on an exchange and transfer to ${account.address}`);
        }
    } else {
        console.log(`\n✅ Balance is sufficient for deployment!`);
    }
    
    console.log();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


