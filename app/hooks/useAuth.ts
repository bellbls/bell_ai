import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { getClientInfo } from "../lib/security";

/**
 * Custom Authentication Hook
 * Manages user authentication state and security features
 */

interface AuthUser {
    _id: Id<"users">;
    name: string;
    email: string;
    emailVerified?: boolean;
    role?: string;
    walletBalance: number;
    currentRank: string;
    referralCode: string;
    lastLoginAt?: number;
}

interface LoginCredentials {
    email: string;
    password: string;
}

interface RegisterCredentials {
    name: string;
    email: string;
    password: string;
    referralCode: string;
}

export function useAuth() {
    const [loginId, setLoginId] = useState<Id<"logins"> | null>(null);
    const [accountId, setAccountId] = useState<Id<"accounts"> | null>(null);
    const [userId, setUserId] = useState<Id<"users"> | null>(null); // Legacy support
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Mutations
    const loginMutation = useMutation(api.users.login);
    const registerMutation = useMutation(api.users.register);
    // Actions (for 2FA - needs Node.js APIs)
    const completeLoginWith2FAAction = useAction(api.twoFactorActions.completeLoginWith2FA);

    // Queries
    const userQuery = useQuery(
        api.users.getUserById,
        userId ? { userId } : "skip"
    );

    // Query to get loginId from userId (for legacy users)
    const loginFromUser = useQuery(
        api.users.getLoginByUserId,
        userId && !loginId ? { userId } : "skip"
    );

    // Load login and account from localStorage on mount
    useEffect(() => {
        const storedLoginId = localStorage.getItem("loginId");
        const storedAccountId = localStorage.getItem("accountId");
        const storedUserId = localStorage.getItem("userId"); // Legacy support
        
        if (storedLoginId) {
            setLoginId(storedLoginId as Id<"logins">);
        }
        if (storedAccountId) {
            setAccountId(storedAccountId as Id<"accounts">);
        }
        if (storedUserId) {
            setUserId(storedUserId as Id<"users">);
        }
        setIsLoading(false);
    }, []);

    // If we have userId but no loginId, try to get loginId from user
    useEffect(() => {
        if (userId && !loginId && loginFromUser) {
            setLoginId(loginFromUser.loginId);
            if (loginFromUser.accountId) {
                setAccountId(loginFromUser.accountId);
            }
        }
    }, [userId, loginId, loginFromUser]);

    // Update user state when query returns
    useEffect(() => {
        if (userQuery) {
            setUser(userQuery as AuthUser);
        }
    }, [userQuery]);

    // Login function
    const login = async (credentials: LoginCredentials) => {
        try {
            const clientInfo = await getClientInfo();
            const result = await loginMutation({
                email: credentials.email,
                password: credentials.password,
                ...clientInfo,
            });

            // Check if 2FA is required
            if (typeof result === "object" && result !== null && "requires2FA" in result) {
                if (result.requires2FA) {
                    // Return 2FA requirement info
                    return {
                        requires2FA: true,
                        loginId: result.loginId,
                        accountId: result.accountId,
                        userId: result.userId, // Legacy
                        gracePeriodInfo: result.gracePeriodInfo || null,
                    };
                } else {
                    // Login successful but within grace period
                    const loginId = result.loginId;
                    const accountId = result.accountId;
                    localStorage.setItem("loginId", loginId);
                    localStorage.setItem("accountId", accountId);
                    setLoginId(loginId);
                    setAccountId(accountId);
                    
                    // Track all loginIds the user has logged into
                    const allLoginIds = JSON.parse(localStorage.getItem("allLoginIds") || "[]");
                    if (!allLoginIds.includes(loginId)) {
                        allLoginIds.push(loginId);
                        localStorage.setItem("allLoginIds", JSON.stringify(allLoginIds));
                    }
                    
                    return {
                        success: true,
                        loginId,
                        accountId,
                        userId: result.userId, // Legacy
                        gracePeriodInfo: result.gracePeriodInfo || null,
                    };
                }
            }

            // New system: result has loginId and accountId
            if (typeof result === "object" && result !== null && "loginId" in result) {
                const loginId = result.loginId;
                const accountId = result.accountId;
                const userId = result.userId; // Legacy support
                
                if (loginId) {
                    localStorage.setItem("loginId", loginId);
                    setLoginId(loginId);
                    
                    // Track all loginIds the user has logged into
                    const allLoginIds = JSON.parse(localStorage.getItem("allLoginIds") || "[]");
                    if (!allLoginIds.includes(loginId)) {
                        allLoginIds.push(loginId);
                        localStorage.setItem("allLoginIds", JSON.stringify(allLoginIds));
                    }
                }
                if (accountId) {
                    localStorage.setItem("accountId", accountId);
                    setAccountId(accountId);
                }
                if (userId) {
                    localStorage.setItem("userId", userId);
                    setUserId(userId);
                }
                
                return { success: true, loginId, accountId, userId };
            }

            // Legacy system: result is userId string
            if (typeof result === "string" || (typeof result === "object" && result !== null && "legacyUserId" in result)) {
                const userId = typeof result === "string" ? result : result.legacyUserId;
                localStorage.setItem("userId", userId);
                setUserId(userId);
                return { success: true, userId };
            }

            return { success: true };
        } catch (error: any) {
            console.error("Login error:", error);
            throw error;
        }
    };

    // Complete login with 2FA code
    const completeLoginWith2FA = async ({ userId, twoFactorCode }: { userId: Id<"users">; twoFactorCode: string }) => {
        try {
            const clientInfo = await getClientInfo();
            const result = await completeLoginWith2FAAction({
                userId,
                code: twoFactorCode,
                ipAddress: clientInfo.ipAddress,
                userAgent: clientInfo.userAgent,
            });

            // Store userId in localStorage
            localStorage.setItem("userId", result.userId);
            setUserId(result.userId);

            return { success: true, userId: result.userId };
        } catch (error: any) {
            console.error("2FA verification error:", error);
            throw error;
        }
    };

    // Register function
    const register = async (credentials: RegisterCredentials) => {
        try {
            const clientInfo = await getClientInfo();
            const result = await registerMutation({
                name: credentials.name,
                email: credentials.email,
                password: credentials.password,
                referralCode: credentials.referralCode,
                ...clientInfo,
            });

            // New system: result is { loginId, accountId }
            if (typeof result === "object" && result !== null && "loginId" in result) {
                const loginId = result.loginId;
                const accountId = result.accountId;
                localStorage.setItem("loginId", loginId);
                localStorage.setItem("accountId", accountId);
                setLoginId(loginId);
                setAccountId(accountId);
                
                // Track all loginIds the user has logged into
                const allLoginIds = JSON.parse(localStorage.getItem("allLoginIds") || "[]");
                if (!allLoginIds.includes(loginId)) {
                    allLoginIds.push(loginId);
                    localStorage.setItem("allLoginIds", JSON.stringify(allLoginIds));
                }
                
                return { success: true, loginId, accountId };
            }

            // Legacy system: result is userId string
            const userId = result as Id<"users">;
            localStorage.setItem("userId", userId);
            setUserId(userId);

            return { success: true, userId };
        } catch (error: any) {
            console.error("Registration error:", error);
            throw error;
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem("loginId");
        localStorage.removeItem("accountId");
        localStorage.removeItem("userId"); // Legacy
        setLoginId(null);
        setAccountId(null);
        setUserId(null);
        setUser(null);
    };

    // Check if user is authenticated
    const isAuthenticated = !!(loginId && accountId) || !!(userId && user);

    // Check if user is admin
    const isAdmin = user?.role === "admin";

    // Check if email is verified
    const isEmailVerified = user?.emailVerified || false;

    return {
        user,
        userId, // Legacy
        loginId,
        accountId,
        isAuthenticated,
        isAdmin,
        isEmailVerified,
        isLoading,
        login,
        register,
        logout,
        completeLoginWith2FA,
    };
}
