/**
 * Error Handling Utilities
 * Provides consistent error handling across the application
 */

import { ConvexError } from "convex/values";

// Error codes
export const ErrorCodes = {
    // User errors
    EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    INVALID_REFERRAL_CODE: 'INVALID_REFERRAL_CODE',

    // Stake errors
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    INVALID_STAKE_AMOUNT: 'INVALID_STAKE_AMOUNT',
    INVALID_CYCLE: 'INVALID_CYCLE',
    STAKE_NOT_FOUND: 'STAKE_NOT_FOUND',

    // Withdrawal errors
    WITHDRAWAL_NOT_FOUND: 'WITHDRAWAL_NOT_FOUND',
    INVALID_WITHDRAWAL_AMOUNT: 'INVALID_WITHDRAWAL_AMOUNT',
    WITHDRAWAL_ALREADY_PROCESSED: 'WITHDRAWAL_ALREADY_PROCESSED',

    // Rank errors
    RANK_ALREADY_EXISTS: 'RANK_ALREADY_EXISTS',
    RANK_NOT_FOUND: 'RANK_NOT_FOUND',
    INVALID_RANK_CONFIG: 'INVALID_RANK_CONFIG',

    // Cycle errors
    CYCLE_ALREADY_EXISTS: 'CYCLE_ALREADY_EXISTS',
    CYCLE_NOT_FOUND: 'CYCLE_NOT_FOUND',
    CYCLE_IN_USE: 'CYCLE_IN_USE',

    // Config errors
    CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
    INVALID_CONFIG: 'INVALID_CONFIG',

    // General errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
};

// User-friendly error messages
export const ErrorMessages: Record<string, string> = {
    [ErrorCodes.EMAIL_ALREADY_EXISTS]: 'This email is already registered. Please use a different email or login.',
    [ErrorCodes.USER_NOT_FOUND]: 'User not found. Please check the user ID.',
    [ErrorCodes.INVALID_REFERRAL_CODE]: 'Invalid referral code. Please check and try again.',

    [ErrorCodes.INSUFFICIENT_BALANCE]: 'Insufficient wallet balance. Please deposit funds first.',
    [ErrorCodes.INVALID_STAKE_AMOUNT]: 'Invalid stake amount. Please enter a valid amount.',
    [ErrorCodes.INVALID_CYCLE]: 'Invalid staking cycle. Please select a valid cycle.',
    [ErrorCodes.STAKE_NOT_FOUND]: 'Stake not found.',

    [ErrorCodes.WITHDRAWAL_NOT_FOUND]: 'Withdrawal request not found.',
    [ErrorCodes.INVALID_WITHDRAWAL_AMOUNT]: 'Invalid withdrawal amount.',
    [ErrorCodes.WITHDRAWAL_ALREADY_PROCESSED]: 'This withdrawal has already been processed.',

    [ErrorCodes.RANK_ALREADY_EXISTS]: 'This rank already exists. Please use a different rank name.',
    [ErrorCodes.RANK_NOT_FOUND]: 'Rank configuration not found.',
    [ErrorCodes.INVALID_RANK_CONFIG]: 'Invalid rank configuration.',

    [ErrorCodes.CYCLE_ALREADY_EXISTS]: 'A staking cycle with this duration already exists.',
    [ErrorCodes.CYCLE_NOT_FOUND]: 'Staking cycle configuration not found.',
    [ErrorCodes.CYCLE_IN_USE]: 'Cannot delete this cycle as it is currently in use.',

    [ErrorCodes.CONFIG_NOT_FOUND]: 'Configuration not found.',
    [ErrorCodes.INVALID_CONFIG]: 'Invalid configuration.',

    [ErrorCodes.VALIDATION_ERROR]: 'Validation error. Please check your input.',
    [ErrorCodes.UNAUTHORIZED]: 'Unauthorized access.',
    [ErrorCodes.INTERNAL_ERROR]: 'An internal error occurred. Please try again later.',
};

/**
 * Create a user-friendly error using ConvexError
 * This provides clean error messages without stack traces to users
 */
export function createError(code: string, customMessage?: string): ConvexError<string> {
    const userMessage = customMessage || ErrorMessages[code] || 'An error occurred. Please try again.';

    // Log technical details for debugging (server-side only)
    console.error(`[Error] Code: ${code}, Message: ${userMessage}`);

    // Return ConvexError with user-friendly message
    return new ConvexError(userMessage);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate amount
 */
export function isValidAmount(amount: number, min: number = 0): boolean {
    return typeof amount === 'number' && !isNaN(amount) && amount > min;
}

/**
 * Validate rank name
 */
export function isValidRankName(rank: string): boolean {
    const rankRegex = /^V\d+$/;
    return rankRegex.test(rank);
}
