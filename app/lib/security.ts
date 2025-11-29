/**
 * Get client IP address and user agent
 * Used for security logging
 */

export async function getClientInfo(): Promise<{
    ipAddress?: string;
    userAgent?: string;
}> {
    const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : undefined;

    // Try to get IP address from a public API
    // In production, you might want to use your own backend endpoint
    let ipAddress: string | undefined;

    try {
        // Use a free IP detection service
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        ipAddress = data.ip;
    } catch (error) {
        console.warn("Could not fetch IP address:", error);
        // IP address will be undefined, which is acceptable
    }

    return {
        ipAddress,
        userAgent,
    };
}

/**
 * Validate password strength on client side
 * Provides immediate feedback to users
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
} {
    const errors: string[] = [];
    let score = 0;

    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
    } else {
        score++;
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
    } else {
        score++;
    }

    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
    } else {
        score++;
    }

    if (!/[0-9]/.test(password)) {
        errors.push("Password must contain at least one number");
    } else {
        score++;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push("Password must contain at least one special character");
    } else {
        score++;
    }

    return {
        isValid: errors.length === 0,
        errors,
        score: Math.min(score, 4),
    };
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): {
    label: string;
    color: string;
} {
    switch (score) {
        case 0:
        case 1:
            return { label: "Weak", color: "text-red-600" };
        case 2:
            return { label: "Fair", color: "text-orange-600" };
        case 3:
            return { label: "Good", color: "text-yellow-600" };
        case 4:
        case 5:
            return { label: "Strong", color: "text-green-600" };
        default:
            return { label: "Weak", color: "text-red-600" };
    }
}
