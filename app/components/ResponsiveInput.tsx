"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface ResponsiveInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const ResponsiveInput = forwardRef<HTMLInputElement, ResponsiveInputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-theme-secondary mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full p-3 sm:p-3 text-base sm:text-sm bg-theme-tertiary dark:bg-slate-800/50 light:bg-white rounded-xl border ${
            error
              ? "border-red-500 dark:border-red-500 light:border-red-500"
              : "border-theme-secondary dark:border-slate-700 light:border-gray-300 focus:border-purple-500 dark:focus:border-purple-500 light:focus:border-indigo-500"
          } outline-none transition-all text-theme-primary placeholder:text-theme-tertiary ${className}`}
          {...props}
        />
        {error && (
          <p className="text-red-500 text-sm mt-1">{error}</p>
        )}
      </div>
    );
  }
);

ResponsiveInput.displayName = "ResponsiveInput";

