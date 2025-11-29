"use client";

import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";

export interface WalletInfo {
    name: string;
    icon: string;
    isInstalled: boolean;
}

export interface NetworkConfig {
    chainId: string;
    chainName: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls: string[];
    blockExplorerUrls: string[];
}

export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
    polygon: {
        chainId: "0x89", // 137
        chainName: "Polygon Mainnet",
        nativeCurrency: {
            name: "MATIC",
            symbol: "MATIC",
            decimals: 18,
        },
        rpcUrls: ["https://polygon-rpc.com"],
        blockExplorerUrls: ["https://polygonscan.com"],
    },
    bsc: {
        chainId: "0x38", // 56
        chainName: "BNB Smart Chain",
        nativeCurrency: {
            name: "BNB",
            symbol: "BNB",
            decimals: 18,
        },
        rpcUrls: ["https://bsc-dataseed.binance.org"],
        blockExplorerUrls: ["https://bscscan.com"],
    },
    arbitrum: {
        chainId: "0xa4b1", // 42161
        chainName: "Arbitrum One",
        nativeCurrency: {
            name: "ETH",
            symbol: "ETH",
            decimals: 18,
        },
        rpcUrls: ["https://arb1.arbitrum.io/rpc"],
        blockExplorerUrls: ["https://arbiscan.io"],
    },
};

export function useWeb3Wallet() {
    const [account, setAccount] = useState<string | null>(null);
    const [chainId, setChainId] = useState<string | null>(null);
    const [provider, setProvider] = useState<BrowserProvider | null>(null);
    const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Detect installed wallets
    const detectWallets = useCallback((): WalletInfo[] => {
        const wallets: WalletInfo[] = [];

        if (typeof window !== "undefined" && window.ethereum) {
            // MetaMask
            if (window.ethereum.isMetaMask) {
                wallets.push({
                    name: "MetaMask",
                    icon: "🦊",
                    isInstalled: true,
                });
            }

            // Trust Wallet
            if (window.ethereum.isTrust) {
                wallets.push({
                    name: "Trust Wallet",
                    icon: "💙",
                    isInstalled: true,
                });
            }

            // Coinbase Wallet
            if (window.ethereum.isCoinbaseWallet) {
                wallets.push({
                    name: "Coinbase Wallet",
                    icon: "🔵",
                    isInstalled: true,
                });
            }

            // Brave Wallet
            if (window.ethereum.isBraveWallet) {
                wallets.push({
                    name: "Brave Wallet",
                    icon: "🦁",
                    isInstalled: true,
                });
            }

            // Rainbow Wallet
            if (window.ethereum.isRainbow) {
                wallets.push({
                    name: "Rainbow",
                    icon: "🌈",
                    isInstalled: true,
                });
            }

            // Generic Web3 Wallet (if none of the above)
            if (wallets.length === 0) {
                wallets.push({
                    name: "Web3 Wallet",
                    icon: "🔗",
                    isInstalled: true,
                });
            }
        }

        return wallets;
    }, []);

    // Connect wallet
    const connect = useCallback(async () => {
        setIsConnecting(true);
        setError(null);

        try {
            if (!window.ethereum) {
                throw new Error("No Web3 wallet detected. Please install MetaMask, Trust Wallet, or another Web3 wallet.");
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            if (!accounts || accounts.length === 0) {
                throw new Error("No accounts found");
            }

            // Get chain ID
            const chainId = await window.ethereum.request({
                method: "eth_chainId",
            });

            // Create provider and signer
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            setAccount(accounts[0]);
            setChainId(chainId);
            setProvider(provider);
            setSigner(signer);

            return accounts[0];
        } catch (err: any) {
            console.error("Wallet connection error:", err);
            setError(err.message || "Failed to connect wallet");
            throw err;
        } finally {
            setIsConnecting(false);
        }
    }, []);

    // Disconnect wallet
    const disconnect = useCallback(() => {
        setAccount(null);
        setChainId(null);
        setProvider(null);
        setSigner(null);
        setError(null);
    }, []);

    // Switch network
    const switchNetwork = useCallback(async (networkKey: string) => {
        const networkConfig = SUPPORTED_NETWORKS[networkKey];

        if (!networkConfig) {
            throw new Error(`Unsupported network: ${networkKey}`);
        }

        if (!window.ethereum) {
            throw new Error("No Web3 wallet detected");
        }

        try {
            // Try to switch to the network
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: networkConfig.chainId }],
            });
        } catch (switchError: any) {
            // This error code indicates that the chain has not been added to the wallet
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [
                            {
                                chainId: networkConfig.chainId,
                                chainName: networkConfig.chainName,
                                nativeCurrency: networkConfig.nativeCurrency,
                                rpcUrls: networkConfig.rpcUrls,
                                blockExplorerUrls: networkConfig.blockExplorerUrls,
                            },
                        ],
                    });
                } catch (addError) {
                    throw new Error("Failed to add network to wallet");
                }
            } else {
                throw switchError;
            }
        }
    }, []);

    // Get current network name
    const getCurrentNetwork = useCallback((): string | null => {
        if (!chainId) return null;

        for (const [key, config] of Object.entries(SUPPORTED_NETWORKS)) {
            if (config.chainId === chainId) {
                return key;
            }
        }

        return null;
    }, [chainId]);

    // Listen for account changes
    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                disconnect();
            } else {
                setAccount(accounts[0]);
            }
        };

        const handleChainChanged = (chainId: string) => {
            setChainId(chainId);
            // Reload provider and signer when chain changes
            if (window.ethereum) {
                const provider = new BrowserProvider(window.ethereum);
                provider.getSigner().then(setSigner);
                setProvider(provider);
            }
        };

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);

        return () => {
            if (window.ethereum && window.ethereum.removeListener) {
                window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
                window.ethereum.removeListener("chainChanged", handleChainChanged);
            }
        };
    }, [disconnect]);

    // Auto-connect if previously connected
    useEffect(() => {
        const autoConnect = async () => {
            if (!window.ethereum) return;

            try {
                const accounts = await window.ethereum.request({
                    method: "eth_accounts",
                });

                if (accounts && accounts.length > 0) {
                    await connect();
                }
            } catch (err) {
                console.error("Auto-connect failed:", err);
            }
        };

        autoConnect();
    }, [connect]);

    return {
        account,
        chainId,
        provider,
        signer,
        isConnecting,
        error,
        connect,
        disconnect,
        switchNetwork,
        getCurrentNetwork,
        detectWallets,
        isConnected: !!account,
    };
}
