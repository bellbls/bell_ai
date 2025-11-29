"use client";

import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { RefreshCw, ExternalLink, Loader2, Filter } from "lucide-react";

interface BlockchainEventsFeedProps {
    network: string;
}

type EventType = "deposit" | "withdrawal" | "forwarded" | "paused" | "resumed" | "low_balance";

export default function BlockchainEventsFeed({ network }: BlockchainEventsFeedProps) {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<EventType | "all">("all");
    const [autoRefresh, setAutoRefresh] = useState(false);

    const getEvents = useAction(api.contractInfo.getRecentEventsForNetwork);

    const fetchEvents = async () => {
        setRefreshing(true);
        setError(null);
        try {
            const result = await getEvents({ network, limit: 50 });
            if (result.success) {
                setEvents(result.events || []);
            } else {
                setError(result.error || "Failed to fetch events");
            }
        } catch (err: any) {
            setError(err.message || "Error fetching events");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [network]);

    // Auto-refresh every 30 seconds if enabled
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchEvents();
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh, network]);

    const filteredEvents = filter === "all" 
        ? events 
        : events.filter((e) => e.type === filter);

    const getEventIcon = (type: EventType) => {
        switch (type) {
            case "deposit":
                return "💰";
            case "withdrawal":
                return "💸";
            case "forwarded":
                return "➡️";
            case "paused":
                return "⏸️";
            case "resumed":
                return "▶️";
            case "low_balance":
                return "⚠️";
            default:
                return "📋";
        }
    };

    const getEventColor = (type: EventType) => {
        switch (type) {
            case "deposit":
                return "bg-green-50 border-green-200";
            case "withdrawal":
                return "bg-blue-50 border-blue-200";
            case "forwarded":
                return "bg-purple-50 border-purple-200";
            case "paused":
                return "bg-yellow-50 border-yellow-200";
            case "resumed":
                return "bg-green-50 border-green-200";
            case "low_balance":
                return "bg-red-50 border-red-200";
            default:
                return "bg-gray-50 border-gray-200";
        }
    };

    const formatEvent = (event: any) => {
        switch (event.type) {
            case "deposit":
                return `Deposit: $${event.amount.toFixed(2)} USDT from ${event.user.substring(0, 10)}...`;
            case "withdrawal":
                return `Withdrawal: $${event.amount.toFixed(2)} USDT to ${event.user.substring(0, 10)}...`;
            case "forwarded":
                return `Funds Forwarded: $${event.amount.toFixed(2)} USDT to ${event.to.substring(0, 10)}...`;
            case "paused":
                return `Deposits Paused by ${event.by.substring(0, 10)}...`;
            case "resumed":
                return `Deposits Resumed by ${event.by.substring(0, 10)}...`;
            case "low_balance":
                return `Low Balance Alert: $${event.currentBalance.toFixed(2)} < $${event.threshold.toFixed(2)}`;
            default:
                return "Unknown event";
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Live Events</h3>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded"
                        />
                        Auto-refresh
                    </label>
                    <button
                        onClick={fetchEvents}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {refreshing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="mb-4 flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-400" />
                <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        filter === "all"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                    All
                </button>
                {(["deposit", "withdrawal", "paused", "resumed", "low_balance"] as EventType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${
                            filter === type
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        {type.replace("_", " ")}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {!loading && filteredEvents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>No events found</p>
                </div>
            )}

            {!loading && filteredEvents.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredEvents.map((event, index) => (
                        <div
                            key={`${event.txHash}-${index}`}
                            className={`p-3 rounded-lg border ${getEventColor(event.type)}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 flex-1">
                                    <span className="text-lg">{getEventIcon(event.type)}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatEvent(event)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(event.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={`https://polygonscan.com/tx/${event.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 hover:bg-white/50 rounded transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4 text-gray-400" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


