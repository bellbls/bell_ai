import { v } from "convex/values";

/**
 * Input Validation & Sanitization
 * Prevents XSS, SQL injection, and other attacks
 */

/**
 * Email validation
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
}

/**
 * Sanitize email (lowercase, trim)
 */
export function sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

/**
 * Password strength validation
 */
export interface PasswordStrength {
    isValid: boolean;
    errors: string[];
    score: number;  // 0-4
}

export function validatePasswordStrength(password: string): PasswordStrength {
    const errors: string[] = [];
    let score = 0;

    // Minimum length
    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
    } else {
        score++;
    }

    // Contains uppercase
    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
    } else {
        score++;
    }

    // Contains lowercase
    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
    } else {
        score++;
    }

    // Contains number
    if (!/[0-9]/.test(password)) {
        errors.push("Password must contain at least one number");
    } else {
        score++;
    }

    // Contains special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push("Password must contain at least one special character");
    } else {
        score++;
    }

    // Check for common passwords
    const commonPasswords = ["password", "12345678", "qwerty", "abc123", "password123"];
    if (commonPasswords.includes(password.toLowerCase())) {
        errors.push("Password is too common");
        score = 0;
    }

    return {
        isValid: errors.length === 0,
        errors,
        score: Math.min(score, 4),
    };
}

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(input: string): string {
    return input
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;")
        .trim();
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
    // Referral codes should be alphanumeric, 6-10 characters
    const referralRegex = /^[A-Z0-9]{6,10}$/;
    return referralRegex.test(code);
}

/**
 * Validate wallet address (Ethereum format)
 */
export function isValidWalletAddress(address: string): boolean {
    // Ethereum address: 0x followed by 40 hex characters
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    return addressRegex.test(address);
}

/**
 * Sanitize wallet address (lowercase, trim)
 */
export function sanitizeWalletAddress(address: string): string {
    return address.toLowerCase().trim();
}

/**
 * Validate amount (positive number, max 2 decimals)
 */
export function isValidAmount(amount: number, min: number = 0, max: number = Infinity): boolean {
    if (typeof amount !== "number" || isNaN(amount)) {
        return false;
    }

    if (amount < min || amount > max) {
        return false;
    }

    // Check decimal places (max 2)
    const decimalPlaces = (amount.toString().split(".")[1] || "").length;
    if (decimalPlaces > 2) {
        return false;
    }

    return true;
}

/**
 * Validate name (letters, spaces, hyphens only)
 */
export function isValidName(name: string): boolean {
    const nameRegex = /^[a-zA-Z\s\-]{2,50}$/;
    return nameRegex.test(name);
}

/**
 * Sanitize name
 */
export function sanitizeName(name: string): string {
    return name.trim().replace(/\s+/g, " ");
}

/**
 * Detect SQL injection patterns
 */
export function containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
        /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
        /(\bUNION\b.*\bSELECT\b)/i,
        /(--|\#|\/\*|\*\/)/,
        /(\bOR\b.*=.*)/i,
        /(\bAND\b.*=.*)/i,
    ];

    return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect XSS patterns
 */
export function containsXSS(input: string): boolean {
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,  // Event handlers like onclick=
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
    ];

    return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Comprehensive input validation
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    sanitized?: any;
}

export function validateInput(
    input: any,
    type: "email" | "password" | "name" | "referralCode" | "walletAddress" | "amount" | "string",
    options?: {
        min?: number;
        max?: number;
        required?: boolean;
    }
): ValidationResult {
    const errors: string[] = [];

    // Check required
    if (options?.required && (!input || input === "")) {
        errors.push("This field is required");
        return { isValid: false, errors };
    }

    // Skip validation if not required and empty
    if (!options?.required && (!input || input === "")) {
        return { isValid: true, errors: [], sanitized: input };
    }

    switch (type) {
        case "email":
            if (!isValidEmail(input)) {
                errors.push("Invalid email address");
            }
            return {
                isValid: errors.length === 0,
                errors,
                sanitized: sanitizeEmail(input),
            };

        case "password":
            const passwordCheck = validatePasswordStrength(input);
            return {
                isValid: passwordCheck.isValid,
                errors: passwordCheck.errors,
                sanitized: input,  // Don't sanitize passwords
            };

        case "name":
            if (!isValidName(input)) {
                errors.push("Name must contain only letters, spaces, and hyphens (2-50 characters)");
            }
            return {
                isValid: errors.length === 0,
                errors,
                sanitized: sanitizeName(input),
            };

        case "referralCode":
            if (!isValidReferralCode(input)) {
                errors.push("Invalid referral code format");
            }
            return {
                isValid: errors.length === 0,
                errors,
                sanitized: input.toUpperCase().trim(),
            };

        case "walletAddress":
            if (!isValidWalletAddress(input)) {
                errors.push("Invalid wallet address");
            }
            return {
                isValid: errors.length === 0,
                errors,
                sanitized: sanitizeWalletAddress(input),
            };

        case "amount":
            if (!isValidAmount(input, options?.min, options?.max)) {
                errors.push(`Invalid amount (min: ${options?.min || 0}, max: ${options?.max || "unlimited"})`);
            }
            return {
                isValid: errors.length === 0,
                errors,
                sanitized: input,
            };

        case "string":
            if (containsSQLInjection(input)) {
                errors.push("Input contains invalid characters");
            }
            if (containsXSS(input)) {
                errors.push("Input contains invalid characters");
            }
            return {
                isValid: errors.length === 0,
                errors,
                sanitized: sanitizeString(input),
            };

        default:
            return { isValid: false, errors: ["Unknown validation type"] };
    }
}
