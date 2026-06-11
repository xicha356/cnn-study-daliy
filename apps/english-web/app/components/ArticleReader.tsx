"use client";

import {
  playAudioUrl,
  playTtsText,
  updateGlobalAudioMetadata,
} from "@study/core/audio";
import { type LocaleCode, getUiCopy, localePath } from "@study/core/i18n";
import {
  getParagraphTranslation,
  getWordMeaning,
  isArticleStudied,
  markArticleStudied,
  setParagraphTranslation,
  setWordMeaning,
} from "@study/core/storage";
import { requestBrowserTranslation } from "@study/core/translation";
import type {
  ArticleIndexItem,
  Paragraph,
  StudyArticle,
  VocabularyItem,
} from "@study/core/types";
import { orderVocabularyByArticle } from "@study/core/vocabulary";
import { GlobalAudioPlayer } from "@study/ui/GlobalAudioPlayer";
import { LanguageSwitcher } from "@study/ui/LanguageSwitcher";
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
  locale: LocaleCode;
};

type TabKey =
  | "transcript"
  | "translation"
  | "vocabulary"
  | "sentences"
  | "background"
  | "quiz";

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

function getWordSubtitle(
  item: Pick<
    VocabularyItem,
    "phonetic" | "pos" | "usage" | "level" | "difficulty" | "domain"
  >,
) {
  return [
    item.phonetic,
    item.pos,
    item.usage || item.level,
    item.difficulty,
    item.domain,
  ]
    .filter(Boolean)
    .join(" · ");
}

