"use client";

import { playAudioUrl, speakEnglishText } from "@study/core/audio";
import {
  getParagraphTranslation,
  isArticleStudied,
  markArticleStudied,
  setParagraphTranslation,
} from "@study/core/storage";
import { requestBrowserTranslation } from "@study/core/translation";
import type {
  ArticleIndexItem,
  Paragraph,
  StudyArticle,
  VocabularyItem,
} from "@study/core/types";
import Link from "next/link";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AudioButton } from "./AudioButton";
import { ThemeToggle } from "./ThemeToggle";

type ArticleReaderProps = {
  article: StudyArticle;
  articleList: ArticleIndexItem[];
};

type TabKey =
  | "transcript"
  | "translation"
  | "vocabulary"
  | "sentences"
  | "background"
  | "quiz";

type WordToast = {
  word: string;
  cn: string;
  phonetic?: string;
  pos?: string;
  audioUrl?: string;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "transcript", label: "全文稿" },
  { key: "translation", label: "全文翻译" },
  { key: "vocabulary", label: "词汇" },
  { key: "sentences", label: "难句" },
  { key: "background", label: "背景" },
  { key: "quiz", label: "测验" },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function vocabId(word: string) {
  return `vocab-${word.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function paragraphDomId(id: string) {
  return `paragraph-${id.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getSelectedEnglishWord() {
  const selected = window.getSelection()?.toString().trim() || "";
  const match = selected.match(/[A-Za-z][A-Za-z'-]*/);
  return match?.[0] || "";
}

function ParagraphBlock({
  articleDate,
  highlighted,
  onSpeak,
  paragraph,
  renderText,
}: {
  articleDate: string;
  highlighted: boolean;
  onSpeak: (text: string) => Promise<void> | void;
  paragraph: Paragraph;
  renderText: (text: string) => ReactNode;
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState(paragraph.cn || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (!paragraph.cn) {
      setTranslation(getParagraphTranslation(articleDate, paragraph.id));
    }
  }, [articleDate, paragraph.cn, paragraph.id]);

  async function revealTranslation() {
    setError("");
    if (translation || paragraph.cn) {
      setShowTranslation(true);
      return;
    }

    try {
      setLoading(true);
      const result = await requestBrowserTranslation(paragraph.en);
      setTranslation(result);
      setParagraphTranslation(articleDate, paragraph.id, result);
      setShowTranslation(true);
    } catch {
      setError("翻译请求失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function flip() {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    await revealTranslation();
  }

  function handleDoubleClick(event: MouseEvent<HTMLElement>) {
    const word = getSelectedEnglishWord();
    if (word) {
      event.stopPropagation();
      speakEnglishText(word, 0.8);
      return;
    }
    void flip();
  }

  async function readAloud() {
    try {
      setReading(true);
      await onSpeak(paragraph.en);
    } finally {
      window.setTimeout(() => setReading(false), 450);
    }
  }

  const visibleText = showTranslation
    ? translation || paragraph.cn || paragraph.en
    : paragraph.en;

  return (
    <article
      id={paragraphDomId(paragraph.id)}
      className={[
        "scroll-mt-28 rounded-md border border-line bg-panel p-5 shadow-sm transition-shadow duration-300",
        highlighted ? "paragraph-pulse border-brand shadow-lg" : "",
      ].join(" ")}
      onDoubleClick={handleDoubleClick}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-sm font-semibold text-brand">
            {paragraph.speaker ? getInitials(paragraph.speaker) : "P"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">
              {paragraph.speaker || "Transcript"}
            </p>
            <p className="text-xs text-sub">{paragraph.id}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={readAloud}
            className={[
              "focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-bg text-sm font-semibold text-sub transition hover:border-brand hover:text-brand",
              reading ? "border-brand bg-brand-soft text-brand" : "",
            ].join(" ")}
            aria-label="Read paragraph aloud"
            title="Read paragraph aloud"
          >
            <span aria-hidden>▶</span>
          </button>
          <button
            type="button"
            onClick={flip}
            disabled={loading}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-bg text-sm font-semibold text-sub transition hover:border-brand hover:text-brand"
            aria-label={showTranslation ? "Show English" : "Translate"}
            title={showTranslation ? "Show English" : "Translate"}
          >
            <span aria-hidden>{loading ? "…" : "⇄"}</span>
          </button>
        </div>
      </div>
      <p className="text-base leading-8 text-text">
        {showTranslation ? visibleText : renderText(visibleText)}
      </p>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
    </article>
  );
}

function speakParagraphText(text: string) {
  speakEnglishText(text, 0.8);
}

export function ArticleReader({ article, articleList }: ArticleReaderProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("transcript");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [wordToast, setWordToast] = useState<WordToast | null>(null);
  const [studied, setStudied] = useState(false);
  const [pendingParagraphId, setPendingParagraphId] = useState<string | null>(
    null,
  );
  const [highlightedParagraphId, setHighlightedParagraphId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setStudied(isArticleStudied(article.date));
  }, [article.date]);

  useEffect(() => {
    if (!wordToast) return;
    const timer = window.setTimeout(() => setWordToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [wordToast]);

  useEffect(() => {
    if (activeTab !== "transcript" || !pendingParagraphId) return;

    let timer: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(paragraphDomId(pendingParagraphId))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });

      setHighlightedParagraphId(pendingParagraphId);
      setPendingParagraphId(null);

      timer = window.setTimeout(() => {
        setHighlightedParagraphId((current) =>
          current === pendingParagraphId ? null : current,
        );
      }, 1800);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, [activeTab, pendingParagraphId]);

  const sidebarArticles = useMemo(
    () =>
      articleList.length
        ? articleList
        : [{ date: article.date, title: article.title }],
    [article.date, article.title, articleList],
  );

  const vocabByText = useMemo(() => {
    return new Map(
      article.vocabulary.map((item) => [item.word.toLowerCase(), item]),
    );
  }, [article.vocabulary]);

  const vocabPattern = useMemo(() => {
    const words = article.vocabulary
      .map((item) => item.word.trim())
      .filter(Boolean)
      .sort((left, right) => right.length - left.length);

    return words.length
      ? new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi")
      : null;
  }, [article.vocabulary]);

  const firstParagraphIdByWord = useMemo(() => {
    return new Map(
      article.vocabulary.map((item) => {
        const matcher = new RegExp(escapeRegExp(item.word), "i");
        const paragraph = article.paragraphs.find((entry) =>
          matcher.test(entry.en),
        );

        return [item.word, paragraph?.id || null];
      }),
    );
  }, [article.paragraphs, article.vocabulary]);

  function showWord(item: VocabularyItem) {
    setWordToast({
      word: item.word,
      cn: item.cn,
      phonetic: item.phonetic,
      pos: item.pos,
      audioUrl: item.audioUrl,
    });
    void playAudioUrl(item.audioUrl, 0.8);
  }

  function renderHighlightedText(text: string): ReactNode {
    if (!vocabPattern) return text;

    return text.split(vocabPattern).map((part, index) => {
      const vocab = vocabByText.get(part.toLowerCase());
      if (!vocab) return part;

      return (
        <button
          key={`${part}-${index}`}
          onClick={() => showWord(vocab)}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            speakEnglishText(part, 0.8);
          }}
          type="button"
          className="focus-ring mx-0.5 inline rounded bg-brand-soft px-1 py-0.5 font-semibold text-brand"
        >
          {part}
        </button>
      );
    });
  }

  function markStudied() {
    markArticleStudied(article.date);
    setStudied(true);
  }

  function jumpToVocabularyUse(item: VocabularyItem) {
    const paragraphId = firstParagraphIdByWord.get(item.word);
    if (!paragraphId) return;

    setActiveTab("transcript");
    setPendingParagraphId(paragraphId);
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      {wordToast && (
        <div className="fixed left-1/2 top-5 z-50 w-[420px] -translate-x-1/2 rounded-md border border-brand bg-panel p-4 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-text">
                {wordToast.word}
              </p>
              <p className="mt-1 text-sm text-sub">
                {[wordToast.phonetic, wordToast.pos]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AudioButton
                url={wordToast.audioUrl}
                label={`播放 ${wordToast.word}`}
              />
              <span className="rounded bg-brand-soft px-2 py-1 text-xs font-medium text-brand">
                5秒
              </span>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-text">{wordToast.cn}</p>
        </div>
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 border-r border-line bg-panel transition-[width] duration-200",
          sidebarOpen ? "w-72" : "w-14",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen((value) => !value)}
          className="focus-ring absolute -right-4 top-6 flex h-8 w-8 items-center justify-center rounded-md border border-line bg-panel text-sm text-sub shadow-sm transition hover:border-brand hover:text-brand"
          aria-label={sidebarOpen ? "折叠侧边栏" : "展开侧边栏"}
          title={sidebarOpen ? "折叠侧边栏" : "展开侧边栏"}
        >
          <span aria-hidden>{sidebarOpen ? "‹" : "›"}</span>
        </button>

        {sidebarOpen ? (
          <div className="flex h-full flex-col p-5">
            <Link
              href="/"
              className="focus-ring rounded-md text-sm font-medium text-brand"
            >
              Home
            </Link>
            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-sub">
                Articles
              </p>
              <div className="mt-3 max-h-64 overflow-y-auto pr-1 scrollbar-soft">
                <nav className="grid gap-2">
                  {sidebarArticles.map((item) => {
                    const current = item.date === article.date;

                    return (
                      <Link
                        key={item.date}
                        href={`/articles/${item.date}`}
                        aria-current={current ? "page" : undefined}
                        className={[
                          "focus-ring rounded-md border px-3 py-2 text-left transition",
                          current
                            ? "border-brand bg-brand text-white"
                            : "border-line bg-bg text-sub hover:border-brand hover:text-text",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "block text-xs font-semibold",
                            current ? "text-white/80" : "text-brand",
                          ].join(" ")}
                        >
                          {item.date}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-sm font-medium leading-5">
                          {item.title}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
            <nav className="mt-7 grid gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "focus-ring h-10 rounded-md px-3 text-left text-sm font-medium transition",
                    activeTab === tab.key
                      ? "bg-brand text-white"
                      : "bg-transparent text-sub hover:bg-muted hover:text-text",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="mt-auto rounded-md bg-muted p-3 text-sm text-sub">
              Double-click a paragraph to switch text.
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="-rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sub">
              Articles
            </span>
          </div>
        )}
      </aside>

      <div
        className={[
          "transition-[padding] duration-200",
          sidebarOpen ? "pl-72" : "pl-14",
        ].join(" ")}
      >
        <header className="sticky top-0 z-20 border-b border-line bg-bg/95 px-8 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand">{article.date}</p>
              <h1 className="truncate text-2xl font-semibold text-text">
                {article.title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-panel text-sm font-semibold text-sub transition hover:border-brand hover:text-brand"
                aria-label="Open source article"
                title="Open source article"
              >
                <span className="sr-only">Open source article</span>
                <span aria-hidden>↗</span>
              </a>
              <button
                type="button"
                onClick={markStudied}
                disabled={studied}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand bg-brand text-sm font-semibold text-white transition hover:brightness-105"
                aria-label={studied ? "Already studied" : "Mark as studied"}
                title={studied ? "Already studied" : "Mark as studied"}
              >
                <span aria-hidden>{studied ? "✓" : "+"}</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="grid grid-cols-[minmax(0,1fr)_280px] gap-7 px-8 py-7">
          <section className="min-w-0">
            <section className="mb-6 rounded-md border border-line bg-panel p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
                Summary
              </div>
              <p className="text-base leading-8 text-text">{article.summary}</p>
            </section>

            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel p-2 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "focus-ring h-10 rounded-md px-4 text-sm font-medium transition",
                    activeTab === tab.key
                      ? "bg-brand text-white"
                      : "text-sub hover:bg-muted hover:text-text",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "transcript" && (
              <div className="grid gap-4">
                {article.paragraphs.map((paragraph) => (
                  <ParagraphBlock
                    key={paragraph.id}
                    articleDate={article.date}
                    highlighted={highlightedParagraphId === paragraph.id}
                    onSpeak={speakParagraphText}
                    paragraph={paragraph}
                    renderText={renderHighlightedText}
                  />
                ))}
              </div>
            )}

            {activeTab === "translation" && (
              <div className="grid gap-4">
                {article.paragraphs.map((paragraph) => (
                  <article
                    key={paragraph.id}
                    className="rounded-md border border-line bg-panel p-5 shadow-sm"
                  >
                    <p className="mb-2 text-sm font-semibold text-brand">
                      {paragraph.speaker || "Transcript"} · {paragraph.id}
                    </p>
                    <p className="text-base leading-8 text-text">
                      {paragraph.cn ||
                        "该段暂无内置翻译，可在全文稿中单独翻译。"}
                    </p>
                  </article>
                ))}
              </div>
            )}

            {activeTab === "vocabulary" && (
              <div className="grid gap-4">
                {article.vocabulary.map((item) => (
                  <article
                    key={item.word}
                    id={vocabId(item.word)}
                    className="scroll-mt-28 rounded-md border border-line bg-panel p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-text">
                          {item.word}
                        </h2>
                        <p className="mt-1 text-sm text-sub">
                          {[item.phonetic, item.pos, item.level]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <AudioButton
                        url={item.audioUrl}
                        label={`播放 ${item.word}`}
                      />
                    </div>
                    <p className="mt-4 text-base font-medium text-text">
                      {item.cn}
                    </p>
                    {item.en && (
                      <p className="mt-2 text-sm leading-6 text-sub">
                        {item.en}
                      </p>
                    )}
                    {item.excerpt && (
                      <p className="mt-4 rounded-md bg-muted p-3 text-sm leading-6 text-text">
                        {item.excerpt}
                      </p>
                    )}
                    {item.exampleCn && (
                      <p className="mt-2 text-sm leading-6 text-sub">
                        {item.exampleCn}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}

            {activeTab === "sentences" && (
              <div className="grid gap-4">
                {article.sentences.map((item) => (
                  <article
                    key={item.en}
                    className="rounded-md border border-line bg-panel p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-lg font-semibold leading-7 text-text">
                        {item.en}
                      </h2>
                      <AudioButton url={item.audioUrl} label="播放难句" />
                    </div>
                    <p className="mt-3 text-base leading-7 text-sub">
                      {item.cn}
                    </p>
                    {item.structure && (
                      <p className="mt-4 rounded-md bg-muted p-3 text-sm leading-6 text-text">
                        {item.structure}
                      </p>
                    )}
                    {item.analysis && (
                      <p className="mt-3 text-sm leading-6 text-sub">
                        {item.analysis}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}

            {activeTab === "background" && (
              <div className="grid gap-4">
                {article.topics.map((topic) => (
                  <article
                    key={topic.title}
                    className="rounded-md border border-line bg-panel p-5 shadow-sm"
                  >
                    <h2 className="text-lg font-semibold text-text">
                      {topic.title}
                    </h2>
                    <p className="mt-3 text-base leading-8 text-text">
                      {topic.content}
                    </p>
                    {topic.keywords && (
                      <p className="mt-4 text-sm text-sub">{topic.keywords}</p>
                    )}
                  </article>
                ))}
              </div>
            )}

            {activeTab === "quiz" && (
              <div className="grid gap-4">
                {article.quiz.map((item, index) => (
                  <article
                    key={`${item.question}-${index}`}
                    className="rounded-md border border-line bg-panel p-5 shadow-sm"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">
                      {item.type}
                    </p>
                    <h2 className="text-lg font-semibold leading-7 text-text">
                      {item.question}
                    </h2>
                    <div className="mt-4 grid gap-2">
                      {item.options.map((option, optionIndex) => (
                        <div
                          key={option}
                          className={[
                            "rounded-md border px-3 py-2 text-sm",
                            optionIndex === item.answer
                              ? "border-good bg-brand-soft text-text"
                              : "border-line bg-bg text-sub",
                          ].join(" ")}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                    {item.explanation && (
                      <p className="mt-4 text-sm leading-6 text-sub">
                        {item.explanation}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="sticky top-24 h-[calc(100vh-7rem)] overflow-y-auto rounded-md border border-line bg-panel p-4 shadow-sm scrollbar-soft">
            <h2 className="text-sm font-semibold text-text">词汇索引</h2>
            <div className="mt-4 grid gap-2">
              {article.vocabulary.map((item) => (
                <div
                  key={item.word}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
                >
                  <button
                    type="button"
                    onClick={() => jumpToVocabularyUse(item)}
                    className="focus-ring min-w-0 rounded-md border border-line bg-bg px-3 py-2 text-left transition hover:border-brand hover:text-brand"
                  >
                    <span className="block text-sm font-semibold text-text">
                      {item.word}
                    </span>
                    <span className="mt-1 line-clamp-1 block text-xs text-sub">
                      {item.cn}
                    </span>
                  </button>
                  <AudioButton
                    url={item.audioUrl}
                    label={`Play ${item.word}`}
                  />
                </div>
              ))}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
