"use client";

import { getStoredTheme, setStoredTheme } from "@study/core/storage";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = getStoredTheme();
    const preferred =
      stored ||
      (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
        ? "dark"
        : "light");
    setTheme(preferred);
    applyTheme(preferred);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-panel text-lg text-text transition hover:border-brand hover:text-brand"
      aria-label={theme === "dark" ? "切换到明亮模式" : "切换到暗色模式"}
      title={theme === "dark" ? "明亮模式" : "暗色模式"}
    >
      <span aria-hidden>{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
