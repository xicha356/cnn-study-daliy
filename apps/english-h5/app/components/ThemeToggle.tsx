"use client";

import { getStoredTheme, setStoredTheme } from "@study/core/storage";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = getStoredTheme();
  if (stored) return stored;
  return "dark";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const nextTheme = getPreferredTheme();
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <button
      type="button"
      aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
      onClick={toggleTheme}
      className={[
        "tap-highlight inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-panel text-sm font-semibold text-text shadow-sm transition active:scale-95",
        compact ? "h-9 w-9" : "h-10 gap-2 px-4",
      ].join(" ")}
    >
      {theme === "dark" ? (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M20 14.2A7.5 7.5 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 4V2m0 20v-2m8-8h2M2 12h2m14.5-6.5L20 4M4 20l1.5-1.5m0-13L4 4m16 16-1.5-1.5M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      )}
      {!compact ? <span>{theme === "dark" ? "深色" : "浅色"}</span> : null}
    </button>
  );
}
