import type { ArticleIndexItem } from "@study/core/types";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const featureCards = [
  {
    title: "词汇",
    value: "≤50",
    detail: "按新闻语境抽重点词，不再用考试标签。",
  },
  {
    title: "难句",
    value: "20-30",
    detail: "单独生成长难句解析，适合逐句精读。",
  },
  {
    title: "朗读",
    value: "TTS",
    detail: "词汇预生成，段落和难句按需缓存播放。",
  },
  {
    title: "测验",
    value: "Quiz",
    detail: "选择后看解析，错题进入复习节奏。",
  },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
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

function ArticleMeta({ article }: { article: ArticleIndexItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-black text-sub">
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
  const totalVocab = articles.reduce(
    (count, article) => count + article.vocabCount,
    0,
  );
  const totalSentences = articles.reduce(
    (count, article) => count + article.sentenceCount,
    0,
  );

  return (
    <main className="min-h-dvh overflow-hidden bg-bg pb-safe text-text">
      <header className="safe-x sticky top-0 z-30 flex h-[calc(env(safe-area-inset-top)+4.25rem)] items-end justify-between gap-4 border-b border-line bg-bg/90 pb-3 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-brand text-sm font-black text-white">
            CNN
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
              News Study
            </p>
            <h1 className="text-lg font-black text-text">cnn 新闻精读</h1>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      <section className="safe-x pt-7">
        <p className="w-fit rounded-[8px] border border-line bg-panel px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand">
          Daily intensive reading
        </p>
        <h2 className="mt-5 text-[2.75rem] font-black leading-[0.96] tracking-normal text-text">
          每天一篇新闻，
          <br />
          把英语拆开学。
        </h2>
        <p className="mt-5 text-base font-semibold leading-7 text-sub">
          双语全文、重点词汇、长难句、测验和美式朗读，组合成一个手机上的精读流程。
        </p>

        <div className="mt-7 overflow-hidden rounded-[8px] border border-line bg-[#111713] text-[#edf7f0] shadow-[var(--shadow)]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff7066]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffcc66]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#7bd88f]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
              study flow
            </span>
          </div>
          <div className="p-4">
            <p className="font-mono text-xs text-[#87d7b7]">
              $ open today --focus
            </p>
            <h3 className="mt-4 text-2xl font-black leading-tight">
              {todayArticle
                ? shortTitle(todayArticle.title)
                : "CNN This Morning"}
            </h3>
            <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-white/68">
              {todayArticle?.summary ||
                "文章生成后，这里会显示今日摘要和学习入口。"}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-[8px] bg-white/[0.07] p-3">
                <p className="text-[10px] text-white/45">articles</p>
                <p className="mt-1 text-xl font-black">{articles.length}</p>
              </div>
              <div className="rounded-[8px] bg-white/[0.07] p-3">
                <p className="text-[10px] text-white/45">vocab</p>
                <p className="mt-1 text-xl font-black">{totalVocab}</p>
              </div>
              <div className="rounded-[8px] bg-white/[0.07] p-3">
                <p className="text-[10px] text-white/45">sentences</p>
                <p className="mt-1 text-xl font-black">{totalSentences}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {todayArticle ? (
            <Link
              href={`/articles/${todayArticle.date}`}
              className="tap-highlight flex h-12 flex-1 items-center justify-center rounded-[8px] bg-brand text-sm font-black text-white active:scale-[0.99]"
            >
              开始学习
            </Link>
          ) : null}
          <a
            href="#articles"
            className="tap-highlight flex h-12 items-center justify-center rounded-[8px] border border-line bg-panel px-5 text-sm font-black text-text active:scale-[0.99]"
          >
            文章
          </a>
        </div>
      </section>

      <section className="mt-8">
        <div className="safe-x mb-3 flex items-end justify-between">
          <h2 className="text-lg font-black text-text">功能</h2>
          <span className="text-xs font-black text-sub">横向滑动</span>
        </div>
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {featureCards.map((feature) => (
            <article
              key={feature.title}
              className="min-w-[72%] snap-start rounded-[8px] border border-line bg-panel p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-black text-text">
                  {feature.title}
                </h3>
                <span className="rounded-[8px] bg-brand-soft px-2 py-1 font-mono text-xs font-black text-brand">
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

      <section className="safe-x mt-8">
        <div className="rounded-[8px] border border-line bg-panel p-4">
          <h2 className="text-lg font-black text-text">学习路径</h2>
          <div className="mt-4 space-y-3">
            {["读原文", "查词汇", "拆难句", "做测验"].map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft font-mono text-xs font-black text-brand">
                  {index + 1}
                </span>
                <span className="text-sm font-black text-text">{step}</span>
                <span className="h-px flex-1 bg-line" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {todayArticle ? (
        <section className="safe-x mt-8">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-black text-text">今日文章</h2>
            <span className="text-xs font-black text-sub">
              {todayArticle.date}
            </span>
          </div>
          <Link
            href={`/articles/${todayArticle.date}`}
            className="tap-highlight block rounded-[8px] border border-line bg-panel p-5 shadow-[var(--shadow)] transition active:scale-[0.99]"
          >
            <ArticleMeta article={todayArticle} />
            <h3 className="mt-4 text-xl font-black leading-tight text-text">
              {shortTitle(todayArticle.title)}
            </h3>
            <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-sub">
              {todayArticle.summary}
            </p>
          </Link>
        </section>
      ) : (
        <section className="safe-x mt-8">
          <div className="rounded-[8px] border border-line bg-panel p-5 text-sm leading-6 text-sub">
            暂无文章数据。请先生成 public/data 后再打开 H5。
          </div>
        </section>
      )}

      {restArticles.length ? (
        <section id="articles" className="safe-x mt-8 space-y-3">
          <h2 className="text-lg font-black text-text">往期文章</h2>
          {restArticles.map((article) => (
            <Link
              key={article.date}
              href={`/articles/${article.date}`}
              className="tap-highlight block rounded-[8px] border border-line bg-panel p-4 transition active:scale-[0.99]"
            >
              <ArticleMeta article={article} />
              <h3 className="mt-3 text-base font-black leading-snug text-text">
                {shortTitle(article.title)}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-sub">
                {article.summary}
              </p>
            </Link>
          ))}
        </section>
      ) : null}
    </main>
  );
}
