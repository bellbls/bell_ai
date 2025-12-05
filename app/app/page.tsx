"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAction } from "convex/react";
import { useCachedQuery } from "../hooks/useCachedQuery";
import { useCachedMutation } from "../hooks/useCachedMutation";
import { api } from "../convex/_generated/api";
import {
  Wallet, TrendingUp, Users, Award, ArrowRight,
  LayoutDashboard, Settings, LogOut, Copy, Check,
  Menu, X, Bell, ChevronRight, ArrowDownLeft, ArrowUpRight, History,
  Shield, User, Lock, AlertCircle, Rocket, Coins, ArrowRightLeft, Network
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ToastContainer } from "../components/Toast";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { PasswordStrengthIndicator } from "../components/PasswordStrengthIndicator";
import { StakeModal } from "../components/StakeModal";
import { NotificationBell } from "../components/NotificationBell";
import { DepositModal } from "../components/DepositModal";
import { WithdrawModal } from "../components/WithdrawModal";
import { AddressBook } from "../components/AddressBook";
import { BRankCapCard } from "../components/BRankCapCard";
import { CryptoPriceTicker } from "../components/CryptoPriceTicker";
import { PresaleView } from "../components/PresaleView";
import { SwapToCrypto } from "../components/SwapToCrypto";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTheme } from "../components/providers/ThemeProvider";
import TwoFactorSetup from "../components/TwoFactorSetup";
import { AccountSwitcher } from "../components/AccountSwitcher";
import { AddAccountModal } from "../components/AddAccountModal";
import { AccountSettings } from "../components/AccountSettings";
import { AccountProvider, useAccount } from "../contexts/AccountContext";

// Dynamic import for Tree to avoid SSR issues
const Tree = dynamic(() => import("react-d3-tree"), { ssr: false });

