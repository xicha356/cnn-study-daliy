"use client";

import {
  type LocaleCode,
  SUPPORTED_LOCALES,
  getLocaleConfig,
  normalizeLocale,
  switchLocalePath,
} from "@study/core/i18n";
import { setStoredLocale } from "@study/core/storage";
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
  function changeLanguage(value: string) {
    const nextLocale = normalizeLocale(value);
    setStoredLocale(nextLocale);
    const targetPath = switchLocalePath(window.location.pathname, nextLocale);
    window.location.href = `${targetPath}${window.location.search}${window.location.hash}`;
  }

  return (
    <label
      className={cn(
        "focus-within:ring-brand/35 flex items-center rounded-[8px] border border-line bg-panel text-sm font-black text-text focus-within:ring-2",
        compact ? "h-10 px-2" : "h-10 px-3",
        className,
      )}
      title="Language"
    >
      <span className="sr-only">Language</span>
      <span aria-hidden="true" className="mr-1.5 text-brand">
        A
      </span>
      <select
        aria-label="Language"
        value={locale}
        onChange={(event) => changeLanguage(event.target.value)}
        className="max-w-[8.5rem] bg-transparent text-inherit outline-none"
      >
        {SUPPORTED_LOCALES.map((code) => {
          const config = getLocaleConfig(code);
          return (
            <option key={code} value={code}>
              {compact ? config.nativeLabel : `${config.nativeLabel} · ${code}`}
            </option>
          );
        })}
      </select>
    </label>
  );
}
