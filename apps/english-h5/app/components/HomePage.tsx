import type { ArticleIndexItem } from "@study/core/types";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function ArticleMeta({ article }: { article: ArticleIndexItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-sub">
      <span>{formatDate(article.date)}</span>
      <span className="h-1 w-1 rounded-full bg-line" />
      <span>{article.vocabCount} 词</span>
      <span className="h-1 w-1 rounded-full bg-line" />
      <span>{article.sentenceCount} 难句</span>
      {article.hasAudio ? (
        <>
          <span className="h-1 w-1 rounded-full bg-line" />
          <span>音频</span>
        </>
      ) : null}
    </div>
  );
}

export function HomePage({ articles }: { articles: ArticleIndexItem[] }) {
  const todayArticle = articles[0];
  const restArticles = articles.slice(1);

  return (
    <main className="safe-x mx-auto min-h-dvh w-full max-w-screen-sm pb-safe pt-5">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
            CNN Study
          </p>
          <h1 className="mt-1 text-2xl font-black text-text">每日英语精读</h1>
        </div>
        <ThemeToggle />
      </header>

      {todayArticle ? (
        <section className="mb-6">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-base font-extrabold text-text">今日文章</h2>
            <span className="text-xs font-semibold text-sub">
              {todayArticle.date}
            </span>
          </div>
          <Link
            href={`/articles/${todayArticle.date}`}
            className="tap-highlight block rounded-[8px] border border-line bg-panel p-5 shadow-[var(--shadow)] transition active:scale-[0.99]"
          >
            <ArticleMeta article={todayArticle} />
            <h3 className="mt-4 text-xl font-black leading-tight text-text">
              {todayArticle.title}
            </h3>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-sub">
              {todayArticle.summary}
            </p>
            <div className="mt-5 inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-bold text-white">
              开始学习
            </div>
          </Link>
        </section>
      ) : (
        <section className="rounded-[8px] border border-line bg-panel p-5 text-sm leading-6 text-sub">
          暂无文章数据。请先生成 public/data 后再打开 H5。
        </section>
      )}

      {restArticles.length ? (
        <section className="space-y-3">
          <h2 className="text-base font-extrabold text-text">往期文章</h2>
          {restArticles.map((article) => (
            <Link
              key={article.date}
              href={`/articles/${article.date}`}
              className="tap-highlight block rounded-[8px] border border-line bg-panel p-4 transition active:scale-[0.99]"
            >
              <ArticleMeta article={article} />
              <h3 className="mt-3 text-base font-extrabold leading-snug text-text">
                {article.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-sub">
                {article.summary}
              </p>
            </Link>
          ))}
        </section>
      ) : null}
    </main>
  );
}
