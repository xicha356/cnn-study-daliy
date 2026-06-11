"use client";

import { type LocaleCode, getUiCopy, localePath } from "@study/core/i18n";
import { isArticleStudied } from "@study/core/storage";
import type { ArticleIndexItem } from "@study/core/types";
import { LanguageSwitcher } from "@study/ui/LanguageSwitcher";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

type FilterKey = "all" | "recent" | "audio" | "studied" | "review";

type HomeClientProps = {
  articles: ArticleIndexItem[];
  locale: LocaleCode;
};

function parseDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function isWithinRecentDays(date: string, days: number) {
  const value = parseDate(date).getTime();
  if (Number.isNaN(value)) return false;
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return value >= start.getTime() && value <= now.getTime();
}

function compactDate(date: string) {
  const [, month, day] = date.split("-");
  return `${month}.${day}`;
}

function articleTitle(title: string) {
  return title.replace(/^CNN This Morning\s*·\s*\d{4}-\d{2}-\d{2}\s*·\s*/, "");
}

export function HomeClient({ articles, locale }: HomeClientProps) {
  const copy = getUiCopy(locale);
  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: copy.filters.all },
    { key: "recent", label: copy.filters.recent },
    { key: "audio", label: copy.filters.audio },
    { key: "studied", label: copy.filters.studied },
    { key: "review", label: copy.filters.review },
  ];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [studiedDates, setStudiedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    setStudiedDates(
      new Set(
        articles
          .filter((article) => isArticleStudied(article.date))
          .map((article) => article.date),
      ),
    );
  }, [articles]);

  const latestArticle = articles[0];
  const totalVocab = articles.reduce(
    (count, article) => count + article.vocabCount,
    0,
  );
  const totalSentences = articles.reduce(
    (count, article) => count + article.sentenceCount,
    0,
  );

  const filteredArticles = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesQuery =
        !keyword ||
        [article.title, article.summary, article.date].some((value) =>
          value.toLowerCase().includes(keyword),
        );

      if (!matchesQuery) return false;

      if (filter === "recent") return isWithinRecentDays(article.date, 7);
      if (filter === "audio") return article.hasAudio;
      if (filter === "studied") return studiedDates.has(article.date);
      if (filter === "review") return !studiedDates.has(article.date);
      return true;
    });
  }, [articles, filter, query, studiedDates]);

  return (
    <main className="min-h-screen overflow-hidden bg-bg text-text">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-8">
          <Link href={localePath(locale)} className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-brand text-sm font-black text-white">
              CNN
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand">
                {copy.siteKicker}
              </p>
              <p className="text-base font-black text-text">{copy.siteName}</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {latestArticle ? (
              <Link
                href={localePath(locale, `/articles/${latestArticle.date}`)}
                className="focus-ring rounded-md border border-line bg-panel px-4 py-2 text-sm font-bold text-text transition hover:border-brand hover:text-brand"
              >
                {copy.todayArticle}
              </Link>
            ) : null}
            <LanguageSwitcher locale={locale} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="border-b border-line">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)] items-center gap-12 px-8 py-14">
          <div className="relative z-10">
            <p className="w-fit rounded-md border border-line bg-panel px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-brand">
              Daily CNN intensive reading
            </p>
            <h1 className="mt-7 max-w-3xl text-7xl font-black leading-[0.96] tracking-normal text-text">
              {copy.heroTitle}
            </h1>
            <p className="mt-7 max-w-2xl text-xl font-semibold leading-9 text-sub">
              {copy.heroText}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              {latestArticle ? (
                <Link
                  href={localePath(locale, `/articles/${latestArticle.date}`)}
                  className="focus-ring rounded-md bg-brand px-6 py-3 text-base font-black text-white shadow-sm transition hover:translate-y-[-1px]"
                >
                  {copy.startLearning}
                </Link>
              ) : null}
              <a
                href="#articles"
                className="focus-ring rounded-md border border-line bg-panel px-6 py-3 text-base font-black text-text transition hover:border-brand hover:text-brand"
              >
                {copy.articleLibrary}
              </a>
            </div>
            <dl className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              <div className="border-l-2 border-brand pl-4">
                <dt className="text-sm font-bold text-sub">{copy.articles}</dt>
                <dd className="mt-1 text-3xl font-black text-text">
                  {articles.length}
                </dd>
              </div>
              <div className="border-l-2 border-brand pl-4">
                <dt className="text-sm font-bold text-sub">{copy.words}</dt>
                <dd className="mt-1 text-3xl font-black text-text">
                  {totalVocab}
                </dd>
              </div>
              <div className="border-l-2 border-brand pl-4">
                <dt className="text-sm font-bold text-sub">{copy.sentences}</dt>
                <dd className="mt-1 text-3xl font-black text-text">
                  {totalSentences}
                </dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -left-10 top-8 h-40 w-40 rounded-full border border-brand/30" />
            <div className="absolute bottom-12 right-2 h-24 w-24 rotate-12 border border-line bg-panel/70" />
            <div className="relative overflow-hidden rounded-md border border-line bg-[#111713] text-[#e9f3ec] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff7066]" />
                  <span className="h-3 w-3 rounded-full bg-[#ffcc66]" />
                  <span className="h-3 w-3 rounded-full bg-[#7bd88f]" />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                  reading workflow
                </span>
              </div>
              <div className="grid grid-cols-[1fr_220px] gap-0">
                <div className="border-r border-white/10 p-6">
                  <p className="font-mono text-sm leading-7 text-[#87d7b7]">
                    $ cnn-study open latest
                  </p>
                  <div className="mt-6 space-y-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#87d7b7]">
                        Article
                      </p>
                      <h2 className="mt-2 text-3xl font-black leading-tight">
                        {latestArticle
                          ? articleTitle(latestArticle.title)
                          : "CNN This Morning"}
                      </h2>
                    </div>
                    <p className="max-w-xl text-base font-medium leading-7 text-white/68">
                      {latestArticle?.summary || copy.noArticles}
                    </p>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="rounded-md bg-white/[0.06] p-3">
                        <p className="text-xs text-white/48">{copy.words}</p>
                        <p className="mt-1 text-2xl font-black">
                          {latestArticle?.vocabCount ?? 0}
                        </p>
                      </div>
                      <div className="rounded-md bg-white/[0.06] p-3">
                        <p className="text-xs text-white/48">
                          {copy.sentences}
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {latestArticle?.sentenceCount ?? 0}
                        </p>
                      </div>
                      <div className="rounded-md bg-white/[0.06] p-3">
                        <p className="text-xs text-white/48">{copy.audio}</p>
                        <p className="mt-1 text-2xl font-black">
                          {latestArticle?.hasAudio ? "on" : "off"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/[0.035] p-5">
                  {[
                    copy.tabs.original,
                    copy.tabs.translation,
                    copy.tabs.vocabulary,
                    copy.tabs.sentences,
                    copy.tabs.quiz,
                  ].map((item, index) => (
                    <div
                      key={item}
                      className={[
                        "mb-3 rounded-md border px-3 py-3 text-sm font-black",
                        index === 2
                          ? "border-[#87d7b7] bg-[#87d7b7] text-[#111713]"
                          : "border-white/10 bg-white/[0.04] text-white/62",
                      ].join(" ")}
                    >
                      {item}
                    </div>
                  ))}
                  <div className="mt-6 rounded-md border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                      next step
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-white/72">
                      {copy.heroText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-panel/55">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-4 gap-4 px-8 py-12">
          {copy.featureCards.map((feature) => (
            <article
              key={feature.title}
              className="rounded-md border border-line bg-panel p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-black text-text">
                  {feature.title}
                </h2>
                <span className="rounded-md bg-brand-soft px-2 py-1 font-mono text-xs font-black text-brand">
                  {feature.value}
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-sub">
                {feature.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="articles" className="mx-auto w-full max-w-7xl px-8 py-12">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-brand">
              Library
            </p>
            <h2 className="mt-2 text-4xl font-black text-text">
              {copy.articleLibrary}
            </h2>
          </div>
          <p className="max-w-md text-right text-sm font-semibold leading-6 text-sub">
            {copy.siteDescription}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-[1fr_auto] gap-4 rounded-md border border-line bg-panel p-4 shadow-sm">
          <label className="block">
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="focus-ring h-11 w-full rounded-md border border-line bg-bg px-4 text-sm font-semibold text-text placeholder:text-sub"
            />
          </label>
          <div className="flex items-center gap-2">
            {filters.map((item) => {
              const active = filter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={[
                    "focus-ring h-11 rounded-md border px-4 text-sm font-bold transition",
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-line bg-bg text-sub hover:border-brand hover:text-brand",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3">
          {filteredArticles.map((article) => {
            const studied = studiedDates.has(article.date);
            return (
              <Link
                key={article.date}
                href={localePath(locale, `/articles/${article.date}`)}
                className="focus-ring grid grid-cols-[120px_1fr_auto] gap-5 rounded-md border border-line bg-panel p-5 shadow-sm transition hover:border-brand hover:shadow-md"
              >
                <div className="flex flex-col justify-between border-r border-line pr-5">
                  <time className="font-mono text-2xl font-black text-brand">
                    {compactDate(article.date)}
                  </time>
                  <span
                    className={[
                      "mt-4 w-fit rounded px-2 py-1 text-xs font-bold",
                      studied
                        ? "bg-brand-soft text-brand"
                        : "bg-muted text-sub",
                    ].join(" ")}
                  >
                    {studied ? copy.filters.studied : copy.filters.review}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-1 text-xl font-black text-text">
                    {articleTitle(article.title)}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-sub">
                    {article.summary}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-sub">
                    <span className="rounded bg-muted px-2 py-1">
                      {copy.words} {article.vocabCount}
                    </span>
                    <span className="rounded bg-muted px-2 py-1">
                      {copy.sentences} {article.sentenceCount}
                    </span>
                    {article.hasAudio && (
                      <span className="rounded bg-brand-soft px-2 py-1 text-brand">
                        {copy.audio}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-sm font-black text-brand">
                  {copy.startLearning}
                </div>
              </Link>
            );
          })}
        </div>

        {filteredArticles.length === 0 && (
          <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-line bg-panel p-12 text-center text-sub">
            {copy.noArticles}
          </div>
        )}
      </section>
    </main>
  );
}
