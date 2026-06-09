"use client";

import {
  getParagraphTranslation,
  setParagraphTranslation,
} from "@study/core/storage";
import { requestBrowserTranslation } from "@study/core/translation";
import type {
  Paragraph,
  StudyArticle,
  VocabularyItem,
} from "@study/core/types";
import { AudioButton } from "@study/ui/AudioButton";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

type TabKey = "original" | "translation" | "vocabulary" | "sentences" | "quiz";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "original", label: "原文" },
  { key: "translation", label: "翻译" },
  { key: "vocabulary", label: "词汇" },
  { key: "sentences", label: "难句" },
  { key: "quiz", label: "测验" },
];

function shortTitle(title: string) {
  return title.length > 18 ? `${title.slice(0, 18)}...` : title;
}

function isLetter(value: string | undefined) {
  return Boolean(value && /[A-Za-z]/.test(value));
}

function buildVocabularyMatcher(vocabulary: VocabularyItem[]) {
  return vocabulary
    .filter((item) => item.word.trim())
    .map((item) => ({
      item,
      lowerWord: item.word.toLowerCase(),
    }))
    .sort((a, b) => b.lowerWord.length - a.lowerWord.length);
}

export function StudyArticleClient({ article }: { article: StudyArticle }) {
  const [activeTab, setActiveTab] = useState<TabKey>("original");
  const [visibleCn, setVisibleCn] = useState<Record<string, boolean>>({});
  const [translations, setTranslations] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      article.paragraphs.map((paragraph) => [paragraph.id, paragraph.cn || ""]),
    ),
  );
  const [loadingCn, setLoadingCn] = useState<Record<string, boolean>>({});
  const [activeVocab, setActiveVocab] = useState<VocabularyItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [pulseParagraphId, setPulseParagraphId] = useState("");

  const paragraphRefs = useRef<Record<string, HTMLElement | null>>({});
  const touchStartX = useRef<Record<string, number>>({});
  const tipTimer = useRef<number | null>(null);

  const vocabularyMatcher = useMemo(
    () => buildVocabularyMatcher(article.vocabulary),
    [article.vocabulary],
  );

  useEffect(() => {
    return () => {
      if (tipTimer.current) window.clearTimeout(tipTimer.current);
    };
  }, []);

  async function ensureTranslation(paragraph: Paragraph) {
    const existing =
      translations[paragraph.id] ||
      getParagraphTranslation(article.date, paragraph.id);
    if (existing) {
      setTranslations((current) => ({ ...current, [paragraph.id]: existing }));
      return existing;
    }

    setLoadingCn((current) => ({ ...current, [paragraph.id]: true }));
    try {
      const translated = await requestBrowserTranslation(paragraph.en);
      if (translated) {
        setParagraphTranslation(article.date, paragraph.id, translated);
        setTranslations((current) => ({
          ...current,
          [paragraph.id]: translated,
        }));
      }
      return translated;
    } finally {
      setLoadingCn((current) => ({ ...current, [paragraph.id]: false }));
    }
  }

  async function toggleParagraphTranslation(paragraph: Paragraph) {
    if (visibleCn[paragraph.id]) {
      setVisibleCn((current) => ({ ...current, [paragraph.id]: false }));
      return;
    }

    await ensureTranslation(paragraph);
    setVisibleCn((current) => ({ ...current, [paragraph.id]: true }));
  }

  function handleTouchStart(paragraphId: string, clientX: number) {
    touchStartX.current[paragraphId] = clientX;
  }

  function handleTouchEnd(paragraph: Paragraph, clientX: number) {
    const startX = touchStartX.current[paragraph.id];
    if (typeof startX !== "number") return;
    if (clientX - startX < -42) void toggleParagraphTranslation(paragraph);
    delete touchStartX.current[paragraph.id];
  }

  function showVocabTip(vocab: VocabularyItem) {
    setActiveVocab(vocab);
    if (tipTimer.current) window.clearTimeout(tipTimer.current);
    tipTimer.current = window.setTimeout(() => setActiveVocab(null), 5000);
  }

  function findParagraphForVocabulary(vocab: VocabularyItem) {
    const source = vocab.excerpt || vocab.en || vocab.word;
    const lowerSource = source.toLowerCase();
    return (
      article.paragraphs.find((paragraph) =>
        paragraph.en.toLowerCase().includes(lowerSource),
      ) ||
      article.paragraphs.find((paragraph) =>
        paragraph.en.toLowerCase().includes(vocab.word.toLowerCase()),
      )
    );
  }

  function jumpToVocabulary(vocab: VocabularyItem) {
    const paragraph = findParagraphForVocabulary(vocab);
    showVocabTip(vocab);
    setIsSheetOpen(false);
    setActiveTab("original");
    if (!paragraph) return;

    window.setTimeout(() => {
      paragraphRefs.current[paragraph.id]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
      setPulseParagraphId(paragraph.id);
      window.setTimeout(() => setPulseParagraphId(""), 1200);
    }, 80);
  }

  function renderHighlightedText(text: string) {
    const parts: ReactNode[] = [];
    const lowerText = text.toLowerCase();
    let index = 0;

    while (index < text.length) {
      const match = vocabularyMatcher.find(({ lowerWord }) => {
        if (!lowerText.startsWith(lowerWord, index)) return false;
        const before = text[index - 1];
        const after = text[index + lowerWord.length];
        return !isLetter(before) && !isLetter(after);
      });

      if (!match) {
        parts.push(text[index]);
        index += 1;
        continue;
      }

      const value = text.slice(index, index + match.lowerWord.length);
      parts.push(
        <button
          type="button"
          key={`${match.item.word}-${index}`}
          onClick={() => showVocabTip(match.item)}
          className="rounded bg-brandSoft px-1 font-extrabold text-brand underline decoration-brand underline-offset-4"
        >
          {value}
        </button>,
      );
      index += match.lowerWord.length;
    }

    return parts;
  }

  return (
    <main className="min-h-dvh pb-24">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
        <div className="safe-x mx-auto flex h-14 max-w-screen-sm items-center gap-3">
          <Link
            href="/"
            aria-label="返回首页"
            className="tap-highlight flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-lg font-black"
          >
            &lt;
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-bold text-brand">{article.date}</p>
            <h1 className="truncate text-sm font-black text-text">
              {shortTitle(article.title)}
            </h1>
          </div>
          <ThemeToggle compact />
        </div>
      </header>

      {activeVocab ? (
        <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 px-4">
          <div className="mx-auto max-w-screen-sm rounded-[8px] border border-line bg-panel p-4 shadow-[var(--shadow)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-text">
                  {activeVocab.word}
                </p>
                <p className="mt-1 text-sm leading-6 text-sub">
                  {[activeVocab.phonetic, activeVocab.pos, activeVocab.level]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AudioButton
                  className="h-8 w-8 rounded-full"
                  label={`播放 ${activeVocab.word}`}
                  url={activeVocab.audioUrl}
                />
                <button
                  type="button"
                  onClick={() => setActiveVocab(null)}
                  className="h-8 w-8 rounded-full bg-muted text-sm font-black text-sub"
                >
                  X
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-text">
              {activeVocab.cn}
            </p>
          </div>
        </div>
      ) : null}

      <div className="safe-x mx-auto max-w-screen-sm pt-[calc(env(safe-area-inset-top)+4.5rem)]">
        <section className="mb-4 rounded-[8px] border border-line bg-panel p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
            Study Article
          </p>
          <h2 className="mt-2 text-xl font-black leading-tight text-text">
            {article.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-sub">{article.summary}</p>
        </section>

        <nav className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-30 -mx-4 mb-4 overflow-x-auto border-y border-line bg-bg px-4 py-2 no-scrollbar">
          <div className="mx-auto flex max-w-screen-sm gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "h-9 shrink-0 rounded-full px-4 text-sm font-bold transition",
                  activeTab === tab.key
                    ? "bg-brand text-white"
                    : "bg-panel text-sub",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {activeTab === "original" ? (
          <section className="space-y-3">
            {article.paragraphs.map((paragraph, index) => {
              const isShowingCn = Boolean(visibleCn[paragraph.id]);
              const translation = translations[paragraph.id];
              return (
                <article
                  key={paragraph.id}
                  ref={(node) => {
                    paragraphRefs.current[paragraph.id] = node;
                  }}
                  onTouchStart={(event) =>
                    handleTouchStart(
                      paragraph.id,
                      event.touches[0]?.clientX || 0,
                    )
                  }
                  onTouchEnd={(event) =>
                    handleTouchEnd(
                      paragraph,
                      event.changedTouches[0]?.clientX || 0,
                    )
                  }
                  className={[
                    "scroll-mt-36 rounded-[8px] border bg-panel p-4 transition",
                    pulseParagraphId === paragraph.id
                      ? "border-brand shadow-[0_0_0_3px_var(--brand-soft)]"
                      : "border-line",
                  ].join(" ")}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-brand">
                      P{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleParagraphTranslation(paragraph)}
                      className="h-8 rounded-full bg-muted px-3 text-xs font-bold text-sub"
                    >
                      {isShowingCn
                        ? "看英文"
                        : loadingCn[paragraph.id]
                          ? "翻译中"
                          : "看中文"}
                    </button>
                  </div>
                  {paragraph.speaker ? (
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-sub">
                      {paragraph.speaker}
                    </p>
                  ) : null}
                  <p className="text-[17px] font-semibold leading-8 text-text">
                    {isShowingCn
                      ? translation || "暂无翻译"
                      : renderHighlightedText(paragraph.en)}
                  </p>
                </article>
              );
            })}
          </section>
        ) : null}

        {activeTab === "translation" ? (
          <section className="space-y-3">
            {article.paragraphs.map((paragraph, index) => (
              <article
                key={paragraph.id}
                className="rounded-[8px] border border-line bg-panel p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-brand">
                    P{index + 1}
                  </span>
                  {!translations[paragraph.id] ? (
                    <button
                      type="button"
                      onClick={() => void ensureTranslation(paragraph)}
                      className="h-8 rounded-full bg-muted px-3 text-xs font-bold text-sub"
                    >
                      {loadingCn[paragraph.id] ? "翻译中" : "获取翻译"}
                    </button>
                  ) : null}
                </div>
                <p className="text-base font-semibold leading-8 text-text">
                  {translations[paragraph.id] || "暂无翻译，点击获取翻译。"}
                </p>
              </article>
            ))}
          </section>
        ) : null}

        {activeTab === "vocabulary" ? (
          <section className="space-y-3">
            {article.vocabulary.map((vocab) => (
              <button
                key={vocab.word}
                type="button"
                onClick={() => jumpToVocabulary(vocab)}
                className="block w-full rounded-[8px] border border-line bg-panel p-4 text-left transition active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-text">
                      {vocab.word}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-sub">
                      {[vocab.phonetic, vocab.pos, vocab.level]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <AudioButton
                      className="h-8 w-8 rounded-full"
                      label={`播放 ${vocab.word}`}
                      url={vocab.audioUrl}
                    />
                    <span className="rounded-full bg-brandSoft px-3 py-1 text-xs font-black text-brand">
                      定位
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-text">
                  {vocab.cn}
                </p>
                {vocab.en ? (
                  <p className="mt-2 text-sm leading-6 text-sub">{vocab.en}</p>
                ) : null}
              </button>
            ))}
          </section>
        ) : null}

        {activeTab === "sentences" ? (
          <section className="space-y-3">
            {article.sentences.map((sentence, index) => (
              <article
                key={`${sentence.en}-${index}`}
                className="rounded-[8px] border border-line bg-panel p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-brand">
                    S{index + 1}
                  </span>
                  <AudioButton
                    className="h-8 w-8 rounded-full"
                    label="播放难句"
                    url={sentence.audioUrl}
                  />
                </div>
                <p className="mt-3 text-base font-black leading-7 text-text">
                  {sentence.en}
                </p>
                <p className="mt-3 text-sm font-semibold leading-7 text-sub">
                  {sentence.cn}
                </p>
                {sentence.structure ? (
                  <p className="mt-3 rounded-[8px] bg-muted p-3 text-sm leading-6 text-text">
                    {sentence.structure}
                  </p>
                ) : null}
                {sentence.analysis ? (
                  <p className="mt-2 text-sm leading-6 text-sub">
                    {sentence.analysis}
                  </p>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}

        {activeTab === "quiz" ? (
          <section className="space-y-3">
            {article.quiz.map((quiz, index) => (
              <article
                key={`${quiz.question}-${index}`}
                className="rounded-[8px] border border-line bg-panel p-4"
              >
                <span className="text-xs font-black text-brand">
                  Q{index + 1}
                </span>
                <h3 className="mt-3 text-base font-black leading-7 text-text">
                  {quiz.question}
                </h3>
                <div className="mt-4 space-y-2">
                  {quiz.options.map((option, optionIndex) => (
                    <div
                      key={option}
                      className={[
                        "rounded-[8px] border p-3 text-sm font-semibold leading-6",
                        optionIndex === quiz.answer
                          ? "border-good bg-brandSoft text-text"
                          : "border-line bg-bg text-sub",
                      ].join(" ")}
                    >
                      {option}
                    </div>
                  ))}
                </div>
                {quiz.explanation ? (
                  <p className="mt-3 text-sm leading-6 text-sub">
                    {quiz.explanation}
                  </p>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 rounded-full bg-brand text-lg font-black text-white shadow-[var(--shadow)] active:scale-95"
      >
        词
      </button>

      {isSheetOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="关闭词汇面板"
            className="absolute inset-0 bg-black/35"
            onClick={() => setIsSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[72dvh] rounded-t-[8px] border border-line bg-panel pb-safe shadow-[var(--shadow)]">
            <div className="mx-auto h-full max-w-screen-sm">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-base font-black text-text">词汇定位</h2>
                <button
                  type="button"
                  onClick={() => setIsSheetOpen(false)}
                  className="h-9 w-9 rounded-full bg-muted text-sm font-black text-sub"
                >
                  X
                </button>
              </div>
              <div className="max-h-[calc(72dvh-4rem)] overflow-y-auto px-4 py-3">
                {article.vocabulary.map((vocab) => (
                  <button
                    key={vocab.word}
                    type="button"
                    onClick={() => jumpToVocabulary(vocab)}
                    className="flex w-full items-center justify-between gap-3 border-b border-line py-3 text-left last:border-b-0"
                  >
                    <span>
                      <span className="block text-sm font-black text-text">
                        {vocab.word}
                      </span>
                      <span className="mt-1 line-clamp-1 block text-xs font-semibold text-sub">
                        {vocab.cn}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-black text-brand">
                      定位
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
