"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CheckCircle, XCircle, Mail, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function VerifyEmail() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">("loading");
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [resending, setResending] = useState(false);

    const verifyEmail = useMutation((api as any)["auth/emailVerification"].verifyEmail);
    const resendVerification = useAction((api as any)["auth/emailVerification"].resendVerificationEmail);

    useEffect(() => {
        if (!token) {
            setStatus("no-token");
            setMessage("No verification token provided. Please check your email for the verification link.");
            return;
        }

        const verify = async () => {
            try {
                const result = await verifyEmail({ token });
                setStatus("success");
                setMessage(result.message || "Email verified successfully!");
            } catch (error: any) {
                setStatus("error");
                // Clean error message
                let errorMsg = error.message || "Verification failed";
                errorMsg = errorMsg
                    .replace(/Uncaught Error: /, "")
                    .replace(/Uncaught ConvexError: /, "");

                setMessage(errorMsg);
            }
        };

        verify();
    }, [token, verifyEmail]);

    const handleResend = async () => {
        if (!email) {
            alert("Please enter your email address");
            return;
        }

        setResending(true);
        try {
            await resendVerification({ email });
            alert("Verification email sent! Please check your inbox.");
            setEmail("");
        } catch (error: any) {
            let errorMsg = error.message || "Failed to resend email";
            errorMsg = errorMsg
                .replace(/Uncaught Error: /, "")
                .replace(/Uncaught ConvexError: /, "");
            alert(errorMsg);
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Email Verification</h1>
                    </div>

                    {/* Status */}
                    <div className="text-center">
                        {status === "loading" && (
                            <div className="space-y-4">
                                <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto" />
                                <p className="text-slate-400">Verifying your email...</p>
                            </div>
                        )}

                        {status === "success" && (
                            <div className="space-y-4">
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                                <div>
                                    <h2 className="text-xl font-bold text-green-500 mb-2">Success!</h2>
                                    <p className="text-slate-400 mb-6">{message}</p>
                                    <p className="text-sm text-slate-500 mb-6">
                                        Your email has been verified. You can now access all features.
                                    </p>
                                </div>
                                <Link
                                    href="/"
                                    className="inline-block w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all"
                                >
                                    Go to Dashboard
                                </Link>
                            </div>
                        )}

                        {status === "error" && (
                            <div className="space-y-4">
                                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                                <div>
                                    <h2 className="text-xl font-bold text-red-500 mb-2">Verification Failed</h2>
                                    <p className="text-slate-400 mb-4">{message}</p>

                                    {/* Helpful tips */}
                                    <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-left">
                                        <p className="text-sm text-slate-300 font-semibold mb-2">Common reasons:</p>
                                        <ul className="text-sm text-slate-400 space-y-1">
                                            <li>• Link has expired (valid for 24 hours)</li>
                                            <li>• Email already verified</li>
                                            <li>• Invalid or tampered link</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Resend Email Section */}
                                <div className="bg-slate-800/30 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-slate-400 mb-3">Need a new verification link?</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                                        />
                                        <button
                                            onClick={handleResend}
                                            disabled={resending}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {resending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="w-4 h-4" />
                                            )}
                                            Resend
                                        </button>
                                    </div>
                                </div>

                                <Link
                                    href="/"
                                    className="block w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                                >
                                    Back to Home
                                </Link>
                            </div>
                        )}

                        {status === "no-token" && (
                            <div className="space-y-4">
                                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
                                <div>
                                    <h2 className="text-xl font-bold text-yellow-500 mb-2">No Token Provided</h2>
                                    <p className="text-slate-400 mb-4">{message}</p>

                                    <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-left">
                                        <p className="text-sm text-slate-300 font-semibold mb-2">How to verify your email:</p>
                                        <ol className="text-sm text-slate-400 space-y-2">
                                            <li>1. Check your email inbox for our verification email</li>
                                            <li>2. Click the verification link in the email</li>
                                            <li>3. You'll be redirected here automatically</li>
                                        </ol>
                                    </div>
                                </div>

                                {/* Resend Email Section */}
                                <div className="bg-slate-800/30 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-slate-400 mb-3">Didn't receive the email?</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                                        />
                                        <button
                                            onClick={handleResend}
                                            disabled={resending}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {resending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="w-4 h-4" />
                                            )}
                                            Send
                                        </button>
                                    </div>
                                </div>

                                <Link
                                    href="/"
                                    className="block w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                                >
                                    Back to Home
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
