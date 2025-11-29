"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, Check } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface NotificationBellProps {
    userId: Id<"users">;
}

export function NotificationBell({ userId }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const notifications = useQuery(api.notifications.getUserNotifications, { userId, limit: 5 });
    const unreadCount = useQuery(api.notifications.getUnreadCount, { userId });
    const markAsRead = useMutation(api.notifications.markAsRead);
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = async (notificationId: Id<"notifications">) => {
        await markAsRead({ notificationId });
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead({ userId });
    };

    const getIconComponent = (iconName: string) => {
        // Map icon names to actual components
        const icons: Record<string, any> = {
            DollarSign: "💰",
            Gift: "🎁",
            Users: "👥",
            Award: "🏆",
            TrendingUp: "📈",
            Info: "ℹ️",
        };
        return icons[iconName] || "🔔";
    };

    const getRelativeTime = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors"
            >
                <Bell className="w-6 h-6" />
                {unreadCount && unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 animate-scale-in">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-800">
                        <h3 className="font-bold text-lg">Notifications</h3>
                        {unreadCount && unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                                <Check className="w-4 h-4" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications && notifications.length > 0 ? (
                            notifications.map((notification: any) => (
                                <div
                                    key={notification._id}
                                    onClick={() => handleNotificationClick(notification._id)}
                                    className={`p-4 border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors ${!notification.read ? "bg-purple-500/5" : ""
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="text-2xl">{getIconComponent(notification.icon)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="font-semibold text-sm text-white">{notification.title}</h4>
                                                {!notification.read && (
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1" />
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{notification.message}</p>
                                            <span className="text-xs text-slate-500 mt-2 block">
                                                {getRelativeTime(notification.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No notifications yet</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications && notifications.length > 0 && (
                        <div className="p-3 border-t border-slate-800 text-center">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    // Navigate to notifications page - implement this based on your routing
                                }}
                                className="text-sm text-purple-400 hover:text-purple-300"
                            >
                                View all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
