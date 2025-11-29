"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Edit, X, Check } from "lucide-react";

interface NetworkStatusProps {
    userId: Id<"users">;
    isAdmin: boolean;
}

export default function NetworkStatusDashboard({ userId, isAdmin }: NetworkStatusProps) {
    const [pausingNetwork, setPausingNetwork] = useState<string | null>(null);
    const [editingNetwork, setEditingNetwork] = useState<string | null>(null);
    const [editContractAddress, setEditContractAddress] = useState<string>("");
    const [editIsActive, setEditIsActive] = useState<boolean>(false);
    const [saving, setSaving] = useState(false);

    // Queries
    const networks = useQuery(api.networkManagement.getAllNetworks, {});
    const balances = useQuery(api.networkManagement.getNetworkBalances, {});
    const unreadAlertsCount = useQuery(api.adminAlerts.getUnreadAlertsCount, {});

    // Mutations
    const pauseNetwork = useMutation(api.networkManagement.pauseNetwork);
    const resumeNetwork = useMutation(api.networkManagement.resumeNetwork);
    const updateNetwork = useMutation(api.networkManagement.updateNetwork);

    if (!isAdmin) {
        return null;
    }

    const handlePauseToggle = async (network: string, isPaused: boolean) => {
        setPausingNetwork(network);
        try {
            if (isPaused) {
                await resumeNetwork({ network });
            } else {
                if (confirm(`Are you sure you want to pause deposits on ${network.toUpperCase()}?`)) {
                    await pauseNetwork({ network });
                }
            }
        } catch (error) {
            console.error("Error toggling network:", error);
            alert("Failed to update network status");
        } finally {
            setPausingNetwork(null);
        }
    };

    const getNetworkBalance = (networkName: string) => {
        return balances?.find((b: any) => b.network === networkName);
    };

    const handleEditClick = (network: any) => {
        setEditingNetwork(network.network);
        setEditContractAddress(network.contractAddress || "");
        setEditIsActive(network.isActive);
    };

    const handleSaveEdit = async () => {
        if (!editingNetwork) return;

        // Validate contract address format (basic check)
        if (editContractAddress && !/^0x[a-fA-F0-9]{40}$/.test(editContractAddress)) {
            alert("Invalid contract address format. Must be a valid Ethereum address (0x followed by 40 hex characters).");
            return;
        }

        setSaving(true);
        try {
            await updateNetwork({
                network: editingNetwork,
                contractAddress: editContractAddress || undefined,
                isActive: editIsActive,
            });
            alert("Network updated successfully!");
            setEditingNetwork(null);
            setEditContractAddress("");
            setEditIsActive(false);
        } catch (error: any) {
            alert(`Failed to update network: ${error.message || "Unknown error"}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingNetwork(null);
        setEditContractAddress("");
        setEditIsActive(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Network Status</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Monitor and control blockchain networks
                    </p>
                </div>
                {unreadAlertsCount !== undefined && unreadAlertsCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-red-900">
                            {unreadAlertsCount} unread alert{unreadAlertsCount !== 1 ? "s" : ""}
                        </span>
                    </div>
                )}
            </div>

            {/* Network Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {networks?.map((network) => {
                    const balance = getNetworkBalance(network.network);
                    const isLow = balance?.isLow || false;
                    const isPausing = pausingNetwork === network.network;

                    return (
                        <div
                            key={network.network}
                            className={`bg-white rounded-xl shadow-sm border-2 transition-all ${network.isPaused
                                ? "border-yellow-300 bg-yellow-50"
                                : network.isActive
                                    ? "border-green-300"
                                    : "border-gray-200"
                                }`}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${network.network === "polygon"
                                                ? "bg-purple-600"
                                                : network.network === "bsc"
                                                    ? "bg-yellow-500"
                                                    : "bg-blue-600"
                                                }`}
                                        >
                                            {network.network === "polygon"
                                                ? "P"
                                                : network.network === "bsc"
                                                    ? "B"
                                                    : "A"}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {network.name}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                Chain ID: {network.chainId}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {network.isActive ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                                Inactive
                                            </span>
                                        )}
                                        {network.isPaused && (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                                Paused
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Balance */}
                                <div className="space-y-2">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-sm text-gray-600">Hot Wallet Balance</span>
                                        {balance?.lastCheck && (
                                            <span className="text-xs text-gray-400">
                                                {new Date(balance.lastCheck).toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span
                                            className={`text-3xl font-bold ${isLow ? "text-red-600" : "text-gray-900"
                                                }`}
                                        >
                                            ${(balance?.balance || 0).toFixed(2)}
                                        </span>
                                        {isLow && (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                                                LOW
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>Threshold: ${balance?.threshold || 500}</span>
                                        {balance && (
                                            <span>
                                                • {((balance.balance / balance.threshold) * 100).toFixed(0)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="p-6 space-y-3">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Contract</span>
                                        <span className="font-mono text-xs text-gray-900">
                                            {network.contractAddress
                                                ? `${network.contractAddress.substring(0, 6)}...${network.contractAddress.substring(38)}`
                                                : "Not deployed"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">USDT Decimals</span>
                                        <span className="font-medium text-gray-900">{network.decimals}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">RPC Status</span>
                                        <span className="text-green-600 font-medium">Connected</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-4 space-y-2">
                                    <button
                                        onClick={() => handleEditClick(network)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit Network
                                    </button>
                                    {network.isActive && (
                                        <button
                                            onClick={() => handlePauseToggle(network.network, network.isPaused)}
                                            disabled={isPausing}
                                            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${network.isPaused
                                                ? "bg-green-600 hover:bg-green-700 text-white"
                                                : "bg-yellow-600 hover:bg-yellow-700 text-white"
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {isPausing
                                                ? "Processing..."
                                                : network.isPaused
                                                    ? "Resume Deposits"
                                                    : "Pause Deposits"}
                                        </button>
                                    )}
                                    {network.contractAddress && (
                                        <a
                                            href={`${network.blockExplorer}/address/${network.contractAddress}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-center transition-colors"
                                        >
                                            View on Explorer →
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-sm text-gray-600 mb-1">Total Networks</div>
                    <div className="text-2xl font-bold text-gray-900">{networks?.length || 0}</div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-sm text-gray-600 mb-1">Active Networks</div>
                    <div className="text-2xl font-bold text-green-600">
                        {networks?.filter((n: any) => n.isActive).length || 0}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-sm text-gray-600 mb-1">Total Balance</div>
                    <div className="text-2xl font-bold text-gray-900">
                        ${balances?.reduce((sum, b) => sum + b.balance, 0).toFixed(2) || "0.00"}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="text-sm text-gray-600 mb-1">Low Balance Alerts</div>
                    <div className="text-2xl font-bold text-red-600">
                        {balances?.filter((b: any) => b.isLow).length || 0}
                    </div>
                </div>
            </div>

            {/* Edit Network Modal */}
            {editingNetwork && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">
                                Edit Network: {networks?.find((n: any) => n.network === editingNetwork)?.name}
                            </h3>
                            <button
                                onClick={handleCancelEdit}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contract Address
                                </label>
                                <input
                                    type="text"
                                    value={editContractAddress}
                                    onChange={(e) => setEditContractAddress(e.target.value)}
                                    placeholder="0x..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Enter the deployed VaultForwarder contract address
                                </p>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editIsActive}
                                        onChange={(e) => setEditIsActive(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Activate Network
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500 mt-1 ml-6">
                                    Enable this network for deposits
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleCancelEdit}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Save
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
