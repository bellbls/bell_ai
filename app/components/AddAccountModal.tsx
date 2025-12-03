"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { AccountProvider, useAccount } from "../contexts/AccountContext";
import { Id } from "../convex/_generated/dataModel";

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    loginId?: Id<"logins"> | null;
}

function AddAccountModalContent({ isOpen, onClose, loginId }: AddAccountModalProps) {
    const { login: authLogin, register: authRegister, loginId: currentLoginId } = useAuth();
    const { refreshAccounts } = useAccount();
    
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [referralCode, setReferralCode] = useState("");
    const [error, setError] = useState("");
    // Always default to login mode
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (isLogin) {
                // Login with existing credentials (switches to that login)
                const result = await authLogin({ email, password });
                
                if (result && typeof result === "object" && "requires2FA" in result && result.requires2FA) {
                    setError("2FA is required. Please complete 2FA verification first, then add an account.");
                    setIsLoading(false);
                    return;
                }

                // If login successful, the useAuth hook already handles storing the new loginId
                // Wait a bit to ensure localStorage is fully updated, then reload
                // This ensures all components get the new login context and can load accounts
                await new Promise(resolve => setTimeout(resolve, 300));
                window.location.reload();
                return;
            } else {
                // Sign up new user (creates login + account automatically)
                if (!referralCode.trim()) {
                    setError("Referral code is required to sign up.");
                    setIsLoading(false);
                    return;
                }

                if (!name.trim() || name.trim().length < 2) {
                    setError("Full name must be at least 2 characters long.");
                    setIsLoading(false);
                    return;
                }

                const result = await authRegister({ name, email, password, referralCode });
                
                // Register now returns { loginId, accountId, userId }
                // The useAuth hook already handles storing these and logging in
                // Wait a bit to ensure localStorage is fully updated, then reload
                // This ensures all components get the new login context and can load accounts
                await new Promise(resolve => setTimeout(resolve, 300));
                window.location.reload();
                return;
            }
        } catch (err: any) {
            let msg = err.message || err.toString();
            msg = msg
                .replace(/Uncaught AppError: /, "")
                .replace(/Uncaught Error: /, "")
                .replace(/Uncaught ConvexError: /, "")
                .replace(/\[CONVEX.*?\] /, "")
                .replace(/Server Error\s*/, "")
                .replace(/\[Request ID: [a-f0-9]+\]\s*/gi, "")
                .replace(/\s+at\s+\w+\s+\([^)]+\)/g, "")
                .replace(/\s*Called by (client|server|action|mutation|query).*/gi, "")
                .replace(/\s+\(\.\.\/[^)]+\)/g, "");

            if (msg.includes("ArgumentValidationError")) {
                setError("Invalid input data. Please check your details and try again.");
            } else if (msg.includes("not found") || msg.includes("NOT_FOUND")) {
                setError("Account not found. Please check your email or sign up.");
            } else if (msg.includes("already exists") || msg.includes("ALREADY_EXISTS")) {
                setError("This email is already registered. Please login instead.");
            } else if (msg.includes("INVALID_REFERRAL_CODE")) {
                setError("Invalid referral code. Please check and try again.");
            } else {
                setError(msg.trim());
            }
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setName("");
        setEmail("");
        setPassword("");
        setReferralCode("");
        setError("");
        setIsLogin(true);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-theme-secondary rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-theme-primary/20">
                <div className="p-6 border-b border-theme-primary/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-theme-primary">Add Account</h2>
                            <p className="text-sm text-theme-secondary mt-1">
                                {isLogin 
                                    ? "Login to access another account" 
                                    : "Sign up to create a new account"
                                }
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-theme-secondary hover:text-theme-primary transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form key={isLogin ? "login" : "signup"} onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
                    {/* Always show auth toggle */}
                    <div className="flex p-1 bg-theme-tertiary rounded-xl border border-theme-secondary">
                        <button
                            type="button"
                            onClick={() => { setIsLogin(true); setError(""); setReferralCode(""); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                                isLogin 
                                    ? 'bg-theme-primary text-white shadow-lg' 
                                    : 'text-theme-secondary hover:text-theme-primary'
                            }`}
                        >
                            Log In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsLogin(false); setError(""); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                                !isLogin 
                                    ? 'bg-theme-primary text-white shadow-lg' 
                                    : 'text-theme-secondary hover:text-theme-primary'
                            }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Always show login/signup form */}
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-1">Full Name</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-theme-tertiary rounded-xl border border-theme-secondary focus:border-purple-500 outline-none transition-all text-theme-primary"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-theme-secondary mb-1">Email Address</label>
                        <input
                            type="email"
                            className="w-full p-3 bg-theme-tertiary rounded-xl border border-theme-secondary focus:border-purple-500 outline-none transition-all text-theme-primary"
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-theme-secondary mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full p-3 bg-theme-tertiary rounded-xl border border-theme-secondary focus:border-purple-500 outline-none transition-all text-theme-primary"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-1">
                                Referral Code <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full p-3 bg-theme-tertiary rounded-xl border border-theme-secondary focus:border-purple-500 outline-none transition-all text-theme-primary uppercase"
                                placeholder="Enter referral code"
                                value={referralCode}
                                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                disabled={isLoading}
                                required
                            />
                            <p className="mt-1 text-xs text-theme-secondary">
                                A valid referral code is required to sign up.
                            </p>
                        </div>
                    )}


                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 bg-theme-tertiary hover:bg-theme-primary/20 rounded-lg text-theme-primary font-medium transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading 
                                ? (isLogin ? "Logging in..." : "Signing up...")
                                : (isLogin ? "Login" : "Sign Up")
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function AddAccountModal({ isOpen, onClose, loginId: propLoginId }: AddAccountModalProps) {
    // Get current loginId from useAuth to ensure we always have the latest
    const { loginId: currentLoginId } = useAuth();
    
    // Use currentLoginId if available, otherwise use the prop (for initial render)
    const activeLoginId = currentLoginId || propLoginId;
    
    // Always show the modal - users can login/signup even if not logged in
    // The AccountProvider will work with null loginId (it will skip queries)
    return (
        <AccountProvider loginId={activeLoginId}>
            <AddAccountModalContent isOpen={isOpen} onClose={onClose} loginId={activeLoginId || null} />
        </AccountProvider>
    );
}

