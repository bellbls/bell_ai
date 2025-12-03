"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CryptoData {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    price_change_percentage_24h: number;
    market_cap: number;
    total_volume: number;
    sparkline_in_7d: {
        price: number[];
    };
}

export function CryptoPriceTicker() {
    const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const fetchCryptoData = async () => {
        try {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(
                "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&sparkline=true&price_change_percentage=24h",
                {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                    }
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                // Handle specific HTTP errors
                if (response.status === 429) {
                    throw new Error("Rate limit exceeded. Please try again later.");
                } else if (response.status >= 500) {
                    throw new Error("Service temporarily unavailable. Please try again later.");
                } else {
                    throw new Error(`Failed to fetch crypto data (${response.status})`);
                }
            }

            const data = await response.json();
            
            // Validate data structure
            if (!Array.isArray(data)) {
                throw new Error("Invalid data format received");
            }

            setCryptoData(data);
            setLoading(false);
            setError(null);
            setRetryCount(0); // Reset retry count on success
        } catch (err: any) {
            console.error("Error fetching crypto data:", err);
            
            // Provide user-friendly error messages
            let errorMessage = "Failed to load crypto prices";
            if (err.name === "AbortError") {
                errorMessage = "Request timed out. Please check your connection.";
            } else if (err.message) {
                errorMessage = err.message;
            } else if (err instanceof TypeError && err.message.includes("fetch")) {
                errorMessage = "Network error. Please check your internet connection.";
            }
            
            setError(errorMessage);
            setLoading(false);
            
            // Auto-retry up to 3 times with exponential backoff
            if (retryCount < 3) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                    fetchCryptoData();
                }, delay);
            }
        }
    };

    useEffect(() => {
        fetchCryptoData();

        // Refresh every 60 seconds
        const interval = setInterval(() => {
            fetchCryptoData();
        }, 60000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatPrice = (price: number) => {
        if (price < 0.01) {
            return `$${price.toFixed(8)}`;
        } else if (price < 1) {
            return `$${price.toFixed(4)}`;
        } else {
            return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    };

    const formatMarketCap = (cap: number) => {
        if (cap >= 1e12) {
            return `$${(cap / 1e12).toFixed(2)}T`;
        } else if (cap >= 1e9) {
            return `$${(cap / 1e9).toFixed(2)}B`;
        } else if (cap >= 1e6) {
            return `$${(cap / 1e6).toFixed(2)}M`;
        }
        return `$${cap.toLocaleString()}`;
    };

    const formatVolume = (volume: number) => {
        if (volume >= 1e9) {
            return `$${(volume / 1e9).toFixed(2)}B`;
        } else if (volume >= 1e6) {
            return `$${(volume / 1e6).toFixed(2)}M`;
        }
        return `$${volume.toLocaleString()}`;
    };

    const MiniSparkline = ({ data }: { data: number[] }) => {
        if (!data || data.length === 0) return null;

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min;

        const points = data.map((price, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((price - min) / range) * 100;
            return `${x},${y}`;
        }).join(" ");

        const isPositive = data[data.length - 1] > data[0];

        return (
            <svg width="120" height="50" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                <defs>
                    <linearGradient id={`gradient-${isPositive ? 'up' : 'down'}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polyline
                    points={`0,100 ${points} 100,100`}
                    fill={`url(#gradient-${isPositive ? 'up' : 'down'})`}
                    stroke="none"
                />
                <polyline
                    points={points}
                    fill="none"
                    stroke={isPositive ? "#10b981" : "#ef4444"}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        );
    };

    if (loading) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold mb-4">Live Crypto Prices</h3>
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-400">Loading crypto prices...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold mb-4">Live Crypto Prices</h3>
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="text-red-400 text-center">{error}</div>
                    {retryCount < 3 && (
                        <div className="text-slate-400 text-sm">Retrying... ({retryCount + 1}/3)</div>
                    )}
                    {retryCount >= 3 && (
                        <button
                            onClick={() => {
                                setRetryCount(0);
                                setError(null);
                                setLoading(true);
                                fetchCryptoData();
                            }}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                        >
                            Retry
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
            {/* Table Header - Hidden on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-4 items-center mb-4 pb-3 border-b border-slate-700">
                <div className="col-span-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Crypto
                </div>
                <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                    Last Price
                </div>
                <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                    24h Change
                </div>
                <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
                    Trends
                </div>
                <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                    Market Cap
                </div>
                <div className="col-span-1 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                    24h Vol
                </div>
            </div>

            <div className="space-y-3">
                {cryptoData.map((crypto) => {
                    const isPositive = crypto.price_change_percentage_24h > 0;

                    return (
                        <div
                            key={crypto.id}
                            className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800 transition-all duration-200 border border-slate-700/50"
                        >
                            {/* Mobile Layout */}
                            <div className="block md:hidden space-y-4">
                                {/* Row 1: Icon, Name, Symbol */}
                                <div className="flex items-center gap-3">
                                    <img
                                        src={crypto.image}
                                        alt={crypto.name}
                                        className="w-12 h-12 rounded-full"
                                    />
                                    <div>
                                        <div className="font-bold text-white text-lg">{crypto.name}</div>
                                        <div className="text-sm text-slate-400 uppercase">{crypto.symbol}</div>
                                    </div>
                                </div>

                                {/* Row 2: Price and Change */}
                                <div className="flex items-center justify-between">
                                    <div className="font-bold text-white text-2xl">
                                        {formatPrice(crypto.current_price)}
                                    </div>
                                    <div className={`flex items-center gap-1 text-base font-bold px-3 py-1 rounded-lg ${isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                        }`}>
                                        {isPositive ? (
                                            <TrendingUp className="w-4 h-4" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4" />
                                        )}
                                        {isPositive ? "+" : ""}{crypto.price_change_percentage_24h.toFixed(2)}%
                                    </div>
                                </div>

                                {/* Row 3: Chart */}
                                <div className="flex justify-center py-2">
                                    <MiniSparkline data={crypto.sparkline_in_7d.price} />
                                </div>

                                {/* Row 4: Market Cap and Volume */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                                    <div>
                                        <div className="text-xs text-slate-500">Market Cap</div>
                                        <div className="font-bold text-white text-sm">
                                            {formatMarketCap(crypto.market_cap)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500">24h Volume</div>
                                        <div className="font-bold text-white text-sm">
                                            {formatVolume(crypto.total_volume)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                                {/* Crypto Icon & Name */}
                                <div className="col-span-3 flex items-center gap-3">
                                    <img
                                        src={crypto.image}
                                        alt={crypto.name}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div>
                                        <div className="font-bold text-white text-sm">{crypto.name}</div>
                                        <div className="text-xs text-slate-400 uppercase">{crypto.symbol}</div>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="col-span-2 text-right">
                                    <div className="font-bold text-white text-sm">
                                        {formatPrice(crypto.current_price)}
                                    </div>
                                </div>

                                {/* 24h Change */}
                                <div className="col-span-2 text-right">
                                    <div className={`flex items-center justify-end gap-1 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"
                                        }`}>
                                        {isPositive ? (
                                            <TrendingUp className="w-3 h-3" />
                                        ) : (
                                            <TrendingDown className="w-3 h-3" />
                                        )}
                                        {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                                    </div>
                                </div>

                                {/* Mini Chart */}
                                <div className="col-span-2 flex justify-center">
                                    <MiniSparkline data={crypto.sparkline_in_7d.price} />
                                </div>

                                {/* Market Cap */}
                                <div className="col-span-2 text-right">
                                    <div className="font-medium text-white text-sm">
                                        {formatMarketCap(crypto.market_cap)}
                                    </div>
                                </div>

                                {/* 24h Volume */}
                                <div className="col-span-1 text-right">
                                    <div className="font-medium text-white text-sm">
                                        {formatVolume(crypto.total_volume)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
