"use client";

import { X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: "danger" | "warning" | "info";
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    type = "info",
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const typeConfig = {
        danger: {
            confirmBg: "bg-red-600 hover:bg-red-700",
            titleColor: "text-red-400",
        },
        warning: {
            confirmBg: "bg-yellow-600 hover:bg-yellow-700",
            titleColor: "text-yellow-400",
        },
        info: {
            confirmBg: "bg-purple-600 hover:bg-purple-700",
            titleColor: "text-purple-400",
        },
    };

    const config = typeConfig[type];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h3 className={`text-lg font-bold ${config.titleColor}`}>{title}</h3>
                    <button
                        onClick={onCancel}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-slate-300">{message}</p>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-slate-800">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onCancel();
                        }}
                        className={`flex-1 py-3 px-4 ${config.confirmBg} rounded-xl font-bold transition-all`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