function HomeContent() {
  // Use new auth hook
  const { user, userId, loginId, accountId, isAuthenticated, login: authLogin, register: authRegister, logout, completeLoginWith2FA } = useAuth();
  const { currentAccountId } = useAccount();
  
  // Use currentAccountId if available, otherwise fall back to accountId or userId
  const activeAccountId = currentAccountId || accountId || userId;
  
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [gracePeriodInfo, setGracePeriodInfo] = useState<{ daysRemaining?: number; isFirstLogin?: boolean } | null>(null);
  const toast = useToast();
  const { theme } = useTheme();

  // Mutations & Queries (keep for other operations)
  const createStake = useCachedMutation(api.stakes.createStake);
  const userProfile = useCachedQuery(api.users.getProfile, activeAccountId ? { accountId: activeAccountId as any } : "skip");
  const stakes = useCachedQuery(api.stakes.getUserStakes, activeAccountId ? { accountId: activeAccountId as any } : "skip");
  const stakingCycles = useCachedQuery(api.config.get, { key: "staking_cycles" });

  // Wallet Mutations & Queries
  const deposit = useCachedMutation(api.wallet.deposit);
  const transactions = useCachedQuery(api.wallet.getTransactionHistory, activeAccountId ? { accountId: activeAccountId as any } : "skip");
  const requestWithdrawal = useCachedMutation(api.wallet.requestWithdrawal);
  const requestWithdrawalWith2FA = useAction(api.walletActions.requestWithdrawalWith2FA);

  // Network Queries
  const allUsers = useCachedQuery(api.users.getAllUsers);

  // Earnings Query
  const userEarnings = useCachedQuery(api.users.getUserEarnings, activeAccountId ? { accountId: activeAccountId as any } : "skip");

  // System pause states
  const pauseStates = useCachedQuery(api.configs.getSystemPauseStates);

  // BLS System
  const blsConfig = useCachedQuery(api.bls.getBLSConfig);
  const blsBalance = useCachedQuery(api.bls.getBLSBalance, activeAccountId ? { accountId: activeAccountId as any } : "skip");
  
  // Presale - Get user orders for node count
  const userOrders = useCachedQuery(api.presale.getUserOrders, activeAccountId ? { accountId: activeAccountId as any } : "skip");
  
  // Calculate total nodes owned - ensure userOrders is an array (memoized to prevent recalculations)
  const totalNodesOwned = useMemo(() => {
    if (!Array.isArray(userOrders)) return 0;
    return userOrders.reduce((sum, order) => {
      if (order.status === "confirmed" || order.status === "converted") {
        return sum + (order.quantity ?? 0);
      }
      return sum;
    }, 0);
  }, [userOrders]);

  const handleAuth = async () => {
    setError("");
    try {
      if (isLogin) {
        const result = await authLogin({ email, password });
        
        // Check if 2FA is required
        if (result && typeof result === "object" && "requires2FA" in result) {
          if (result.requires2FA) {
            setRequires2FA(true);
            setPendingUserId(result.userId || result.loginId); // Support both formats
            setTwoFactorCode("");
            return;
          } else if (result.gracePeriodInfo) {
            // Login successful but show grace period warning
            setGracePeriodInfo(result.gracePeriodInfo);
            // Continue with normal login flow - result already has loginId/accountId
          }
        }
        
        // If login succeeded, result should have loginId/accountId or userId
        // The useAuth hook already handles storing these in localStorage
      } else {
        const result = await authRegister({ name, email, password, referralCode });
        // Register now returns { loginId, accountId } or { userId } for legacy
        // The useAuth hook already handles storing these
      }
      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setReferralCode("");
      setRequires2FA(false);
      setTwoFactorCode("");
      setPendingUserId(null);
      setGracePeriodInfo(null);
    } catch (e: any) {
      // Extract clean error message from Convex errors
      let msg = e.message || e.toString();

      // Remove all Convex error prefixes and technical details
      msg = msg
        .replace(/Uncaught AppError: /, "")
        .replace(/Uncaught Error: /, "")
        .replace(/Uncaught ConvexError: /, "")
        .replace(/\[CONVEX.*?\] /, "")
        .replace(/Server Error\s*/, "")
        // Remove Request IDs
        .replace(/\[Request ID: [a-f0-9]+\]\s*/gi, "")
        // Remove stack traces (at handler ...)
        .replace(/\s+at\s+\w+\s+\([^)]+\)/g, "")
        // Remove "Called by client" and similar
        .replace(/\s*Called by (client|server|action|mutation|query).*/gi, "")
        // Remove file paths
        .replace(/\s+\(\.\.\/[^)]+\)/g, "");

      // Handle specific error patterns
      if (msg.includes("ArgumentValidationError")) {
        setError("Invalid input data. Please check your details and try again.");
      } else if (msg.includes("not found") || msg.includes("NOT_FOUND")) {
        setError("Account not found. Please check your email or sign up.");
      } else if (msg.includes("already exists") || msg.includes("ALREADY_EXISTS")) {
        setError("This email is already registered. Please login instead.");
      } else {
        // Use the cleaned message
        setError(msg.trim());
      }
    }
  };

  const handle2FAVerification = async () => {
    if (!pendingUserId || twoFactorCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setError("");
    try {
      await completeLoginWith2FA({ userId: pendingUserId as any, twoFactorCode });
      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setReferralCode("");
      setRequires2FA(false);
      setTwoFactorCode("");
      setPendingUserId(null);
      setGracePeriodInfo(null);
    } catch (e: any) {
      let msg = e.message || e.toString();
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

      if (msg.includes("TWO_FACTOR_INVALID_CODE") || msg.includes("Invalid")) {
        setError("Invalid 2FA code. Please try again.");
      } else {
        setError(msg.trim());
      }
      setTwoFactorCode("");
    }
  };

  const handleStake = async (days: number, amount: number) => {
    if (!userId) return;

    if (userProfile && (userProfile.walletBalance || 0) < amount) {
      toast.warning("Insufficient wallet balance. Please deposit funds first.");
      return;
    }

    try {
      await createStake({ userId: userId as any, amount, cycleDays: days });
      toast.success("Staked successfully!");
    } catch (e: any) {
      const errorMessage = e.message || e.toString();
      if (errorMessage.includes("INSUFFICIENT_BALANCE")) {
        toast.warning("Insufficient wallet balance. Please deposit funds first.");
      } else {
        toast.error("Staking failed: " + errorMessage);
      }
    }
  };

  const copyReferral = () => {
    if (userProfile?.referralCode) {
      navigator.clipboard.writeText(userProfile.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


  // --- Login / Register View ---
  if (!userId) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center text-theme-primary relative overflow-hidden px-4 py-8">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950' : 'bg-gradient-to-br from-purple-50 to-pink-50'}`} />
        <div className="p-4 sm:p-8 bg-theme-secondary/80 backdrop-blur-xl rounded-2xl border border-theme-primary max-w-md w-full relative z-10 shadow-2xl">
          {/* Theme Toggle */}
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 rounded-2xl flex items-center justify-center overflow-hidden">
              <Image
                src="/images/logos/ailogo.png"
                alt="BellAi Logo"
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <p className="text-theme-secondary text-center mb-8">Join the future of decentralized rewards.</p>

          {/* Auth Toggle */}
          <div className="flex p-1 bg-theme-tertiary dark:bg-slate-800/50 light:bg-gray-100 rounded-xl mb-6 border border-theme-secondary dark:border-slate-700/50 light:border-gray-300">
            <button
              onClick={() => { setIsLogin(true); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                isLogin 
                  ? 'bg-theme-primary dark:bg-slate-700 light:bg-indigo-600 text-theme-primary dark:text-white light:text-white shadow-lg' 
                  : 'text-theme-secondary dark:text-slate-400 light:text-gray-600 hover:text-theme-primary dark:hover:text-white light:hover:text-gray-900'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                !isLogin 
                  ? 'bg-theme-primary dark:bg-slate-700 light:bg-indigo-600 text-theme-primary dark:text-white light:text-white shadow-lg' 
                  : 'text-theme-secondary dark:text-slate-400 light:text-gray-600 hover:text-theme-primary dark:hover:text-white light:hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isLogin && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="block text-sm font-medium text-theme-secondary mb-1">Full Name</label>
                <input
                  className="w-full p-3 sm:p-3 text-base sm:text-sm bg-theme-tertiary dark:bg-slate-800/50 light:bg-white rounded-xl border border-theme-secondary dark:border-slate-700 light:border-gray-300 focus:border-purple-500 dark:focus:border-purple-500 light:focus:border-indigo-500 outline-none transition-all text-theme-primary"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Email Address</label>
              <input
                type="email"
                className="w-full p-3 sm:p-3 text-base sm:text-sm bg-theme-tertiary dark:bg-slate-800/50 light:bg-white rounded-xl border border-theme-secondary dark:border-slate-700 light:border-gray-300 focus:border-purple-500 dark:focus:border-purple-500 light:focus:border-indigo-500 outline-none transition-all text-theme-primary"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Password</label>
              <input
                type="password"
                className="w-full p-3 sm:p-3 text-base sm:text-sm bg-theme-tertiary dark:bg-slate-800/50 light:bg-white rounded-xl border border-theme-secondary dark:border-slate-700 light:border-gray-300 focus:border-purple-500 dark:focus:border-purple-500 light:focus:border-indigo-500 outline-none transition-all text-theme-primary"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              />
              {!isLogin && password && (
                <PasswordStrengthIndicator password={password} showRequirements={true} />
              )}
            </div>

            {!isLogin && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="block text-sm font-medium text-theme-secondary mb-1">Referral Code</label>
                <input
                  className="w-full p-3 sm:p-3 text-base sm:text-sm bg-theme-tertiary dark:bg-slate-800/50 light:bg-white rounded-xl border border-theme-secondary dark:border-slate-700 light:border-gray-300 focus:border-purple-500 dark:focus:border-purple-500 light:focus:border-indigo-500 outline-none transition-all uppercase tracking-widest text-theme-primary"
                  placeholder="REF123"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                />
              </div>
            )}

            {requires2FA && isLogin && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-indigo-400">Two-Factor Authentication Required</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Please enter the 6-digit code from your authenticator app.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1">2FA Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className="w-full p-3 sm:p-3 text-base sm:text-sm bg-theme-tertiary dark:bg-slate-800/50 light:bg-white rounded-xl border border-theme-secondary dark:border-slate-700 light:border-gray-300 focus:border-purple-500 dark:focus:border-purple-500 light:focus:border-indigo-500 outline-none transition-all text-center text-2xl tracking-widest font-mono text-theme-primary"
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setTwoFactorCode(value);
                      setError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && twoFactorCode.length === 6) {
                        handle2FAVerification();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handle2FAVerification}
                  disabled={twoFactorCode.length !== 6}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify Code
                </button>
                <button
                  onClick={() => {
                    setRequires2FA(false);
                    setTwoFactorCode("");
                    setPendingUserId(null);
                    setError("");
                  }}
                  className="w-full text-slate-400 hover:text-slate-300 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}

            {!requires2FA && (
              <button
                onClick={handleAuth}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all mt-4"
              >
                {isLogin ? "Sign In" : "Get Started"}
              </button>
            )}

            {gracePeriodInfo && !requires2FA && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-2 text-yellow-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">2FA Setup Required</p>
                  <p className="text-xs text-yellow-300/80">
                    {gracePeriodInfo.isFirstLogin 
                      ? "Please set up two-factor authentication in Settings. You have 30 days to complete setup."
                      : `You have ${gracePeriodInfo.daysRemaining} days remaining to set up 2FA.`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Main Dashboard View ---
  return (
    <div className="min-h-screen bg-theme-primary text-theme-primary flex font-sans">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-theme-secondary/80 backdrop-blur-xl border-r border-theme-primary transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:relative lg:translate-x-0 flex flex-col`}
      >
            <div className="p-4 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/logos/ailogo.png"
                    alt="BellAi Logo"
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-theme-secondary">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

        <div className="px-4 sm:px-6 py-4">
          <div className="p-4 bg-theme-tertiary dark:bg-slate-800/50 light:bg-gray-50 rounded-xl border border-theme-secondary dark:border-slate-700/50 light:border-gray-200">
            <div className="text-xs text-theme-secondary dark:text-slate-400 light:text-gray-600 mb-1">Current Rank</div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-purple-500 dark:text-purple-400 light:text-indigo-600">{userProfile?.currentRank || "B0"}</span>
              <Award className="w-5 h-5 text-purple-500 dark:text-purple-500 light:text-indigo-600" />
            </div>
          </div>
        </div>

        <nav className="px-4 space-y-2 flex-1 overflow-y-auto">
          <SidebarItem
            icon={<LayoutDashboard />}
            label="Dashboard"
            active={activeTab === "dashboard"}
            onClick={() => { setActiveTab("dashboard"); setSidebarOpen(false); }}
          />
          <SidebarItem
            icon={<Rocket />}
            label="Presale"
            active={activeTab === "presale"}
            onClick={() => { setActiveTab("presale"); setSidebarOpen(false); }}
          />
          <SidebarItem
            icon={<TrendingUp />}
            label="Staking"
            active={activeTab === "staking"}
            onClick={() => { setActiveTab("staking"); setSidebarOpen(false); }}
          />
          <SidebarItem
            icon={<Wallet />}
            label="Earnings"
            active={activeTab === "earnings"}
            onClick={() => { setActiveTab("earnings"); setSidebarOpen(false); }}
          />
          <SidebarItem
            icon={<ArrowDownLeft />}
            label="Wallet"
            active={activeTab === "wallet"}
            onClick={() => { setActiveTab("wallet"); setSidebarOpen(false); }}
          />
          {blsConfig?.isEnabled && (
            <SidebarItem
              icon={<ArrowRightLeft />}
              label="Swap BLS"
              active={activeTab === "swap"}
              onClick={() => { setActiveTab("swap"); setSidebarOpen(false); }}
            />
          )}
          <SidebarItem
            icon={<Users />}
            label="My Network"
            active={activeTab === "network"}
            onClick={() => { setActiveTab("network"); setSidebarOpen(false); }}
          />
          <SidebarItem
            icon={<Settings />}
            label="Settings"
            active={activeTab === "settings"}
            onClick={() => { setActiveTab("settings"); setSidebarOpen(false); }}
          />
        </nav>

        <div className="p-4 border-t border-theme-primary dark:border-slate-800 light:border-gray-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-theme-secondary dark:text-slate-400 light:text-gray-600 hover:bg-red-500/10 dark:hover:bg-red-500/10 light:hover:bg-red-50 hover:text-red-500 dark:hover:text-red-400 light:hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen relative">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-theme-primary/80 dark:bg-slate-950/80 light:bg-white/80 backdrop-blur-md border-b border-theme-primary dark:border-slate-800 light:border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-theme-secondary dark:text-slate-400 light:text-gray-600 hover:text-theme-primary dark:hover:text-white light:hover:text-gray-900">
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <h2 className="text-lg sm:text-xl font-bold capitalize text-theme-primary">{activeTab.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {userId && <NotificationBell userId={userId} />}
            {isAuthenticated ? (
              <AccountProvider loginId={loginId || null}>
                <AccountSwitcher 
                  onAddAccount={() => {
                    if (!loginId) {
                      toast.info("Please log out and log back in to enable multi-account features");
                      return;
                    }
                    setShowCreateAccountModal(true);
                  }}
                  onLogout={logout}
                />
              </AccountProvider>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-theme-primary dark:border-slate-800 light:border-gray-200">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-theme-primary">{userProfile?.name}</div>
                  <div className="text-xs text-theme-secondary dark:text-slate-400 light:text-gray-500">{userProfile?.email}</div>
                </div>
                <div className="w-10 h-10 bg-theme-tertiary dark:bg-slate-800 light:bg-indigo-100 rounded-full flex items-center justify-center text-purple-500 dark:text-purple-400 light:text-indigo-600 font-bold border border-theme-secondary dark:border-slate-700 light:border-indigo-200">
                  {userProfile?.name?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

          {activeTab === "dashboard" && (
            <>
              {/* Welcome & Referral */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 p-8 bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-3xl border border-purple-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="w-32 h-32" />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-theme-primary">Welcome back, {userProfile?.name?.split(' ')[0]}! 👋</h2>
                    <p className="text-theme-secondary dark:text-purple-200 light:text-gray-600 mb-6 max-w-md">Your investments are growing. Check your daily yields and network performance.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setActiveTab("wallet")}
                        className="px-6 py-3 bg-white dark:bg-white light:bg-indigo-600 text-purple-900 dark:text-purple-900 light:text-white rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-100 light:hover:bg-indigo-700 transition-colors"
                      >
                        Deposit Funds
                      </button>
                      <button
                        onClick={() => setActiveTab("staking")}
                        className="px-6 py-3 bg-purple-600/30 dark:bg-purple-600/30 light:bg-indigo-100 text-white dark:text-white light:text-indigo-700 border border-purple-500/30 dark:border-purple-500/30 light:border-indigo-300 rounded-xl font-bold hover:bg-purple-600/40 dark:hover:bg-purple-600/40 light:hover:bg-indigo-200 transition-colors"
                      >
                        Start Staking
                      </button>
                    </div>
                  </div>
                </div>

                <div className="md:w-80 p-4 sm:p-6 bg-theme-card dark:bg-slate-900/50 light:bg-white backdrop-blur-sm rounded-3xl border border-theme-primary dark:border-slate-800 light:border-gray-200 flex flex-col justify-center shadow-lg dark:shadow-none light:shadow-xl">
                  <h3 className="text-sm font-medium text-theme-secondary dark:text-slate-400 light:text-gray-600 mb-4 uppercase tracking-wider">Your Referral Code</h3>
                  <div className="bg-theme-tertiary dark:bg-slate-950 light:bg-gray-50 p-4 rounded-xl border border-theme-secondary dark:border-slate-800 light:border-gray-200 flex items-center justify-between mb-4">
                    <code className="text-lg sm:text-xl font-mono font-bold text-purple-500 dark:text-purple-400 light:text-indigo-600 tracking-widest">
                      {userProfile?.referralCode || "LOADING"}
                    </code>
                    <button
                      onClick={copyReferral}
                      className="p-2 hover:bg-theme-hover dark:hover:bg-slate-800 light:hover:bg-gray-100 rounded-lg transition-colors text-theme-secondary dark:text-slate-400 light:text-gray-600 hover:text-theme-primary dark:hover:text-white light:hover:text-gray-900"
                    >
                      {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-theme-tertiary dark:text-slate-500 light:text-gray-500 text-center">
                    Share this code to grow your team and earn commissions.
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div onClick={() => setActiveTab("wallet")} className="cursor-pointer">
                  <StatsCard
                    title="Wallet Balance"
                    value={`$${userProfile?.walletBalance?.toFixed(2) || "0.00"}`}
                    icon={<Wallet className="text-emerald-400" />}
                    trend="+2.5% today"
                    color="emerald"
                  />
                </div>
                <div onClick={() => setActiveTab("network")} className="cursor-pointer">
                  <StatsCard
                    title="Team Volume"
                    value={`$${userProfile?.teamVolume?.toLocaleString() || "0"}`}
                    icon={<Users className="text-blue-400" />}
                    trend="Total Network"
                    color="blue"
                  />
                </div>
                <div onClick={() => setActiveTab("presale")} className="cursor-pointer">
                  <StatsCard
                    title="Nodes Owned"
                    value={totalNodesOwned.toString()}
                    icon={<Rocket className="text-purple-400" />}
                    trend="Presale Nodes"
                    color="purple"
                  />
                </div>
                <StatsCard
                  title="Direct Referrals"
                  value={userProfile?.directReferralsCount?.toString() || "0"}
                  icon={<Award className="text-pink-400" />}
                  trend="Active Members"
                  color="pink"
                />
              </div>

              {/* Live Crypto Prices */}
              <CryptoPriceTicker />

              {/* B-Rank Cap Information */}
              {activeAccountId && userProfile?.currentRank !== "B0" && (
                <BRankCapCard accountId={activeAccountId} />
              )}
            </>
          )}

          {activeTab === "presale" && activeAccountId && (
            <PresaleView userId={activeAccountId as any} />
          )}

          {activeTab === "staking" && (
            <StakingView
              stakingCycles={stakingCycles}
              stakes={stakes}
              handleStake={handleStake}
              toast={toast}
              userProfile={userProfile}
              pauseStates={pauseStates}
              setActiveTab={setActiveTab}
              setSidebarOpen={setSidebarOpen}
            />
          )}

          {activeTab === "earnings" && (
            <EarningsView userEarnings={userEarnings} blsConfig={blsConfig} pauseStates={pauseStates} />
          )}

          {activeTab === "wallet" && (
            <WalletView
              userProfile={userProfile}
              transactions={transactions}
              requestWithdrawal={requestWithdrawal}
              deposit={deposit}
              userId={activeAccountId}
              toast={toast}
              setActiveTab={setActiveTab}
              pauseStates={pauseStates}
              blsConfig={blsConfig}
              blsBalance={blsBalance}
            />
          )}

          {activeTab === "swap" && activeAccountId && (
            <SwapToCrypto userId={activeAccountId as any} />
          )}

          {activeTab === "network" && (
            <NetworkView
              allUsers={allUsers}
              userId={activeAccountId}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView userProfile={userProfile} toast={toast} loginId={loginId} />
          )}

        </div>
      </main>
      
      {isAuthenticated && (
        <AddAccountModal
          isOpen={showCreateAccountModal}
          onClose={() => setShowCreateAccountModal(false)}
          loginId={loginId || null}
        />
      )}
      
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </div >
  );
}

export default function Home() {
  const { loginId } = useAuth();
  
  return (
    <AccountProvider loginId={loginId}>
      <HomeContent />
    </AccountProvider>
  );
}

// --- Sub-Components ---

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        active
          ? "bg-purple-600 dark:bg-purple-600 light:bg-indigo-600 text-white shadow-lg shadow-purple-500/25 dark:shadow-purple-500/25 light:shadow-indigo-500/25"
          : "text-theme-secondary dark:text-slate-400 light:text-gray-600 hover:bg-theme-hover dark:hover:bg-slate-800 light:hover:bg-gray-100 hover:text-theme-primary dark:hover:text-white light:hover:text-gray-900"
      }`}
    >
      <div className={`${active ? "text-white" : "text-theme-tertiary dark:text-slate-500 light:text-gray-500 group-hover:text-theme-primary dark:group-hover:text-white light:group-hover:text-gray-900"}`}>
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function StatsCard({ title, value, icon, trend, color }: { title: string, value: string, icon: any, trend: string, color: string }) {
  return (
    <div className="p-4 sm:p-6 bg-theme-card dark:bg-slate-900/50 light:bg-white backdrop-blur-sm rounded-2xl border border-theme-primary dark:border-slate-800 light:border-gray-200 hover:border-theme-secondary dark:hover:border-slate-700 light:hover:border-gray-300 transition-all group card-hover shadow-sm dark:shadow-none light:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 bg-${color}-500/10 dark:bg-${color}-500/10 light:bg-${color}-100 rounded-xl`}>
          {icon}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full bg-${color}-500/10 dark:bg-${color}-500/10 light:bg-${color}-100 text-${color}-400 dark:text-${color}-400 light:text-${color}-600`}>
          {trend}
        </span>
      </div>
      <div className="text-theme-secondary dark:text-slate-400 light:text-gray-600 text-sm font-medium mb-1">{title}</div>
      <div className="text-2xl sm:text-3xl font-bold text-theme-primary dark:text-white light:text-gray-900">{value}</div>
    </div>
  );
}

function StakingView({ stakingCycles, stakes, handleStake, toast, userProfile, pauseStates, setActiveTab, setSidebarOpen }: any) {
  const [stakeModalOpen, setStakeModalOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);

  const handleStakeClick = (cycle: any) => {
    if (pauseStates?.stakingPaused) {
      toast.error("Staking is currently paused. Please try again later.");
      return;
    }
    setSelectedCycle(cycle);
    setStakeModalOpen(true);
  };

  const handleStakeConfirm = (amount: number) => {
    if (selectedCycle) {
      handleStake(selectedCycle.days, amount);
    }
  };

  const isStakingPaused = pauseStates?.stakingPaused;

  return (
    <div className="space-y-8">
      {/* Pause Notice */}
      {isStakingPaused && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-full">
              <Lock className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-400">Staking Not Yet Live</h3>
              <p className="text-sm text-slate-400 mt-1">
                Staking will officially open soon. Please wait for the official announcement.
                In the meantime, node presales are active, secure your node early before launch.
                <span className="block mt-2">
                  <button
                    type="button"
                    onClick={() => { setActiveTab("presale"); setSidebarOpen(false); }}
                    className="text-indigo-500 underline font-bold"
                  >
                    BUY NOW
                  </button>
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Staking Pools */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Available Staking Pools</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(stakingCycles || [
            { days: 7, dailyRate: 0.45 },
            { days: 30, dailyRate: 0.60 },
            { days: 90, dailyRate: 0.75 },
            { days: 360, dailyRate: 1.00 },
          ]).map((cycle: any) => (
            <div
              key={cycle.days}
              className={`group relative p-4 sm:p-6 bg-theme-card dark:bg-slate-900/50 light:bg-white backdrop-blur-sm rounded-2xl border border-theme-primary dark:border-slate-800 light:border-gray-200 transition-all overflow-hidden shadow-sm dark:shadow-none light:shadow-md ${
                  isStakingPaused
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-purple-500/50 dark:hover:border-purple-500/50 light:hover:border-indigo-500/50 cursor-pointer card-hover'
                }`}
              onClick={() => handleStakeClick(cycle)}
            >
              {isStakingPaused && (
                <div className="absolute inset-0 bg-theme-primary/50 dark:bg-slate-950/50 light:bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
                  <Lock className="w-12 h-12 text-red-400/50 dark:text-red-400/50 light:text-red-500/50" />
                </div>
              )}
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-2xl sm:text-3xl font-bold text-theme-primary dark:text-white light:text-gray-900">{cycle.days}D</span>
                  <span className="px-3 py-1 bg-purple-500/20 dark:bg-purple-500/20 light:bg-indigo-100 text-purple-300 dark:text-purple-300 light:text-indigo-700 text-xs font-bold rounded-full">
                    {cycle.dailyRate}% / Day
                  </span>
                </div>
                <div className="text-theme-secondary dark:text-slate-400 light:text-gray-600 text-sm mb-4">
                  Earn up to <span className="text-theme-primary dark:text-white light:text-gray-900 font-bold">{(cycle.dailyRate * cycle.days).toFixed(1)}%</span> total return.
                </div>
                <div className="text-xs text-purple-500 dark:text-purple-400 light:text-indigo-600 mb-6 flex items-center gap-1">
                  <span>💰</span>
                  <span>Min. Stake: $100</span>
                </div>
                <button className="w-full py-3 bg-theme-tertiary dark:bg-slate-800 light:bg-indigo-50 group-hover:bg-purple-600 dark:group-hover:bg-purple-600 light:group-hover:bg-indigo-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-theme-primary dark:text-white light:text-gray-900 group-hover:text-white dark:group-hover:text-white light:group-hover:text-white">
                  Stake Now <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Stakes Table */}
      <section className="bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold">Active Investments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/50 text-slate-400 text-sm uppercase tracking-wider">
              <tr>
                <th className="p-6 font-medium">Plan</th>
                <th className="p-6 font-medium">Amount</th>
                <th className="p-6 font-medium">Daily Yield</th>
                <th className="p-6 font-medium">End Date</th>
                <th className="p-6 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {Array.isArray(stakes) && stakes.length > 0 ? (
                stakes.map((stake: any) => {
                  // Check if this is a 1-year stake (likely from presale conversion)
                  const isPresaleStake = stake.cycleDays === 365;
                  const safeAmount = stake.amount ?? 0;
                  const safeEndDate = stake.endDate ?? Date.now();
                  return (
                    <tr key={stake._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-6">
                        <div className="font-bold text-white">{stake.cycleDays ?? 0} Days</div>
                        {isPresaleStake && (
                          <div className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            From Presale
                          </div>
                        )}
                      </td>
                      <td className="p-4 sm:p-6 text-theme-primary dark:text-slate-300 light:text-gray-900">${safeAmount.toLocaleString()}</td>
                      <td className="p-4 sm:p-6 text-emerald-500 dark:text-emerald-400 light:text-emerald-600 font-medium">+{stake.dailyRate ?? 0}%</td>
                      <td className="p-4 sm:p-6 text-theme-secondary dark:text-slate-400 light:text-gray-600">{new Date(safeEndDate).toLocaleDateString()}</td>
                      <td className="p-4 sm:p-6">
                        <span className="px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/10 light:bg-emerald-100 text-emerald-500 dark:text-emerald-400 light:text-emerald-700 rounded-full text-xs font-bold uppercase">
                          {stake.status || "active"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-theme-tertiary dark:text-slate-500 light:text-gray-500">
                    No active investments found. Start staking today!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <StakeModal
        isOpen={stakeModalOpen}
        onClose={() => setStakeModalOpen(false)}
        onConfirm={handleStakeConfirm}
        cycle={selectedCycle || { days: 0, dailyRate: 0 }}
        walletBalance={userProfile?.walletBalance || 0}
      />
    </div>
  );
}

function WalletView({ userProfile, transactions, requestWithdrawal, deposit, userId, toast, setActiveTab, pauseStates, blsConfig, blsBalance }: any) {
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const isBLSEnabled = blsConfig?.isEnabled || false;
  const currentBLSBalance = blsBalance?.blsBalance || 0;
  
  // Helper function to format balance and prevent -0.00 display
  const formatBLSBalance = (balance: number): string => {
    const normalized = balance === 0 || Object.is(balance, -0) ? 0 : balance;
    return normalized.toFixed(2);
  };

  const handleDepositConfirm = async (amount: number) => {
    if (!userId) return;
    try {
      const result = await deposit({
        userId: userId as any,
        amount: amount,
        method: "manual",
      });
      toast.success(result.message || "Deposit successful!");
    } catch (e: any) {
      const errorMessage = e.message || e.toString();
      toast.error("Deposit failed: " + errorMessage);
    }
  };

  const handleWithdrawConfirm = async (amount: number, address: string, network: string, twoFactorCode?: string) => {
    if (!userId) return;
    try {
      // Use the action that verifies 2FA before processing withdrawal
      const result = await requestWithdrawalWith2FA({
        userId: userId as any,
        amount: amount,
        address: address,
        network: network || "polygon", // Default network if not provided
        twoFactorCode: twoFactorCode,
      });
      toast.success(result.message || "Withdrawal requested successfully!");
    } catch (e: any) {
      const errorMessage = e.message || e.toString();
      toast.error("Withdrawal failed: " + errorMessage);
    }
  };

  const handleWithdrawClick = () => {
    if (pauseStates?.withdrawalsPaused) {
      toast.error("Withdrawals are currently paused. Please try again later.");
      return;
    }
    setWithdrawModalOpen(true);
  };

  const isWithdrawalsPaused = pauseStates?.withdrawalsPaused;

  return (
    <>
      {/* Pause Notice */}
      {isWithdrawalsPaused && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-full">
              <Lock className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-400">Withdrawals Temporarily Paused</h3>
              <p className="text-sm text-slate-400 mt-1">
                Withdrawal requests cannot be submitted at this time due to system maintenance. Pending withdrawals will continue to be processed.
                You will be notified when withdrawals resume.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Balance Card */}
      <div className="p-8 bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl border border-purple-500/30 mb-8 shadow-2xl">
        <div className="text-purple-200 mb-2 flex items-center gap-2">
          <Wallet className="w-5 h-5" /> Available Balance
        </div>
        <div className="text-5xl font-bold mb-6">
          ${userProfile?.walletBalance?.toFixed(2) || "0.00"}
        </div>

        {/* BLS Balance Display (if enabled) */}
        {isBLSEnabled && (
          <div className="mb-6 p-4 bg-purple-800/30 rounded-xl border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-200">
                <Coins className="w-5 h-5" />
                <span className="font-medium">BLS Balance</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-500 dark:text-purple-300 light:text-indigo-600">
                  {formatBLSBalance(currentBLSBalance)} <span className="text-lg">BLS</span>
                </div>
                <button
                  onClick={() => setActiveTab("swap")}
                  className="text-xs text-purple-500 dark:text-purple-400 light:text-indigo-600 hover:text-purple-600 dark:hover:text-purple-300 light:hover:text-indigo-700 mt-1 flex items-center gap-1"
                >
                  Swap to USDT <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => setDepositModalOpen(true)}
            className="flex-1 py-3 rounded-xl font-bold backdrop-blur-sm transition-all flex items-center justify-center gap-2 bg-white dark:bg-white light:bg-indigo-600 text-purple-900 dark:text-purple-900 light:text-white hover:bg-gray-100 dark:hover:bg-gray-100 light:hover:bg-indigo-700 shadow-sm dark:shadow-none light:shadow-md"
          >
            <ArrowDownLeft className="w-5 h-5" /> Deposit
          </button>
          <button
            onClick={handleWithdrawClick}
            disabled={isWithdrawalsPaused}
            className={`flex-1 py-3 rounded-xl font-bold backdrop-blur-sm transition-all flex items-center justify-center gap-2 ${
              isWithdrawalsPaused
                ? 'bg-theme-tertiary dark:bg-slate-700 light:bg-gray-300 text-theme-tertiary dark:text-slate-400 light:text-gray-500 cursor-not-allowed'
                : 'bg-theme-secondary/50 dark:bg-white/10 light:bg-indigo-50 hover:bg-theme-hover dark:hover:bg-white/20 light:hover:bg-indigo-100 text-theme-primary dark:text-white light:text-indigo-700'
            }`}
          >
            {isWithdrawalsPaused ? <Lock className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            Withdraw {isWithdrawalsPaused && '(Paused)'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction History - Now Full Width */}
        <section className="lg:col-span-3">
          <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 text-theme-primary">
            <History className="w-5 h-5 text-theme-secondary dark:text-slate-400 light:text-gray-600" /> Transaction History
          </h2>
          <div className="bg-theme-card dark:bg-slate-900/50 light:bg-white backdrop-blur-sm rounded-2xl border border-theme-primary dark:border-slate-800 light:border-gray-200 overflow-hidden max-h-[600px] overflow-y-auto shadow-sm dark:shadow-none light:shadow-md">
            {(!Array.isArray(transactions) || transactions.length === 0) ? (
              <div className="p-8 text-center text-theme-tertiary dark:text-slate-500 light:text-gray-500">No transactions yet.</div>
            ) : (
              <div className="divide-y divide-theme-primary dark:divide-slate-800 light:divide-gray-200">
                {transactions.map((tx: any) => {
                  const safeAmount = tx.amount ?? 0;
                  const safeTimestamp = tx.timestamp ?? Date.now();
                  return (
                    <div key={tx._id} className="p-4 flex items-center justify-between hover:bg-theme-hover dark:hover:bg-slate-800/50 light:hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${safeAmount > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                          }`}>
                          {safeAmount > 0 ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-medium capitalize">{(tx.type || "transaction").replace('_', ' ')}</div>
                          <div className="text-xs text-theme-tertiary dark:text-slate-500 light:text-gray-500">{new Date(safeTimestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${safeAmount > 0 ? "text-emerald-500 dark:text-emerald-400 light:text-emerald-600" : "text-theme-primary dark:text-white light:text-gray-900"}`}>
                          {safeAmount > 0 ? "+" : ""}{safeAmount.toFixed(2)} USDT
                        </div>
                        <div className="text-xs text-theme-tertiary dark:text-slate-500 light:text-gray-500 capitalize">{tx.status || "completed"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
      />

      <WithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        onConfirm={handleWithdrawConfirm}
        walletBalance={userProfile?.walletBalance || 0}
        userId={userId || undefined}
        onNavigateToSettings={() => setActiveTab("settings")}
      />
    </>
  )
}

function NetworkView({ allUsers, userId }: any) {
  const [activeTab, setActiveTab] = useState<"tree" | "direct" | "indirect">("tree");
  const [treeData, setTreeData] = useState<any>(null);
  const [maxLevels, setMaxLevels] = useState<number>(5); // Default to 5 levels for performance

  const directReferrals = useCachedQuery(api.users.getDirectReferrals, userId ? { accountId: userId as any } : "skip");
  const indirectReferrals = useCachedQuery(api.users.getIndirectReferrals, userId ? { accountId: userId as any } : "skip");
  const unilevelTree = useCachedQuery(api.users.getUnilevelTree, userId ? { accountId: userId as any, maxLevels } : "skip");

  // Set tree data from backend query
  // Use a ref to track the previous tree to prevent infinite loops
  const prevTreeRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Create a stable string representation to compare
    const treeString = unilevelTree ? JSON.stringify(unilevelTree) : null;
    
    // Only update if the tree data actually changed
    if (treeString !== prevTreeRef.current) {
      prevTreeRef.current = treeString;
      
      if (unilevelTree) {
        // Add level indicators to node names
        const addLevelIndicators = (node: any, level: number = 0): any => {
          const levelPrefix = level > 0 ? `L${level}: ` : "";
          return {
            ...node,
            name: levelPrefix + node.name,
            attributes: {
              ...node.attributes,
              Level: level,
            },
            children: node.children?.map((child: any) => addLevelIndicators(child, level + 1)),
          };
        };

        const treeWithLevels = addLevelIndicators(unilevelTree);
        setTreeData([treeWithLevels]);
      } else {
        setTreeData(null);
      }
    }
  }, [unilevelTree]);

  return (
    <div className="space-y-6">
      {/* Network Tabs */}
      <div className="flex gap-4 p-1 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab("tree")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "tree" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
        >
          Unilevel Network
        </button>
        <button
          onClick={() => setActiveTab("direct")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "direct" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
        >
          Direct (L1)
        </button>
        <button
          onClick={() => setActiveTab("indirect")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "indirect" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
        >
          Indirect (L2)
        </button>
      </div>

      {activeTab === "tree" && (
        <div className="space-y-4">
          {/* Level Depth Selector */}
          <div className="flex items-center gap-4 p-4 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800">
            <label className="text-sm font-medium text-slate-300">Tree Depth:</label>
            <select
              value={maxLevels}
              onChange={(e) => setMaxLevels(Number(e.target.value))}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={3}>3 Levels</option>
              <option value={5}>5 Levels</option>
              <option value={10}>10 Levels (Full)</option>
            </select>
            <span className="text-xs text-slate-500 ml-auto">
              Showing {maxLevels} levels of your Unilevel network
            </span>
          </div>

          <div className="h-[600px] bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 relative overflow-auto">
            {treeData ? (
              <div style={{ width: "100%", height: "100%", minWidth: "800px" }}>
                <Tree
                  data={treeData}
                  orientation="vertical"
                  pathFunc="step"
                  translate={{ x: 500, y: 50 }}
                  nodeSize={{ x: 300, y: 120 }}
                  separation={{ siblings: 1.2, nonSiblings: 1.5 }}
                  renderCustomNodeElement={(rd3tProps) => <CustomNode {...rd3tProps} />}
                  zoomable={true}
                  draggable={true}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                {unilevelTree === undefined ? "Loading Unilevel Network..." : "No network data available"}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "direct" && (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="font-bold text-lg">Direct Referrals (Level 1)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-slate-400 text-sm uppercase">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Rank</th>
                  <th className="p-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {Array.isArray(directReferrals) && directReferrals.length > 0 ? (
                  directReferrals.map((user: any) => {
                    const safeCreatedAt = user.createdAt ?? Date.now();
                    return (
                      <tr key={user._id} className="hover:bg-slate-800/30">
                        <td className="p-4 font-medium text-white">{user.name || "N/A"}</td>
                        <td className="p-4 text-slate-400">{user.email || "N/A"}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-bold">
                            {user.currentRank || "N/A"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">{new Date(safeCreatedAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">No direct referrals yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "indirect" && (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h3 className="font-bold text-lg">Indirect Referrals (Level 2)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-slate-400 text-sm uppercase">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Referred By</th>
                  <th className="p-4">Rank</th>
                  <th className="p-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {Array.isArray(indirectReferrals) && indirectReferrals.length > 0 ? (
                  indirectReferrals.map((user: any) => {
                    const safeCreatedAt = user.createdAt ?? Date.now();
                    return (
                      <tr key={user._id} className="hover:bg-slate-800/30">
                        <td className="p-4 font-medium text-white">{user.name || "N/A"}</td>
                        <td className="p-4 text-slate-300">{user.referredBy || "N/A"}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-bold">
                            {user.currentRank || "N/A"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">{new Date(safeCreatedAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">No indirect referrals yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function EarningsView({ userEarnings, blsConfig, pauseStates }: any) {
  if (!userEarnings) {
    return <div className="text-center text-slate-500 py-8">Loading earnings...</div>;
  }

  const isBLSEnabled = blsConfig?.isEnabled || false;
  const referralBonusesEnabled = pauseStates?.referralBonusesEnabled ?? false;

  // Helper function to format amount and prevent -0.00 display
  const formatAmountHelper = (amount: number): string => {
    const normalized = amount === 0 || Object.is(amount, -0) ? 0 : amount;
    return normalized.toFixed(2);
  };
  
  const formatAmount = (amount: number) => {
    if (isBLSEnabled) {
      return `${formatAmountHelper(amount)} BLS`;
    }
    return `$${formatAmountHelper(amount)}`;
  };

  const { summary, recent } = userEarnings;

  const EarningCard = ({ title, amount, icon, color, recentTransactions }: any) => (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-${color}-500/20 rounded-xl`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">{title}</div>
          <div className={`text-2xl font-bold text-${color}-400`}>
            {formatAmount(amount)}
          </div>
        </div>
      </div>
      <div className="space-y-2 mt-4">
        <div className="text-xs text-slate-500 font-medium uppercase">Recent</div>
        {Array.isArray(recentTransactions) && recentTransactions.length > 0 ? (
          recentTransactions.map((tx: any) => {
            const safeAmount = tx.amount ?? 0;
            return (
              <div key={tx._id} className="flex justify-between items-center text-sm p-2 bg-slate-800/30 rounded-lg">
                <span className="text-slate-400 text-xs truncate max-w-[200px]">
                  {tx.description || "Earning"}
                </span>
                <span className={`font-bold text-${color}-400`}>
                  +{formatAmount(safeAmount)}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-slate-600 italic">No earnings yet</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Total Earnings Card */}
      <div className="p-8 bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl border border-purple-500/30 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-purple-200 mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Total Earnings
            </div>
            <div className="text-5xl font-bold mb-2">
              {formatAmount(summary.totalEarnings)}
            </div>
            <div className="text-sm text-purple-300">
              {isBLSEnabled
                ? "Lifetime earnings in BellCoin Stable (BLS). Swap to USDT anytime."
                : "Lifetime earnings from all sources"}
            </div>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
            <Award className="w-12 h-12 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EarningCard
          title="Daily Yield"
          amount={summary.totalYield}
          icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
          color="emerald"
          recentTransactions={recent.yield}
        />
        {referralBonusesEnabled ? (
          <>
            <EarningCard
              title="Direct Commissions (L1)"
              amount={summary.totalDirectCommissions}
              icon={<Users className="w-6 h-6 text-purple-400" />}
              color="purple"
              recentTransactions={recent.directCommissions}
            />
            <EarningCard
              title="Indirect Commissions (L2)"
              amount={summary.totalIndirectCommissions}
              icon={<Users className="w-6 h-6 text-blue-400" />}
              color="blue"
              recentTransactions={recent.indirectCommissions}
            />
          </>
        ) : (
          <EarningCard
            title="Unilevel Commissions"
            amount={summary.totalUnilevelCommissions || 0}
            icon={<Network className="w-6 h-6 text-indigo-400" />}
            color="indigo"
            recentTransactions={recent.unilevelCommissions || []}
          />
        )}
        <EarningCard
          title="B-Rank Bonuses"
          amount={summary.totalVRankBonuses}
          icon={<Award className="w-6 h-6 text-pink-400" />}
          color="pink"
          recentTransactions={recent.vrankBonuses}
        />
      </div>

      {/* BLS Info Card (when enabled) */}
      {isBLSEnabled && (
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Coins className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-purple-300 mb-1">BellCoin Stable (BLS) System Active</h3>
              <p className="text-sm text-purple-200/80">
                All your earnings are paid in BLS (BellCoin Stable). You can swap your BLS to USDT instantly at any time from the Swap BLS tab.
                Your BLS balance is separate from your USDT wallet balance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold mb-2">How Earnings Work</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• <strong>Daily Yield:</strong> Earnings from your active stakes {isBLSEnabled && "(paid in BLS)"}</li>
              {referralBonusesEnabled ? (
                <>
                  <li>• <strong>Direct Commissions (L1):</strong> 15% of your direct referrals' daily yield {isBLSEnabled && "(paid in BLS)"}</li>
                  <li>• <strong>Indirect Commissions (L2):</strong> 10% of your indirect referrals' daily yield {isBLSEnabled && "(paid in BLS)"}</li>
                </>
              ) : (
                <li>• <strong>Unilevel Commissions:</strong> Earn from 10 levels of your network (up to 16% total) {isBLSEnabled && "(paid in BLS)"}</li>
              )}
              <li>• <strong>B-Rank Bonuses:</strong> Additional % based on your B-Rank level {isBLSEnabled && "(paid in BLS)"}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ userProfile, toast, loginId }: any) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const updatePassword = useCachedMutation(api.users.updatePassword);
  
  // Fetch 2FA requirement and status
  // Use getSystemPauseStates as primary source (it includes twoFactorRequired)
  const pauseStatesFor2FA = useCachedQuery(api.configs.getSystemPauseStates);
  // Try to get detailed 2FA requirement (for enabledAt timestamp), but don't break if it's not available
  const twoFactorRequirement = useCachedQuery(api.configs.get2FARequirement, "skip"); // Skip for now to avoid errors
  const is2FARequired = pauseStatesFor2FA?.twoFactorRequired ?? twoFactorRequirement?.isRequired ?? false;
  const is2FAEnabled = userProfile?.twoFactorEnabled ?? false;
  const twoFactorSetupAt = userProfile?.twoFactorSetupAt;
  
  // Calculate grace period info
  const gracePeriodInfo = useMemo(() => {
    if (!is2FARequired || is2FAEnabled || !userProfile) return null;
    
    const requirementEnabledAt = twoFactorRequirement?.enabledAt;
    if (!requirementEnabledAt) return null;
    
    const userCreatedAt = userProfile.createdAt;
    const userRequiredAt = userProfile.twoFactorRequiredAt || userCreatedAt;
    const gracePeriodEnd = userRequiredAt + (30 * 24 * 60 * 60 * 1000); // 30 days
    const now = Date.now();
    const daysRemaining = Math.ceil((gracePeriodEnd - now) / (24 * 60 * 60 * 1000));
    
    if (now >= gracePeriodEnd) {
      return { expired: true, daysRemaining: 0 };
    }
    
    return { expired: false, daysRemaining };
  }, [is2FARequired, is2FAEnabled, userProfile, twoFactorRequirement]);

  const handleUpdatePassword = async () => {
    if (!userProfile?._id) return;
    if (newPassword.length < 6) {
      toast.warning("New password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await updatePassword({
        userId: userProfile._id,
        oldPassword,
        newPassword
      });
      toast.success("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
    } catch (e: any) {
      const msg = e.message || e.toString();
      toast.error("Failed to update password: " + msg.replace(/Uncaught AppError: /, ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 p-4 sm:p-0">
      {/* Profile Settings */}
      <section className="bg-theme-secondary/50 backdrop-blur-sm rounded-2xl border border-theme-primary p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <User className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-theme-primary">Profile Settings</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Full Name</label>
            <input
              type="text"
              defaultValue={userProfile?.name}
              className="w-full p-3 sm:p-3 text-base sm:text-sm bg-theme-tertiary dark:bg-slate-800 light:bg-white rounded-xl border border-theme-secondary dark:border-slate-700 light:border-gray-300 focus:border-purple-500 dark:focus:border-purple-500 light:focus:border-indigo-500 outline-none text-theme-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Email Address</label>
            <input
              type="email"
              defaultValue={userProfile?.email}
              disabled
              className="w-full p-3 sm:p-3 text-base sm:text-sm bg-theme-tertiary/50 dark:bg-slate-800/50 light:bg-gray-100 rounded-xl border border-theme-secondary dark:border-slate-700 light:border-gray-300 text-theme-tertiary cursor-not-allowed"
            />
          </div>
          <button className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold transition-all text-white">
            Save Changes
          </button>
        </div>
      </section>

      {/* Security Settings */}
      <section className="bg-theme-secondary/50 backdrop-blur-sm rounded-2xl border border-theme-primary p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold">Security</h2>
        </div>
        <div className="space-y-6">
          {/* 2FA Status */}
          <div className="p-4 bg-theme-tertiary/50 dark:bg-slate-800/50 light:bg-gray-100 rounded-xl border border-theme-secondary dark:border-slate-700 light:border-gray-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <div className="font-bold text-theme-primary">Two-Factor Authentication</div>
                  {is2FAEnabled && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
                      Enabled
                    </span>
                  )}
                </div>
                <div className="text-xs text-theme-secondary mb-2">
                  {is2FAEnabled 
                    ? `Enabled on ${twoFactorSetupAt ? new Date(twoFactorSetupAt).toLocaleDateString() : 'N/A'}`
                    : "Add an extra layer of security to your account."
                  }
                </div>
                {!is2FAEnabled && is2FARequired && gracePeriodInfo && (
                  <div className={`text-xs p-2 rounded-lg ${
                    gracePeriodInfo.expired 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                      : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  }`}>
                    {gracePeriodInfo.expired 
                      ? "⚠️ 2FA setup is required. Please set it up now to continue using the platform."
                      : `⏰ You have ${gracePeriodInfo.daysRemaining} days remaining to set up 2FA.`
                    }
                  </div>
                )}
              </div>
              {!is2FAEnabled && (
                <button 
                  onClick={() => setShow2FASetup(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-sm font-bold transition-all"
                >
                  {is2FARequired ? "Set Up 2FA" : "Enable 2FA"}
                </button>
              )}
            </div>
          </div>

          {/* 2FA Setup Modal */}
          {show2FASetup && userProfile?._id && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Set Up 2FA</h3>
                  <button
                    onClick={() => setShow2FASetup(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                  <TwoFactorSetup
                    userId={userProfile._id}
                    onComplete={() => {
                      setShow2FASetup(false);
                      toast.success("2FA enabled successfully!");
                      // Refresh user profile
                      window.location.reload();
                    }}
                    onCancel={() => setShow2FASetup(false)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-theme-tertiary/50 dark:bg-slate-800/50 light:bg-gray-100 rounded-xl border border-theme-secondary dark:border-slate-700 light:border-gray-300">
            <div className="font-bold mb-4 flex items-center gap-2 text-theme-primary">
              <Lock className="w-4 h-4" /> Change Password
            </div>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Current Password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full p-3 sm:p-3 text-base sm:text-sm bg-theme-primary dark:bg-slate-900 light:bg-white rounded-lg border border-theme-secondary dark:border-slate-700 light:border-gray-300 focus:border-purple-500 dark:focus:border-purple-500 light:focus:border-indigo-500 outline-none text-theme-primary"
              />
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 sm:p-3 text-base sm:text-sm bg-theme-primary dark:bg-slate-900 light:bg-white rounded-lg border border-theme-secondary dark:border-slate-700 light:border-gray-300 focus:border-purple-500 dark:focus:border-purple-500 light:focus:border-indigo-500 outline-none text-theme-primary"
              />
              <button
                onClick={handleUpdatePassword}
                disabled={loading}
                className="w-full py-2 sm:py-2 bg-theme-tertiary dark:bg-slate-700 light:bg-gray-200 hover:bg-purple-600 dark:hover:bg-purple-600 light:hover:bg-indigo-600 rounded-lg text-sm font-bold transition-all text-theme-primary dark:text-white light:text-gray-900"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Address Book */}
      <section className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
        <AddressBook userId={userProfile?._id} toast={toast} />
      </section>

      {/* Account Management Section */}
      {loginId && (
        <section className="lg:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-theme-primary mb-2">Account Management</h2>
            <p className="text-sm text-theme-secondary">
              Create and manage multiple accounts. Each account operates independently with its own wallet, stakes, and referral network.
            </p>
          </div>
          <AccountProvider loginId={loginId}>
            <AccountSettings loginId={loginId} />
          </AccountProvider>
        </section>
      )}
    </div >
  )
}

const CustomNode = ({ nodeDatum, toggleNode }: any) => {
  const level = nodeDatum.attributes?.Level || 0;
  const directs = nodeDatum.attributes?.Directs || 0;
  const unlocked = nodeDatum.attributes?.Unlocked || "0/10";
  
  // Color coding by level
  const getLevelColor = (level: number) => {
    const colors = [
      "#8b5cf6", // L0 - Purple
      "#6366f1", // L1 - Indigo
      "#3b82f6", // L2 - Blue
      "#10b981", // L3 - Green
      "#f59e0b", // L4 - Amber
      "#ef4444", // L5 - Red
      "#ec4899", // L6 - Pink
      "#8b5cf6", // L7 - Purple
      "#6366f1", // L8 - Indigo
      "#3b82f6", // L9 - Blue
      "#10b981", // L10 - Green
    ];
    return colors[Math.min(level, colors.length - 1)];
  };

  const nodeColor = getLevelColor(level);
  
  return (
    <g>
      <circle 
        r="35" 
        fill="#1e293b" 
        stroke={nodeColor} 
        strokeWidth="2.5" 
        onClick={toggleNode}
        style={{ cursor: "pointer" }}
      />
      <text 
        fill="white" 
        x="45" 
        y="-15" 
        strokeWidth="0" 
        fontSize="13" 
        fontWeight="bold"
      >
        {nodeDatum.name}
      </text>
      <text 
        fill="#94a3b8" 
        x="45" 
        y="0" 
        strokeWidth="0" 
        fontSize="11"
      >
        {nodeDatum.attributes?.Rank} • {nodeDatum.attributes?.Volume}
      </text>
      <text 
        fill={nodeColor} 
        x="45" 
        y="15" 
        strokeWidth="0" 
        fontSize="10"
        fontWeight="600"
      >
        Directs: {directs} • Unlocked: {unlocked}
      </text>
    </g>
  );
};
