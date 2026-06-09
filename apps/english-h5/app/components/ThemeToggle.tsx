"use client";

import { getStoredTheme, setStoredTheme } from "@study/core/storage";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

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
      <span aria-hidden="true" className="text-base leading-none">
        {theme === "dark" ? "D" : "L"}
      </span>
      {!compact ? <span>{theme === "dark" ? "深色" : "浅色"}</span> : null}
    </button>
  );
}
