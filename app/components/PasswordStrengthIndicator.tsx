"use client";

import { validatePasswordStrength, getPasswordStrengthLabel } from "../lib/security";

interface PasswordStrengthIndicatorProps {
    password: string;
    showRequirements?: boolean;
}

export function PasswordStrengthIndicator({ password, showRequirements = true }: PasswordStrengthIndicatorProps) {
    const validation = validatePasswordStrength(password);
    const { label, color } = getPasswordStrengthLabel(validation.score);

    if (!password) return null;

    return (
        <div className="mt-2 space-y-2">
            {/* Strength Bar */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${validation.score === 0 || validation.score === 1
                                ? "bg-red-600"
                                : validation.score === 2
                                    ? "bg-orange-600"
                                    : validation.score === 3
                                        ? "bg-yellow-600"
                                        : "bg-green-600"
                            }`}
                        style={{ width: `${(validation.score / 5) * 100}%` }}
                    />
                </div>
                <span className={`text-sm font-medium ${color}`}>{label}</span>
            </div>

            {/* Requirements List */}
            {showRequirements && validation.errors.length > 0 && (
                <ul className="text-xs text-gray-600 space-y-1">
                    {validation.errors.map((error, index) => (
                        <li key={index} className="flex items-start gap-1">
                            <span className="text-red-500">•</span>
                            <span>{error}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Success Message */}
            {validation.isValid && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                    <span>✓</span>
                    <span>Password meets all requirements</span>
                </p>
            )}
        </div>
    );
}
