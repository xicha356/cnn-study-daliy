"use client";

import {
  type LocaleCode,
  getLocaleConfig,
  getUiCopy,
  localePath,
} from "@study/core/i18n";
import type { ArticleIndexItem } from "@study/core/types";
import Link from "next/link";
import { haptic } from "../lib/haptics";
import { TabBar } from "./TabBar";
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

function ArticleMeta({
  article,
  locale,
}: {
  article: ArticleIndexItem;
  locale: LocaleCode;
}) {
  const copy = getUiCopy(locale);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-black text-sub">
      <span>{formatDate(article.date, locale)}</span>
      <span className="h-1 w-1 rounded-full bg-line" />
      <span>
        {article.vocabCount} {copy.words}
      </span>
      <span className="h-1 w-1 rounded-full bg-line" />
      <span>
        {article.sentenceCount} {copy.sentences}
      </span>
    </div>
  );
}

export function ArticleListPage({
  articles,
  locale,
}: {
  articles: ArticleIndexItem[];
  locale: LocaleCode;
}) {
  const copy = getUiCopy(locale);
  const mobileCopy = getMobileCopy(locale);
  const latestArticle = articles[0];

  return (
    <main className="min-h-dvh bg-bg pb-28 text-text">
      <header className="safe-x sticky top-0 z-30 border-b border-line bg-bg/92 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">
          {copy.siteKicker}
        </p>
        <h1 className="mt-1 text-2xl font-black text-text">
          {mobileCopy.nav.articles}
        </h1>
      </header>

      <section className="safe-x mx-auto max-w-screen-sm py-4">
        {latestArticle ? (
          <Link
            href={localePath(locale, `/articles/${latestArticle.date}`)}
            onClick={() => haptic("selection")}
            className="tap-highlight block rounded-[8px] border border-brand bg-panel p-5 shadow-[var(--shadow)] active:scale-[0.99]"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="rounded-full bg-brand px-3 py-1 text-xs font-black text-white">
                {copy.todayArticle}
              </span>
              <span className="text-xs font-black text-sub">
                {latestArticle.date}
              </span>
            </div>
            <ArticleMeta article={latestArticle} locale={locale} />
            <h2 className="mt-4 text-xl font-black leading-tight text-text">
              {shortTitle(latestArticle.title)}
            </h2>
            <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-sub">
              {latestArticle.summary}
            </p>
          </Link>
        ) : (
          <div className="rounded-[8px] border border-line bg-panel p-5 text-sm leading-6 text-sub">
            {copy.noArticles}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {articles.slice(1).map((article) => (
            <Link
              key={article.date}
              href={localePath(locale, `/articles/${article.date}`)}
              onClick={() => haptic("selection")}
              className="tap-highlight block rounded-[8px] border border-line bg-panel p-4 transition active:scale-[0.99]"
            >
              <ArticleMeta article={article} locale={locale} />
              <h2 className="mt-3 text-base font-black leading-snug text-text">
                {shortTitle(article.title)}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-sub">
                {article.summary}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <TabBar locale={locale} />
    </main>
  );
}
