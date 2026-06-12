"use client";

import { type LocaleCode, getUiCopy, localePath } from "@study/core/i18n";
import type { ArticleIndexItem } from "@study/core/types";
import { LanguageSwitcher } from "@study/ui/LanguageSwitcher";
import Link from "next/link";
import { haptic } from "../lib/haptics";
import { TabBar } from "./TabBar";

function shortTitle(title: string) {
  return title
    .replace(/^CNN This Morning\s*·\s*\d{4}-\d{2}-\d{2}\s*·\s*/, "")
    .replace(/^CNN This Morning\s*·\s*/, "");
}

export function HomePage({
  articles,
  locale,
}: {
  articles: ArticleIndexItem[];
  locale: LocaleCode;
}) {
  const copy = getUiCopy(locale);
  const todayArticle = articles[0];
  const totalVocab = articles.reduce(
    (count, article) => count + article.vocabCount,
    0,
  );
  const totalSentences = articles.reduce(
    (count, article) => count + article.sentenceCount,
    0,
  );

  return (
    <main className="min-h-dvh overflow-hidden bg-bg pb-28 text-text">
      <header className="safe-x sticky top-0 z-30 flex h-[calc(env(safe-area-inset-top)+4rem)] items-end justify-between gap-4 border-b border-line bg-bg/92 pb-3 backdrop-blur-xl">
        <Link
          href={localePath(locale)}
          className="flex items-center gap-3"
          onClick={() => haptic("tap")}
        >
          <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-brand text-sm font-black text-white shadow-sm">
            CNN
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
              {copy.siteKicker}
            </p>
            <h1 className="text-lg font-black text-text">{copy.siteName}</h1>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} compact />
        </div>
      </header>

      <section className="safe-x pt-5">
        <div className="rounded-[8px] border border-line bg-panel p-4 shadow-[var(--shadow)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                Daily intensive reading
              </p>
              <h2 className="mt-3 text-[2.2rem] font-black leading-[1.02] tracking-normal text-text">
                {copy.heroTitle}
              </h2>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-brand-soft font-mono text-sm font-black text-brand">
              {articles.length}
            </span>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-sub">
            {copy.heroText}
          </p>
        </div>

        <article className="mt-4 overflow-hidden rounded-[8px] border border-line bg-[#111713] text-[#edf7f0] shadow-[var(--shadow)]">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#43d4c4] px-3 py-1 text-xs font-black text-[#08120f]">
                {copy.todayArticle}
              </span>
              <span className="font-mono text-xs font-black text-white/45">
                {todayArticle?.date || "--"}
              </span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-2xl font-black leading-tight">
              {todayArticle
                ? shortTitle(todayArticle.title)
                : "CNN This Morning"}
            </h3>
            <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-white/68">
              {todayArticle?.summary || copy.noArticles}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-[8px] bg-white/[0.07] p-3">
                <p className="text-[10px] text-white/45">{copy.articles}</p>
                <p className="mt-1 text-xl font-black">{articles.length}</p>
              </div>
              <div className="rounded-[8px] bg-white/[0.07] p-3">
                <p className="text-[10px] text-white/45">{copy.words}</p>
                <p className="mt-1 text-xl font-black">{totalVocab}</p>
              </div>
              <div className="rounded-[8px] bg-white/[0.07] p-3">
                <p className="text-[10px] text-white/45">{copy.sentences}</p>
                <p className="mt-1 text-xl font-black">{totalSentences}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
              {todayArticle ? (
                <Link
                  href={localePath(locale, `/articles/${todayArticle.date}`)}
                  onClick={() => haptic("selection")}
                  className="tap-highlight flex h-12 items-center justify-center rounded-[8px] bg-brand text-sm font-black text-white active:scale-[0.99]"
                >
                  {copy.startLearning}
                </Link>
              ) : null}
              <Link
                href={localePath(locale, "/articles")}
                onClick={() => haptic("selection")}
                aria-label={copy.articles}
                className="tap-highlight grid h-12 w-12 place-items-center rounded-[8px] border border-white/12 bg-white/[0.07] text-lg font-black text-white active:scale-[0.99]"
              >
                <span aria-hidden="true">☰</span>
              </Link>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6">
        <div className="safe-x mb-3 flex items-end justify-between">
          <h2 className="text-lg font-black text-text">{copy.features}</h2>
          <span className="text-xs font-black text-sub">{copy.studyPath}</span>
        </div>
        <div className="safe-x grid grid-cols-2 gap-3">
          {copy.featureCards.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[8px] border border-line bg-panel p-3 shadow-sm"
            >
              <div className="flex min-h-16 flex-col justify-between gap-2">
                <h3 className="text-base font-black leading-tight text-text">
                  {feature.title}
                </h3>
                <span className="w-fit rounded-[8px] bg-brand-soft px-2 py-1 font-mono text-xs font-black text-brand">
                  {feature.value}
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold leading-5 text-sub">
                {feature.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="safe-x mt-6">
        <div className="rounded-[8px] border border-line bg-panel p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-black text-text">{copy.studyPath}</h2>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-black text-brand">
              {copy.steps.length}
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {copy.steps.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft font-mono text-xs font-black text-brand">
                  {index + 1}
                </span>
                <span className="text-sm font-black text-text">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TabBar locale={locale} />
    </main>
  );
}
