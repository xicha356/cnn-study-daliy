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
  const currentLocale = getLocaleConfig(locale);

  function changeLanguage(value: string) {
    const nextLocale = normalizeLocale(value);
    setStoredLocale(nextLocale);
    const targetPath = switchLocalePath(window.location.pathname, nextLocale);
    window.location.href = `${targetPath}${window.location.search}${window.location.hash}`;
  }

  if (compact) {
    return (
      <label
        className={cn(
          "focus-within:ring-brand/35 relative grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-line bg-panel text-lg text-text shadow-sm transition active:scale-[0.98] focus-within:ring-2",
          className,
        )}
        title={`${currentLocale.nativeLabel} · ${currentLocale.code}`}
      >
        <span className="sr-only">Language</span>
        <span aria-hidden="true" className="leading-none">
          {currentLocale.flag}
        </span>
        <select
          aria-label="Language"
          value={locale}
          onChange={(event) => changeLanguage(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {SUPPORTED_LOCALES.map((code) => {
            const config = getLocaleConfig(code);
            return (
              <option key={code} value={code}>
                {config.flag} {config.nativeLabel}
              </option>
            );
          })}
        </select>
      </label>
    );
  }

  return (
    <label
      className={cn(
        "focus-within:ring-brand/35 flex items-center rounded-[8px] border border-line bg-panel text-sm font-black text-text focus-within:ring-2",
        "h-10 px-3",
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
              {config.flag} {config.nativeLabel} · {code}
            </option>
          );
        })}
      </select>
    </label>
  );
}
