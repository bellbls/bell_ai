"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Shield, CheckCircle2, XCircle, Copy, Loader2 } from "lucide-react";

interface TwoFactorSetupProps {
    userId: string;
    onComplete?: () => void;
    onCancel?: () => void;
}

export default function TwoFactorSetup({ userId, onComplete, onCancel }: TwoFactorSetupProps) {
    const [step, setStep] = useState<"setup" | "verify">("setup");
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const setup2FA = useAction(api.twoFactorActions.setup2FA);
    const verify2FASetup = useAction(api.twoFactorActions.verify2FASetup);

    const handleSetup = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await setup2FA({ userId: userId as any });
            setQrCodeDataUrl(result.qrCodeDataUrl);
            setSecret(result.secret);
            setStep("verify");
        } catch (err: any) {
            setError(err.message || "Failed to set up 2FA. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (verificationCode.length !== 6) {
            setError("Please enter a 6-digit code");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await verify2FASetup({
                userId: userId as any,
                code: verificationCode,
            });
            setSuccess(true);
            setTimeout(() => {
                onComplete?.();
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Invalid code. Please try again.");
            setVerificationCode("");
        } finally {
            setLoading(false);
        }
 };

    const copySecret = () => {
        if (secret) {
            navigator.clipboard.writeText(secret);
            // You could add a toast notification here
        }
    };

    if (success) {
        return (
            <div className="bg-slate-900 rounded-xl p-8 border border-slate-800">
                <div className="text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">2FA Enabled Successfully!</h3>
                    <p className="text-slate-400">
                        Two-factor authentication has been enabled for your account.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-indigo-400" />
                <h2 className="text-2xl font-bold text-white">Set Up Two-Factor Authentication</h2>
            </div>

            {step === "setup" && (
                <div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-slate-300 text-sm mb-4">
                            To set up 2FA, you'll need to:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-400">
                            <li>Install Google Authenticator (or similar app) on your phone</li>
                            <li>Scan the QR code that will be displayed</li>
                            <li>Enter the 6-digit code from the app to verify</li>
                        </ol>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleSetup}
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Setting up...
                            </>
                        ) : (
                            <>
                                <Shield className="w-5 h-5" />
                                Generate QR Code
                            </>
                        )}
                    </button>

                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="w-full text-slate-400 hover:text-slate-300 py-2 text-sm"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            )}

            {step === "verify" && qrCodeDataUrl && (
                <div className="space-y-6">
                    <div className="text-center">
                        <p className="text-slate-300 mb-4">
                            Scan this QR code with your authenticator app:
                        </p>
                        <div className="bg-white p-4 rounded-lg inline-block">
                            <img
                                src={qrCodeDataUrl}
                                alt="2FA QR Code"
                                className="w-48 h-48"
                            />
                        </div>
                    </div>

                    {secret && (
                        <div className="bg-slate-800/50 rounded-lg p-4">
                            <p className="text-slate-400 text-sm mb-2">
                                Or enter this secret key manually:
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-sm text-slate-300 font-mono break-all">
                                    {secret}
                                </code>
                                <button
                                    onClick={copySecret}
                                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                                    title="Copy secret"
                                >
                                    <Copy className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Enter 6-digit code from your app
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                setVerificationCode(value);
                                setError(null);
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="000000"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleVerify}
                            disabled={loading || verificationCode.length !== 6}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Verify & Enable
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setStep("setup");
                                setVerificationCode("");
                                setError(null);
                            }}
                            className="px-4 py-3 text-slate-400 hover:text-slate-300 text-sm"
                        >
                            Back
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

