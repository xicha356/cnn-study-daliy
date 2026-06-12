"use client";

import { type LocaleCode, getLocaleConfig, localePath } from "@study/core/i18n";
import type { ArticleIndexItem } from "@study/core/types";
import Link from "next/link";
import { useEffect } from "react";
import { haptic } from "../lib/haptics";
import { getMobileCopy } from "./mobileCopy";

function formatDate(date: string, locale: LocaleCode) {
  return new Intl.DateTimeFormat(getLocaleConfig(locale).dateLocale, {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function shortTitle(title: string) {
  return title
    .replace(/^CNN This Morning\s*·\s*\d{4}-\d{2}-\d{2}\s*·\s*/, "")
    .replace(/^CNN This Morning\s*·\s*/, "");
}

export function ArticleDrawer({
  articles,
  currentDate,
  locale,
  open,
  onClose,
}: {
  articles: ArticleIndexItem[];
  currentDate: string;
  locale: LocaleCode;
  open: boolean;
  onClose: () => void;
}) {
  const mobileCopy = getMobileCopy(locale);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={[
        "fixed inset-0 z-50 transition",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={mobileCopy.articleDrawer.close}
        className={[
          "absolute inset-0 bg-black/40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={() => {
          haptic("tap");
          onClose();
        }}
      />
      <aside
        className={[
          "absolute inset-y-0 right-0 flex w-[min(88vw,22rem)] flex-col border-l border-line bg-panel pt-[env(safe-area-inset-top)] shadow-[var(--shadow)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        aria-label={mobileCopy.articleDrawer.title}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <h2 className="text-base font-black text-text">
            {mobileCopy.articleDrawer.title}
          </h2>
          <button
            type="button"
            onClick={() => {
              haptic("tap");
              onClose();
            }}
            className="h-9 w-9 rounded-full bg-muted text-sm font-black text-sub"
            aria-label={mobileCopy.articleDrawer.close}
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {articles.map((article) => {
            const active = article.date === currentDate;
            return (
              <Link
                key={article.date}
                href={localePath(locale, `/articles/${article.date}`)}
                onClick={() => {
                  haptic("selection");
                  onClose();
                }}
                className={[
                  "tap-highlight mb-2 block rounded-[8px] border p-3 transition active:scale-[0.99]",
                  active
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-bg text-text",
                ].join(" ")}
              >
                <p className="text-xs font-black text-sub">
                  {formatDate(article.date, locale)}
                </p>
                <h3 className="mt-2 line-clamp-2 text-sm font-black leading-5">
                  {shortTitle(article.title)}
                </h3>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-sub">
                  {article.summary}
                </p>
              </Link>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
