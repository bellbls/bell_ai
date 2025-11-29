"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const config = {
        success: {
            icon: <CheckCircle className="w-5 h-5" />,
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/50",
            text: "text-emerald-400",
            iconBg: "bg-emerald-500/20",
        },
        error: {
            icon: <XCircle className="w-5 h-5" />,
            bg: "bg-red-500/10",
            border: "border-red-500/50",
            text: "text-red-400",
            iconBg: "bg-red-500/20",
        },
        warning: {
            icon: <AlertCircle className="w-5 h-5" />,
            bg: "bg-yellow-500/10",
            border: "border-yellow-500/50",
            text: "text-yellow-400",
            iconBg: "bg-yellow-500/20",
        },
        info: {
            icon: <Info className="w-5 h-5" />,
            bg: "bg-blue-500/10",
            border: "border-blue-500/50",
            text: "text-blue-400",
            iconBg: "bg-blue-500/20",
        },
    };

    const style = config[type];

    return (
        <div
            className={`${style.bg} ${style.border} border backdrop-blur-md rounded-xl p-4 shadow-2xl animate-slide-in-right flex items-center gap-3 min-w-[300px] max-w-md`}
        >
            <div className={`${style.iconBg} ${style.text} p-2 rounded-lg`}>
                {style.icon}
            </div>
            <div className="flex-1">
                <p className={`${style.text} font-medium text-sm`}>{message}</p>
            </div>
            <button
                onClick={onClose}
                className={`${style.text} hover:opacity-70 transition-opacity`}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

interface ToastContainerProps {
    toasts: Array<{ id: string; message: string; type: ToastType }>;
    removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}
