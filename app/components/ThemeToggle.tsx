"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-theme-secondary dark:bg-slate-800/50 light:bg-gray-200 hover:bg-theme-tertiary dark:hover:bg-slate-700 light:hover:bg-gray-300 border border-theme-secondary dark:border-slate-700 light:border-gray-300 transition-all duration-200"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-gray-700" />
      )}
    </button>
  );
}