function cleanEnglishWord(value: string) {
  return value.match(/[A-Za-z][A-Za-z'-]*/)?.[0] || "";
}

function buildArticleCopyText(article: StudyArticle) {
  return [
    article.title,
    article.date,
    "",
    article.summary,
    "",
    ...article.paragraphs.map((paragraph) =>
      [paragraph.speaker, paragraph.en].filter(Boolean).join(": "),
    ),
  ].join("\n");
}

async function copyText(value: string) {
  const text = value.trim();
  if (!text) return false;

  try {
    await window.navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  }
}

function getSidebarTitle(title: string, date: string) {
  return title
    .replace(new RegExp(`\\s*[·-]\\s*${escapeRegExp(date)}\\s*[·-]\\s*`), " · ")
    .replace(new RegExp(`^${escapeRegExp(date)}\\s*[·-]\\s*`), "")
    .replace(/\s+·\s+$/, "")
    .trim();
}

function ParagraphBlock({
  articleDate,
  highlighted,
  onSpeak,
  onSpeakWord,
  onCopy,
  copied,
  paragraph,
  renderText,
  locale,
  copy,
}: {
  articleDate: string;
  highlighted: boolean;
  onSpeak: (text: string) => Promise<void> | void;
  onSpeakWord: (word: string) => Promise<void> | void;
  onCopy: (text: string, id: string) => Promise<void> | void;
  copied: boolean;
  paragraph: Paragraph;
  renderText: (text: string, paragraphId: string) => ReactNode;
  locale: LocaleCode;
  copy: ReturnType<typeof getUiCopy>;
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState(paragraph.cn || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (!paragraph.cn) {
      setTranslation(
        getParagraphTranslation(articleDate, paragraph.id, locale),
      );
    }
  }, [articleDate, locale, paragraph.cn, paragraph.id]);

  async function revealTranslation() {
    setError("");
    if (translation || paragraph.cn) {
      setShowTranslation(true);
      return;
    }

    try {
      setLoading(true);
      const result = await requestBrowserTranslation(paragraph.en, locale);
      setTranslation(result);
      setParagraphTranslation(articleDate, paragraph.id, result, locale);
      setShowTranslation(true);
    } catch {
      setError(copy.status.translationFailed);
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
      void onSpeakWord(word);
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
            onClick={() => void onCopy(visibleText, paragraph.id)}
            className={[
              "focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-bg text-sm font-semibold text-sub transition hover:border-brand hover:text-brand",
              copied ? "border-good bg-brand-soft text-good" : "",
            ].join(" ")}
            aria-label={copy.actions.copy}
            title={copy.actions.copy}
          >
            <span aria-hidden>{copied ? "✓" : "⧉"}</span>
          </button>
          <button
            type="button"
            onClick={readAloud}
            className={[
              "focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-bg text-sm font-semibold text-sub transition hover:border-brand hover:text-brand",
              reading ? "border-brand bg-brand-soft text-brand" : "",
            ].join(" ")}
            aria-label={copy.actions.read}
            title={copy.actions.read}
          >
            <span aria-hidden>▶</span>
          </button>
          <button
            type="button"
            onClick={flip}
            disabled={loading}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-bg text-sm font-semibold text-sub transition hover:border-brand hover:text-brand"
            aria-label={
              showTranslation
                ? copy.actions.hideTranslation
                : copy.actions.showTranslation
            }
            title={
              showTranslation
                ? copy.actions.hideTranslation
                : copy.actions.showTranslation
            }
          >
            <span aria-hidden>{loading ? "…" : "⇄"}</span>
          </button>
        </div>
      </div>
      <p className="text-base leading-8 text-text">
        {showTranslation ? visibleText : renderText(visibleText, paragraph.id)}
      </p>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
    </article>
  );
}

async function speakParagraphText(
  text: string,
  onState?: (state: "cache-hit" | "loading" | "playing" | "error") => void,
) {
  await playTtsText(text, {
    kind: "Paragraph",
    title: "Paragraph reading",
    onState,
  });
}

export function ArticleReader({
  article,
  articleList,
  locale,
}: ArticleReaderProps) {
  const copy = getUiCopy(locale);
  const tabs: { key: TabKey; label: string }[] = [
    { key: "transcript", label: copy.tabs.transcript },
    { key: "translation", label: copy.tabs.translation },
    { key: "vocabulary", label: copy.tabs.vocabulary },
    { key: "sentences", label: copy.tabs.sentences },
    { key: "background", label: copy.tabs.background },
    { key: "quiz", label: copy.tabs.quiz },
  ];
  const [activeTab, setActiveTab] = useState<TabKey>("transcript");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [studied, setStudied] = useState(false);
  const [pendingParagraphId, setPendingParagraphId] = useState<string | null>(
    null,
  );
  const [pendingSentenceKey, setPendingSentenceKey] = useState("");
  const [highlightedParagraphId, setHighlightedParagraphId] = useState<
    string | null
  >(null);
  const [ttsLoadingKey, setTtsLoadingKey] = useState("");
  const [wordPulseKey, setWordPulseKey] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    setStudied(isArticleStudied(article.date));
  }, [article.date]);

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

  const orderedVocabulary = useMemo(
    () => orderVocabularyByArticle(article),
    [article],
  );

  const vocabByText = useMemo(() => {
    return new Map(
      orderedVocabulary.map((item) => [item.word.toLowerCase(), item]),
    );
  }, [orderedVocabulary]);

  const vocabPattern = useMemo(() => {
    const words = orderedVocabulary
      .map((item) => item.word.trim())
      .filter(Boolean)
      .sort((left, right) => right.length - left.length);

    return words.length
      ? new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi")
      : null;
  }, [orderedVocabulary]);

  const firstParagraphIdByWord = useMemo(() => {
    return new Map(
      orderedVocabulary.map((item) => {
        const matcher = new RegExp(escapeRegExp(item.word), "i");
        const paragraph = article.paragraphs.find((entry) =>
          matcher.test(entry.en),
        );

        return [item.word, paragraph?.id || null];
      }),
    );
  }, [article.paragraphs, orderedVocabulary]);

  function showWord(item: VocabularyItem) {
    void playAudioUrl(item.audioUrl, {
      kind: "Word",
      title: item.word,
      subtitle: getWordSubtitle(item),
      description: item.cn,
    }).then((played) => {
      if (!played)
        void speakWordText(item.word, item.cn, getWordSubtitle(item));
    });
  }

  async function showPlainWordMeaning(word: string, pulseKey: string) {
    const cleanWord = cleanEnglishWord(word);
    if (!cleanWord) return;

    const normalized = cleanWord.toLowerCase();
    const vocab = vocabByText.get(normalized);
    setWordPulseKey(pulseKey);
    window.setTimeout(() => {
      setWordPulseKey((current) => (current === pulseKey ? "" : current));
    }, 360);

    if (vocab) {
      showWord(vocab);
      return;
    }

    const cached = getWordMeaning(cleanWord, locale);
    const audioPromise = speakWordText(
      cleanWord,
      cached || copy.status.loadingTranslation,
    );

    if (cached) return;

    try {
      const cn = await requestBrowserTranslation(cleanWord, locale);
      const description = cn || copy.status.noMeaning;
      setWordMeaning(cleanWord, description, locale);
      updateGlobalAudioMetadata({ description });
      void audioPromise.then(() => updateGlobalAudioMetadata({ description }));
    } catch {
      const description = copy.status.meaningFailed;
      updateGlobalAudioMetadata({ description });
      void audioPromise.then(() => updateGlobalAudioMetadata({ description }));
    }
  }

  async function speakWordText(
    word: string,
    description = "",
    subtitle = "Word",
  ) {
    const normalized = word.trim().toLowerCase();
    if (!normalized) return;

    await playTtsText(word, {
      cacheKey: `word:${normalized}`,
      kind: "Word",
      title: word,
      subtitle,
      description,
      onState: (state) => {
        setTtsLoadingKey(state === "loading" ? normalized : "");
      },
    });
  }

  async function speakSentenceText(text: string, key: string) {
    await playTtsText(text, {
      cacheKey: `sentence:${key}`,
      kind: "Sentence",
      title: "Sentence reading",
      onState: (state) => {
        setPendingSentenceKey(state === "loading" ? key : "");
      },
    });
  }

  function renderPlainText(text: string, paragraphId: string): ReactNode[] {
    const parts: ReactNode[] = [];
    let cursor = 0;
    const wordPattern = /[A-Za-z][A-Za-z'-]*/g;

    for (const match of text.matchAll(wordPattern)) {
      const start = match.index || 0;
      if (start > cursor) parts.push(text.slice(cursor, start));

      const word = match[0];
      const pulseKey = `${paragraphId}:${start}:${word.toLowerCase()}`;
      parts.push(
        <button
          key={`plain-${pulseKey}`}
          type="button"
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void showPlainWordMeaning(word, pulseKey);
          }}
          className={[
            "inline cursor-pointer rounded px-0.5 text-left transition hover:bg-brand-soft hover:text-brand",
            wordPulseKey === pulseKey
              ? "word-pop bg-brand-soft text-brand"
              : "",
          ].join(" ")}
          title={copy.actions.translate}
        >
          {word}
        </button>,
      );
      cursor = start + word.length;
    }

    if (cursor < text.length) parts.push(text.slice(cursor));
    return parts;
  }

  function renderHighlightedText(text: string, paragraphId: string): ReactNode {
    if (!vocabPattern) return renderPlainText(text, paragraphId);

    return text.split(vocabPattern).map((part, index) => {
      const vocab = vocabByText.get(part.toLowerCase());
      if (!vocab) return renderPlainText(part, `${paragraphId}:${index}`);

      const pulseKey = `${paragraphId}:vocab:${index}:${part.toLowerCase()}`;

      return (
        <button
          key={`${part}-${index}`}
          onClick={() => {
            setWordPulseKey(pulseKey);
            window.setTimeout(() => {
              setWordPulseKey((current) =>
                current === pulseKey ? "" : current,
              );
            }, 360);
            showWord(vocab);
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void showPlainWordMeaning(part, pulseKey);
          }}
          type="button"
          className={[
            "focus-ring mx-0.5 inline-flex cursor-pointer items-center gap-1 rounded bg-brand-soft px-1 py-0.5 font-semibold text-brand transition",
            wordPulseKey === pulseKey ? "word-pop" : "",
          ].join(" ")}
        >
          {part}
          {ttsLoadingKey === vocab.word.toLowerCase() ? (
            <span
              aria-hidden
              className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent"
            />
          ) : null}
        </button>
      );
    });
  }

  function markStudied() {
    markArticleStudied(article.date);
    setStudied(true);
  }

  async function copyArticle() {
    if (await copyText(buildArticleCopyText(article))) {
      setCopiedKey("article");
      window.setTimeout(() => {
        setCopiedKey((current) => (current === "article" ? "" : current));
      }, 1400);
    }
  }

  async function copyParagraph(text: string, id: string) {
    if (await copyText(text)) {
      const key = `paragraph:${id}`;
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current));
      }, 1400);
    }
  }

  function jumpToVocabularyUse(item: VocabularyItem) {
    const paragraphId = firstParagraphIdByWord.get(item.word);
    if (!paragraphId) return;

    setActiveTab("transcript");
    setPendingParagraphId(paragraphId);
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 border-r border-line bg-panel transition-[width] duration-200",
          sidebarOpen ? "w-96" : "w-14",
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
              href={localePath(locale)}
              className="focus-ring rounded-md text-sm font-medium text-brand"
            >
              {copy.actions.back}
            </Link>
            <div className="mt-7 flex min-h-0 flex-1 flex-col">
              <p className="text-xs font-semibold uppercase tracking-wide text-sub">
                {copy.articles}
              </p>
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-soft">
                <nav className="grid gap-2">
                  {sidebarArticles.map((item) => {
                    const current = item.date === article.date;
                    const title = getSidebarTitle(item.title, item.date);

                    return (
                      <Link
                        key={item.date}
                        href={localePath(locale, `/articles/${item.date}`)}
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
                        <span className="mt-2 line-clamp-2 block text-sm font-medium leading-5">
                          {title}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="-rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sub">
              {copy.articles}
            </span>
          </div>
        )}
      </aside>

      <div
        className={[
          "transition-[padding] duration-200",
          sidebarOpen ? "pl-96" : "pl-14",
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
              <button
                type="button"
                onClick={() => void copyArticle()}
                className={[
                  "focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-panel text-sm font-semibold text-sub transition hover:border-brand hover:text-brand",
                  copiedKey === "article"
                    ? "border-good bg-brand-soft text-good"
                    : "",
                ].join(" ")}
                aria-label={copy.actions.copy}
                title={copy.actions.copy}
              >
                <span aria-hidden>{copiedKey === "article" ? "✓" : "⧉"}</span>
              </button>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-panel text-sm font-semibold text-sub transition hover:border-brand hover:text-brand"
                aria-label={copy.actions.source}
                title={copy.actions.source}
              >
                <span className="sr-only">{copy.actions.source}</span>
                <span aria-hidden>↗</span>
              </a>
              <button
                type="button"
                onClick={markStudied}
                disabled={studied}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand bg-brand text-sm font-semibold text-white transition hover:brightness-105"
                aria-label={
                  studied ? copy.filters.studied : copy.filters.review
                }
                title={studied ? copy.filters.studied : copy.filters.review}
              >
                <span aria-hidden>{studied ? "✓" : "+"}</span>
              </button>
              <LanguageSwitcher locale={locale} />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="grid grid-cols-[minmax(0,1fr)_280px] gap-7 px-8 py-7 pb-32">
          <section className="min-w-0">
            <section className="mb-6 rounded-md border border-line bg-panel p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
                {copy.todayArticle}
              </div>
              <p className="text-base leading-8 text-text">{article.summary}</p>
            </section>

            <div className="sticky top-[76px] z-10 mb-5 flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel/95 p-2 shadow-sm backdrop-blur">
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
                    locale={locale}
                    copy={copy}
                    highlighted={highlightedParagraphId === paragraph.id}
                    onSpeak={speakParagraphText}
                    onSpeakWord={speakWordText}
                    onCopy={copyParagraph}
                    copied={copiedKey === `paragraph:${paragraph.id}`}
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
                      {paragraph.cn || copy.status.noTranslation}
                    </p>
                  </article>
                ))}
              </div>
            )}

            {activeTab === "vocabulary" && (
              <div className="grid gap-4">
                {orderedVocabulary.map((item) => (
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
                          {[
                            item.phonetic,
                            item.pos,
                            item.usage || item.level,
                            item.difficulty,
                            item.domain,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <AudioButton
                        url={item.audioUrl}
                        label={`Play ${item.word}`}
                        subtitle={getWordSubtitle(item)}
                        description={item.cn}
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
                {article.sentences.map((item, index) => {
                  const sentenceKey = `${article.date}:${index}`;
                  const isLoading = pendingSentenceKey === sentenceKey;
                  return (
                    <article
                      key={item.en}
                      className="rounded-md border border-line bg-panel p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="text-lg font-semibold leading-7 text-text">
                          {item.en}
                        </h2>
                        <button
                          aria-label="Play sentence"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-sm font-bold text-sub transition hover:border-brand hover:bg-brandSoft hover:text-brand"
                          onClick={() => {
                            void speakSentenceText(item.en, sentenceKey);
                          }}
                          title="Play sentence"
                          type="button"
                        >
                          {isLoading ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            "▶"
                          )}
                        </button>
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
                  );
                })}
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
                      {item.options.map((option, optionIndex) => {
                        const selected = quizAnswers[index];
                        const answered = typeof selected === "number";
                        const correct = optionIndex === item.answer;
                        const chosen = selected === optionIndex;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setQuizAnswers((current) => ({
                                ...current,
                                [index]: optionIndex,
                              }))
                            }
                            className={[
                              "focus-ring rounded-md border px-3 py-2 text-left text-sm transition",
                              answered && correct
                                ? "border-good bg-brand-soft text-text"
                                : answered && chosen
                                  ? "border-bad bg-bg text-text"
                                  : "border-line bg-bg text-sub",
                            ].join(" ")}
                          >
                            <span>{option}</span>
                            {answered ? (
                              <span className="ml-2 font-semibold">
                                {correct ? "✓" : chosen ? "×" : ""}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    {typeof quizAnswers[index] === "number" &&
                      item.explanation && (
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
            <h2 className="text-sm font-semibold text-text">
              {copy.actions.openVocabulary}
            </h2>
            <div className="mt-4 grid gap-2">
              {orderedVocabulary.map((item) => (
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
                    subtitle={getWordSubtitle(item)}
                    description={item.cn}
                  />
                </div>
              ))}
            </div>
          </aside>
        </main>
      </div>
      <GlobalAudioPlayer variant="desktop" />
    </div>
  );
}
