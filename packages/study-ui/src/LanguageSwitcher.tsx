"use client";

import {
  type LocaleCode,
  SUPPORTED_LOCALES,
  getLocaleConfig,
  normalizeLocale,
  switchLocalePath,
} from "@study/core/i18n";
import { setStoredLocale } from "@study/core/storage";
import { useEffect, useRef, useState } from "react";
import { cn } from "./utils";

type LanguageSwitcherProps = {
  locale: LocaleCode;
  compact?: boolean;
  className?: string;
};

export function LanguageSwitcher({
  locale,
  compact = false,
  className,
}: LanguageSwitcherProps) {
  const currentLocale = getLocaleConfig(locale);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function changeLanguage(value: string) {
    const nextLocale = normalizeLocale(value);
    if (nextLocale === locale) {
      setOpen(false);
      return;
    }
    setStoredLocale(nextLocale);
    const targetPath = switchLocalePath(window.location.pathname, nextLocale);
    window.location.href = `${targetPath}${window.location.search}${window.location.hash}`;
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-flex shrink-0", className)}
      title={`${currentLocale.nativeLabel} · ${currentLocale.code}`}
    >
      <button
        type="button"
        aria-label={`Language: ${currentLocale.nativeLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "focus:ring-brand/35 group relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-line bg-panel text-text shadow-sm transition hover:-translate-y-px hover:border-brand/70 hover:text-brand hover:shadow-md focus:outline-none focus:ring-2 active:translate-y-0 active:scale-[0.98]",
          compact ? "h-9 w-9 rounded-full" : "h-10 w-10 rounded-[10px]",
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-brand/0 transition group-hover:bg-brand/8"
        />
        <span
          aria-hidden="true"
          className={cn(
            "relative grid place-items-center rounded-full bg-bg/70 shadow-inner ring-1 ring-line/80",
            compact ? "h-6 w-6 text-base" : "h-7 w-7 text-lg",
          )}
        >
          {currentLocale.flag}
        </span>
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full border border-line bg-bg text-[9px] text-muted shadow-sm"
        >
          <svg
            aria-hidden="true"
            className="h-2.5 w-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path
              d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.6 9h16.8M3.6 15h16.8M12 3c2.1 2.3 3.2 5.3 3.2 9S14.1 18.7 12 21c-2.1-2.3-3.2-5.3-3.2-9S9.9 5.3 12 3Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Language"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 max-h-[22rem] w-56 overflow-y-auto rounded-[12px] border border-line bg-panel p-1.5 text-sm text-text shadow-xl"
        >
          {SUPPORTED_LOCALES.map((code) => {
            const config = getLocaleConfig(code);
            const selected = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => changeLanguage(code)}
                className={cn(
                  "flex min-h-10 w-full items-center gap-3 rounded-[8px] px-2.5 text-left transition",
                  selected
                    ? "bg-brand/12 text-brand"
                    : "text-text hover:bg-bg hover:text-brand",
                )}
              >
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bg text-base shadow-inner ring-1 ring-line/70"
                >
                  {config.flag}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black">
                    {config.nativeLabel}
                  </span>
                  <span className="block truncate text-xs font-bold text-muted">
                    {config.label} · {config.code}
                  </span>
                </span>
                {selected ? (
                  <span
                    aria-hidden="true"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-black text-white"
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
