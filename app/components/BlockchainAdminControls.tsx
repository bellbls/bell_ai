"use client";

import { useState } from "react";
import { useWeb3Wallet } from "../hooks/useWeb3Wallet";
import { Contract, parseUnits } from "ethers";
import { Pause, Play, AlertTriangle, Settings, Loader2 } from "lucide-react";

interface BlockchainAdminControlsProps {
    network: string;
    contractAddress: string;
    decimals: number;
    blockExplorer: string;
}

// Contract ABI for admin functions
const ADMIN_ABI = [
    "function pauseDeposits() external",
    "function resumeDeposits() external",
    "function setLowBalanceThreshold(uint256 newThreshold) external",
    "function emergencyWithdraw() external",
    "function paused() external view returns (bool)",
];

export default function BlockchainAdminControls({
    network,
    contractAddress,
    decimals,
    blockExplorer,
}: BlockchainAdminControlsProps) {
    const { provider, signer, account, isConnected } = useWeb3Wallet();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [thresholdValue, setThresholdValue] = useState("");

    const executeAction = async (action: string, fn: () => Promise<any>) => {
        if (!signer || !isConnected) {
            setError("Please connect your wallet first");
            return;
        }

        setLoading(action);
        setError(null);
        setSuccess(null);

        try {
            const contract = new Contract(contractAddress, ADMIN_ABI, signer);
            const tx = await fn();
            const receipt = await tx.wait();

            setSuccess(`Transaction successful! Hash: ${receipt.hash}`);
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.message || "Transaction failed");
        } finally {
            setLoading(null);
        }
    };

    const handlePause = async () => {
        await executeAction("pause", async () => {
            const contract = new Contract(contractAddress, ADMIN_ABI, signer!);
            return contract.pauseDeposits();
        });
    };

    const handleResume = async () => {
        await executeAction("resume", async () => {
            const contract = new Contract(contractAddress, ADMIN_ABI, signer!);
            return contract.resumeDeposits();
        });
    };

    const handleUpdateThreshold = async () => {
        if (!thresholdValue || parseFloat(thresholdValue) <= 0) {
            setError("Please enter a valid threshold amount");
            return;
        }

        await executeAction("threshold", async () => {
            const contract = new Contract(contractAddress, ADMIN_ABI, signer!);
            const thresholdInWei = parseUnits(thresholdValue, decimals);
            return contract.setLowBalanceThreshold(thresholdInWei);
        });

        setThresholdValue("");
    };

    const handleEmergencyWithdraw = async () => {
        await executeAction("emergency", async () => {
            const contract = new Contract(contractAddress, ADMIN_ABI, signer!);
            return contract.emergencyWithdraw();
        });
        setShowEmergencyModal(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Admin Controls</h3>

            {!isConnected && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <p className="text-sm text-yellow-800">
                        Connect your wallet to perform admin actions
                    </p>
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <p className="text-sm text-green-600">{success}</p>
                </div>
            )}

            <div className="space-y-4">
                {/* Pause/Resume Controls */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900">Deposit Controls</h4>
                            <p className="text-xs text-gray-500 mt-1">
                                Pause or resume deposits on this network
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePause}
                            disabled={loading === "pause" || !isConnected}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading === "pause" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Pause className="w-4 h-4" />
                            )}
                            Pause Deposits
                        </button>
                        <button
                            onClick={handleResume}
                            disabled={loading === "resume" || !isConnected}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading === "resume" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            Resume Deposits
                        </button>
                    </div>
                </div>

                {/* Update Threshold */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">Low Balance Threshold</h4>
                        <p className="text-xs text-gray-500">
                            Update the threshold for low balance alerts
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={thresholdValue}
                            onChange={(e) => setThresholdValue(e.target.value)}
                            placeholder="500.00"
                            step="0.01"
                            min="0"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleUpdateThreshold}
                            disabled={loading === "threshold" || !isConnected || !thresholdValue}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading === "threshold" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Settings className="w-4 h-4" />
                            )}
                            Update
                        </button>
                    </div>
                </div>

                {/* Emergency Withdraw */}
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <h4 className="text-sm font-semibold text-red-900">Emergency Withdraw</h4>
                        </div>
                        <p className="text-xs text-red-700">
                            Withdraw all funds to cold wallet. Use only in emergencies.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowEmergencyModal(true)}
                        disabled={!isConnected}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Emergency Withdraw
                    </button>
                </div>

                {/* View Contract Link */}
                <div className="pt-4 border-t border-gray-200">
                    <a
                        href={`${blockExplorer}/address/${contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        View Contract on Explorer
                    </a>
                </div>
            </div>

            {/* Emergency Withdraw Modal */}
            {showEmergencyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Emergency Withdraw</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-6">
                            This will withdraw all funds from the contract to the cold wallet. 
                            Only use this in case of emergency or contract vulnerability.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEmergencyModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEmergencyWithdraw}
                                disabled={loading === "emergency"}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading === "emergency" ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </span>
                                ) : (
                                    "Confirm Withdraw"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


