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
    const [userId, setUserId] = useState<Id<"users"> | null>(null);
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

    // Load user from localStorage on mount
    useEffect(() => {
        const storedUserId = localStorage.getItem("userId");
        if (storedUserId) {
            setUserId(storedUserId as Id<"users">);
        }
        setIsLoading(false);
    }, []);

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
                        userId: result.userId,
                        gracePeriodInfo: result.gracePeriodInfo || null,
                    };
                } else {
                    // Login successful but within grace period
                    const userId = result.userId;
                    localStorage.setItem("userId", userId);
                    setUserId(userId);
                    return {
                        success: true,
                        userId,
                        gracePeriodInfo: result.gracePeriodInfo || null,
                    };
                }
            }

            // Normal login success (userId string)
            const userId = result as Id<"users">;
            localStorage.setItem("userId", userId);
            setUserId(userId);

            return { success: true, userId };
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
            const userId = await registerMutation({
                name: credentials.name,
                email: credentials.email,
                password: credentials.password,
                referralCode: credentials.referralCode,
                ...clientInfo,
            });

            // Store userId in localStorage
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
        localStorage.removeItem("userId");
        setUserId(null);
        setUser(null);
    };

    // Check if user is authenticated
    const isAuthenticated = !!userId && !!user;

    // Check if user is admin
    const isAdmin = user?.role === "admin";

    // Check if email is verified
    const isEmailVerified = user?.emailVerified || false;

    return {
        user,
        userId,
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
