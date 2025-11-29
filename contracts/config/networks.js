/**
 * Network Configuration
 * USDT contract addresses and network details for all supported chains
 */

module.exports = {
    // Polygon Network
    polygon: {
        name: "Polygon",
        chainId: 137,
        rpcUrl: "https://polygon-rpc.com",
        usdtAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",  // USDT on Polygon
        blockExplorer: "https://polygonscan.com",
        decimals: 6,
    },

    // Polygon Mumbai Testnet
    mumbai: {
        name: "Polygon Mumbai",
        chainId: 80001,
        rpcUrl: "https://rpc-mumbai.maticvigil.com",
        usdtAddress: "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832",  // Test USDT on Mumbai
        blockExplorer: "https://mumbai.polygonscan.com",
        decimals: 6,
    },

    // BSC Network
    bsc: {
        name: "Binance Smart Chain",
        chainId: 56,
        rpcUrl: "https://bsc-dataseed.binance.org",
        usdtAddress: "0x55d398326f99059fF775485246999027B3197955",  // USDT on BSC
        blockExplorer: "https://bscscan.com",
        decimals: 18,  // Note: BSC USDT uses 18 decimals!
    },

    // BSC Testnet
    bscTestnet: {
        name: "BSC Testnet",
        chainId: 97,
        rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
        usdtAddress: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",  // Test USDT on BSC Testnet
        blockExplorer: "https://testnet.bscscan.com",
        decimals: 18,
    },

    // Arbitrum Network
    arbitrum: {
        name: "Arbitrum One",
        chainId: 42161,
        rpcUrl: "https://arb1.arbitrum.io/rpc",
        usdtAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",  // USDT on Arbitrum
        blockExplorer: "https://arbiscan.io",
        decimals: 6,
    },

    // Arbitrum Sepolia Testnet
    arbitrumSepolia: {
        name: "Arbitrum Sepolia",
        chainId: 421614,
        rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
        usdtAddress: "0x0000000000000000000000000000000000000000",  // Deploy your own test token
        blockExplorer: "https://sepolia.arbiscan.io",
        decimals: 6,
    },

    // Wallet Configuration
    wallets: {
        coldWallet: "0x074828a9a07f800d1da5836fe3140c6701d41b11",
        hotWallet: "0xf2d20feae8625fd124e7b39aa4cc8cd8f004ebc3",
    },

    // Vault Configuration
    vault: {
        hotWalletPercentage: 2.5,  // 2.5% stays in contract
        lowBalanceThreshold: 500,  // $500 USD
    },
};
