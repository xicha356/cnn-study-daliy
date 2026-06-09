"use client";

import { getStoredTheme, setStoredTheme } from "@study/core/storage";
import { useEffect, useState } from "react";
import { cn } from "./utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = getStoredTheme();
    const next =
      stored ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    applyTheme(next);
  }, []);

  function applyTheme(next: "light" | "dark") {
    document.documentElement.dataset.theme = next;
    setThemeState(next);
    setStoredTheme(next);
  }

  return (
    <button
      aria-label={theme === "dark" ? "切换到白天模式" : "切换到黑夜模式"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel font-bold text-sub transition hover:border-brand hover:bg-brandSoft hover:text-brand",
        className,
      )}
      onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "切换到白天模式" : "切换到黑夜模式"}
      type="button"
    >
      {theme === "dark" ? "●" : "◐"}
    </button>
  );
}
