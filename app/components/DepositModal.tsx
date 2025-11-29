"use client";

import { useState, useEffect } from "react";
import { X, Wallet, AlertCircle, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useWeb3Wallet, SUPPORTED_NETWORKS } from "../hooks/useWeb3Wallet";
import { useDepositContract, NETWORK_CONTRACTS } from "../hooks/useDepositContract";

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type DepositStep = "connect" | "select-network" | "enter-amount" | "approve" | "deposit" | "success";

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
    const {
        account,
        isConnecting,
        error: walletError,
        connect,
        disconnect,
        switchNetwork,
        getCurrentNetwork,
        detectWallets,
        isConnected,
    } = useWeb3Wallet();

    const currentNetwork = getCurrentNetwork();
    const { provider, signer } = useWeb3Wallet();

    const {
        checkBalance,
        checkAllowance,
        approveUSDT,
        deposit,
        needsApproval,
        isApproving,
        isDepositing,
        error: contractError,
        networkConfig,
    } = useDepositContract(provider, signer, currentNetwork);

    const [step, setStep] = useState<DepositStep>("connect");
    const [selectedNetwork, setSelectedNetwork] = useState<string>("polygon");
    const [amount, setAmount] = useState<string>("");
    const [balance, setBalance] = useState<string>("0");
    const [allowance, setAllowance] = useState<string>("0");
    const [txHash, setTxHash] = useState<string>("");
    const [error, setError] = useState<string>("");

    // Get minimum deposit amount from config
    const minDepositAmount = useQuery(api.configs.getMinDepositAmount) ?? 10;

    // Detect wallets on mount
    const installedWallets = detectWallets();

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep(isConnected ? "select-network" : "connect");
            setAmount("");
            setTxHash("");
            setError("");
        }
    }, [isOpen, isConnected]);

    // Update balance and allowance when account or network changes
    useEffect(() => {
        if (account && currentNetwork) {
            checkBalance(account)
                .then(setBalance)
                .catch((err) => console.error("Failed to fetch balance:", err));

            checkAllowance(account)
                .then(setAllowance)
                .catch((err) => console.error("Failed to fetch allowance:", err));
        }
    }, [account, currentNetwork, checkBalance, checkAllowance]);

    // Handle wallet connection
    const handleConnect = async () => {
        try {
            setError("");
            await connect();
            setStep("select-network");
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Handle network selection
    const handleNetworkSelect = async (network: string) => {
        try {
            setError("");
            setSelectedNetwork(network);
            await switchNetwork(network);
            setStep("enter-amount");
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Handle amount submission
    const handleAmountSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        const amountNum = parseFloat(amount);
        
        // Check minimum deposit requirement
        if (amountNum < minDepositAmount) {
            setError(`Minimum deposit amount is $${minDepositAmount.toFixed(2)} USDT`);
            return;
        }

        if (amountNum > parseFloat(balance)) {
            setError("Insufficient USDT balance");
            return;
        }

        try {
            setError("");
            const needApproval = await needsApproval(account!, amount);

            if (needApproval) {
                setStep("approve");
            } else {
                setStep("deposit");
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Handle USDT approval
    const handleApprove = async () => {
        try {
            setError("");
            const hash = await approveUSDT(amount);
            console.log("Approval successful:", hash);
            setStep("deposit");
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Handle deposit
    const handleDeposit = async () => {
        // Final validation before sending to blockchain
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        const amountNum = parseFloat(amount);
        
        // Enforce minimum deposit requirement - this is the final check before blockchain transaction
        if (amountNum < minDepositAmount) {
            setError(`Minimum deposit amount is $${minDepositAmount.toFixed(2)} USDT. Please enter at least $${minDepositAmount.toFixed(2)}.`);
            return;
        }

        // Ensure amount doesn't exceed balance
        if (amountNum > parseFloat(balance)) {
            setError("Insufficient USDT balance");
            return;
        }

        try {
            setError("");
            // Send exact amount to blockchain - the amount variable contains what user entered
            const hash = await deposit(amount);
            setTxHash(hash);
            setStep("success");
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Get block explorer URL
    const getExplorerUrl = (txHash: string): string => {
        if (!currentNetwork) return "";
        const network = SUPPORTED_NETWORKS[currentNetwork];
        return `${network.blockExplorerUrls[0]}/tx/${txHash}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Deposit USDT</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Error Display */}
                    {(error || walletError || contractError) && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800">{error || walletError || contractError}</p>
                        </div>
                    )}

                    {/* Step 1: Connect Wallet */}
                    {step === "connect" && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <Wallet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Connect Your Wallet
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Connect your Web3 wallet to start depositing
                                </p>
                            </div>

                            {installedWallets.length > 0 ? (
                                <div className="space-y-3">
                                    {installedWallets.map((wallet) => (
                                        <button
                                            key={wallet.name}
                                            onClick={handleConnect}
                                            disabled={isConnecting}
                                            className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
                                        >
                                            <span className="text-2xl">{wallet.icon}</span>
                                            <span className="font-medium text-gray-900">{wallet.name}</span>
                                            {isConnecting && <Loader2 className="w-5 h-5 animate-spin ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm text-gray-600 mb-4">
                                        No Web3 wallet detected
                                    </p>
                                    <a
                                        href="https://metamask.io/download/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                    >
                                        Install MetaMask →
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Select Network */}
                    {step === "select-network" && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Select Network
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Choose which blockchain network to deposit from
                                </p>
                            </div>

                            <div className="space-y-3">
                                {Object.entries(SUPPORTED_NETWORKS).map(([key, network]) => (
                                    <button
                                        key={key}
                                        onClick={() => handleNetworkSelect(key)}
                                        className={`w-full flex items-center justify-between p-4 border-2 rounded-lg transition-all ${currentNetwork === key
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="text-left">
                                            <div className="font-semibold text-gray-900">{network.chainName}</div>
                                            <div className="text-xs text-gray-500">
                                                {network.nativeCurrency.symbol}
                                            </div>
                                        </div>
                                        {currentNetwork === key && (
                                            <CheckCircle className="w-5 h-5 text-blue-600" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Enter Amount */}
                    {step === "enter-amount" && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Enter Amount
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    How much USDT would you like to deposit?
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Your Balance</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {parseFloat(balance).toFixed(2)} USDT
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Minimum Deposit</span>
                                    <span className="text-sm font-semibold text-blue-600">
                                        ${minDepositAmount.toFixed(2)} USDT
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Network</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {currentNetwork && SUPPORTED_NETWORKS[currentNetwork].chainName}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                    Amount (USDT)
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-3 sm:px-4 py-3 text-base sm:text-lg border-2 border-theme-secondary dark:border-gray-200 light:border-gray-300 rounded-lg focus:border-blue-500 dark:focus:border-blue-500 light:focus:border-indigo-500 focus:outline-none font-semibold bg-theme-tertiary dark:bg-white light:bg-white text-theme-primary"
                                    step="0.01"
                                    min={minDepositAmount}
                                />
                                <div className="mt-2 flex items-center justify-between">
                                    <button
                                        onClick={() => setAmount(balance)}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Use Max
                                    </button>
                                    <span className="text-xs text-gray-500">
                                        Minimum: ${minDepositAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleAmountSubmit}
                                disabled={!amount || parseFloat(amount) <= 0}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    {/* Step 4: Approve USDT */}
                    {step === "approve" && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Approve USDT
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    You need to approve the contract to spend your USDT. This is a one-time action.
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Amount</span>
                                    <span className="text-sm font-semibold text-gray-900">{amount} USDT</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Network</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {currentNetwork && SUPPORTED_NETWORKS[currentNetwork].chainName}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleApprove}
                                disabled={isApproving}
                                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isApproving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Approving...
                                    </>
                                ) : (
                                    "Approve USDT"
                                )}
                            </button>
                        </div>
                    )}

                    {/* Step 5: Deposit */}
                    {step === "deposit" && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Wallet className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Confirm Deposit
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Review your deposit details and confirm the transaction
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Amount</span>
                                    <span className="text-sm font-semibold text-gray-900">{amount} USDT</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Network</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {currentNetwork && SUPPORTED_NETWORKS[currentNetwork].chainName}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">To Hot Wallet (2.5%)</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {(parseFloat(amount) * 0.025).toFixed(2)} USDT
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">To Cold Wallet (97.5%)</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {(parseFloat(amount) * 0.975).toFixed(2)} USDT
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleDeposit}
                                disabled={isDepositing}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDepositing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    "Confirm Deposit"
                                )}
                            </button>
                        </div>
                    )}

                    {/* Step 6: Success */}
                    {step === "success" && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Deposit Successful!
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Your deposit has been submitted. Your balance will be updated shortly.
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Amount</span>
                                    <span className="text-sm font-semibold text-gray-900">{amount} USDT</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Network</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {currentNetwork && SUPPORTED_NETWORKS[currentNetwork].chainName}
                                    </span>
                                </div>
                            </div>

                            {txHash && (
                                <a
                                    href={getExplorerUrl(txHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                                >
                                    View on Explorer
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer - Connected Account */}
                {isConnected && account && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-2xl">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Connected:</span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-gray-900">
                                    {account.slice(0, 6)}...{account.slice(-4)}
                                </span>
                                <button
                                    onClick={disconnect}
                                    className="text-red-600 hover:text-red-700 font-medium"
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
