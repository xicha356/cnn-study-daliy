"use client";

import { isArticleStudied } from "@study/core/storage";
import type { ArticleIndexItem } from "@study/core/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

type FilterKey = "all" | "recent" | "audio" | "studied" | "review";

type HomeClientProps = {
  articles: ArticleIndexItem[];
};

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "recent", label: "最近7天" },
  { key: "audio", label: "有音频" },
  { key: "studied", label: "已学习" },
  { key: "review", label: "待复习" },
];

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

export function HomeClient({ articles }: HomeClientProps) {
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
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-8 py-7">
      <header className="mb-7 flex items-center justify-between gap-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-brand">
            CNN Study Daily
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-text">
            英语精读工作台
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="mb-6 grid grid-cols-[1fr_auto] gap-4 rounded-md border border-line bg-panel p-4 shadow-sm">
        <label className="block">
          <span className="sr-only">搜索文章</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、摘要或日期"
            className="focus-ring h-11 w-full rounded-md border border-line bg-bg px-4 text-sm text-text placeholder:text-sub"
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
                  "focus-ring h-11 rounded-md border px-4 text-sm font-medium transition",
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
      </section>

      <section className="grid gap-3">
        {filteredArticles.map((article) => {
          const studied = studiedDates.has(article.date);
          return (
            <Link
              key={article.date}
              href={`/articles/${article.date}`}
              className="focus-ring grid grid-cols-[148px_1fr_auto] gap-5 rounded-md border border-line bg-panel p-5 shadow-sm transition hover:border-brand hover:shadow-md"
            >
              <div className="flex flex-col justify-between border-r border-line pr-5">
                <time className="text-lg font-semibold text-text">
                  {article.date}
                </time>
                <span
                  className={[
                    "mt-4 w-fit rounded px-2 py-1 text-xs font-medium",
                    studied ? "bg-brand-soft text-brand" : "bg-muted text-sub",
                  ].join(" ")}
                >
                  {studied ? "已学习" : "待复习"}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="line-clamp-1 text-xl font-semibold text-text">
                  {article.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-sub">
                  {article.summary}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-sub">
                  <span className="rounded bg-muted px-2 py-1">
                    词汇 {article.vocabCount}
                  </span>
                  <span className="rounded bg-muted px-2 py-1">
                    难句 {article.sentenceCount}
                  </span>
                  {article.hasAudio && (
                    <span className="rounded bg-brand-soft px-2 py-1 text-brand">
                      音频
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center text-sm font-medium text-brand">
                进入学习
              </div>
            </Link>
          );
        })}
      </section>

      {filteredArticles.length === 0 && (
        <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-line bg-panel p-12 text-center text-sub">
          暂无匹配文章。若数据还未生成，请先准备 public/data。
        </div>
      )}
    </main>
  );
}
