"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Copy, Check, ExternalLink, RefreshCw, Loader2 } from "lucide-react";

interface ContractOverviewProps {
    network: string;
}

export default function ContractOverview({ network }: ContractOverviewProps) {
    const [copied, setCopied] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const networkDoc = useQuery(api.networkManagement.getNetwork, { network });
    const contractInfo = useAction(api.contractInfo.getContractInfoForNetwork);
    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContractInfo = async () => {
        if (!networkDoc?.contractAddress || !networkDoc.isActive) {
            setLoading(false);
            return;
        }

        setRefreshing(true);
        setError(null);
        try {
            const result = await contractInfo({ network });
            if (result.success) {
                setInfo(result.data);
            } else {
                setError(result.error || "Failed to fetch contract info");
            }
        } catch (err: any) {
            setError(err.message || "Error fetching contract info");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchContractInfo();
    }, [network, networkDoc]);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    if (!networkDoc) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-gray-500">Loading network configuration...</p>
            </div>
        );
    }

    if (!networkDoc.contractAddress || !networkDoc.isActive) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <p className="text-gray-500">Contract not deployed or network not active</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Contract Overview</h3>
                <button
                    onClick={fetchContractInfo}
                    disabled={refreshing || loading}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                    {refreshing || loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    Refresh
                </button>
            </div>

            {loading && !info && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {info && (
                <div className="space-y-4">
                    {/* Contract Address */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                            Contract Address
                        </label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono text-gray-900">
                                {networkDoc.contractAddress}
                            </code>
                            <button
                                onClick={() => copyToClipboard(networkDoc.contractAddress, "contract")}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {copied === "contract" ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                )}
                            </button>
                            <a
                                href={`${networkDoc.blockExplorer}/address/${networkDoc.contractAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                            </a>
                        </div>
                    </div>

                    {/* Owner Address */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                            Owner (Hot Wallet)
                        </label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono text-gray-900">
                                {info.owner}
                            </code>
                            <button
                                onClick={() => copyToClipboard(info.owner, "owner")}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {copied === "owner" ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                )}
                            </button>
                            <a
                                href={`${networkDoc.blockExplorer}/address/${info.owner}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                            </a>
                        </div>
                    </div>

                    {/* Status Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                                Status
                            </label>
                            <div className="px-3 py-2 bg-gray-50 rounded-lg">
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                                        info.paused
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-green-100 text-green-700"
                                    }`}
                                >
                                    {info.paused ? "⏸ Paused" : "▶ Active"}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                                Contract Balance
                            </label>
                            <div className="px-3 py-2 bg-gray-50 rounded-lg">
                                <span className="text-sm font-semibold text-gray-900">
                                    ${info.balance.toFixed(2)} USDT
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Configuration Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                                Hot Wallet %
                            </label>
                            <div className="px-3 py-2 bg-gray-50 rounded-lg">
                                <span className="text-sm font-semibold text-gray-900">
                                    {info.hotWalletPercentage.toFixed(2)}%
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
                                Low Balance Threshold
                            </label>
                            <div className="px-3 py-2 bg-gray-50 rounded-lg">
                                <span className="text-sm font-semibold text-gray-900">
                                    ${info.threshold.toFixed(2)} USDT
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="pt-4 border-t border-gray-200 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Cold Wallet</span>
                            <code className="text-gray-900 font-mono text-xs">
                                {info.coldWallet.substring(0, 10)}...{info.coldWallet.substring(34)}
                            </code>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">USDT Token</span>
                            <code className="text-gray-900 font-mono text-xs">
                                {info.usdtAddress.substring(0, 10)}...{info.usdtAddress.substring(34)}
                            </code>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Chain ID</span>
                            <span className="text-gray-900 font-medium">{networkDoc.chainId}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


