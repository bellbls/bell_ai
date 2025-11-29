"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Lock, CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { PasswordStrengthIndicator } from "../../components/PasswordStrengthIndicator";
import { getClientInfo } from "../../lib/security";

export default function ResetPassword() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const resetPassword = useMutation((api as any)["auth/passwordReset"].resetPassword);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("No reset token provided. Please request a new password reset link.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        if (!token) {
            setError("Invalid reset token");
            return;
        }

        setStatus("loading");

        try {
            const clientInfo = await getClientInfo();
            const result = await resetPassword({
                token,
                newPassword,
                ...clientInfo,
            });

            setStatus("success");
            setMessage(result.message || "Password reset successfully!");
        } catch (error: any) {
            setStatus("error");
            setMessage(error.message || "Failed to reset password. The link may be expired or invalid.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
                        <p className="text-slate-400 text-sm">Enter your new password below</p>
                    </div>

                    {status === "success" ? (
                        <div className="text-center space-y-4">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                            <div>
                                <h2 className="text-xl font-bold text-green-500 mb-2">Success!</h2>
                                <p className="text-slate-400 mb-6">{message}</p>
                            </div>
                            <Link
                                href="/"
                                className="inline-block w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all"
                            >
                                Go to Login
                            </Link>
                        </div>
                    ) : status === "error" && !token ? (
                        <div className="text-center space-y-4">
                            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                            <div>
                                <h2 className="text-xl font-bold text-red-500 mb-2">Invalid Link</h2>
                                <p className="text-slate-400 mb-6">{message}</p>
                            </div>
                            <Link
                                href="/"
                                className="block w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                            >
                                Back to Home
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                                    <XCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {message && status === "error" && (
                                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                                    <XCircle className="w-4 h-4 shrink-0" />
                                    <span>{message}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="w-full p-3 pr-12 bg-slate-800/50 rounded-xl border border-slate-700 focus:border-purple-500 outline-none transition-all"
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {newPassword && (
                                    <PasswordStrengthIndicator password={newPassword} showRequirements={true} />
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    Confirm Password
                                </label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full p-3 bg-slate-800/50 rounded-xl border border-slate-700 focus:border-purple-500 outline-none transition-all"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={status === "loading"}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {status === "loading" ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Resetting...
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </button>

                            <Link
                                href="/"
                                className="block text-center text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                Back to Login
                            </Link>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
