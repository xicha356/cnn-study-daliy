"use client";

import {
  playAudioUrl,
  playTtsText,
  subscribeAudioPlayer,
  updateGlobalAudioMetadata,
} from "@study/core/audio";
import {
  getParagraphTranslation,
  getWordMeaning,
  setParagraphTranslation,
  setWordMeaning,
} from "@study/core/storage";
import { requestBrowserTranslation } from "@study/core/translation";
import type {
  Paragraph,
  StudyArticle,
  VocabularyItem,
} from "@study/core/types";
import { orderVocabularyByArticle } from "@study/core/vocabulary";
import { AudioButton } from "@study/ui/AudioButton";
import { GlobalAudioPlayer } from "@study/ui/GlobalAudioPlayer";
import Link from "next/link";
import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { haptic } from "../lib/haptics";
import { HapticToggle } from "./HapticToggle";
import { ThemeToggle } from "./ThemeToggle";

type TabKey = "original" | "translation" | "vocabulary" | "sentences" | "quiz";

type ActiveAudioTarget = {
  kind: "paragraph" | "sentence";
  key: string;
};

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

function cleanEnglishWord(value: string) {
  return value.match(/[A-Za-z][A-Za-z'-]*/)?.[0] || "";
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSheetMounted, setIsSheetMounted] = useState(false);
  const [pulseParagraphId, setPulseParagraphId] = useState("");
  const [wordPulseKey, setWordPulseKey] = useState("");
  const [ttsLoadingKey, setTtsLoadingKey] = useState("");
  const [pendingParagraphId, setPendingParagraphId] = useState("");
  const [pendingSentenceKey, setPendingSentenceKey] = useState("");
  const [activeAudioTarget, setActiveAudioTarget] =
    useState<ActiveAudioTarget | null>(null);
  const [copiedKey, setCopiedKey] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  const paragraphRefs = useRef<Record<string, HTMLElement | null>>({});
  const quizFeedbackRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const sheetTimer = useRef<number | null>(null);
  const sheetFrame = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const wordPressPoint = useRef<{ x: number; y: number } | null>(null);

  const orderedVocabulary = useMemo(
    () => orderVocabularyByArticle(article),
    [article],
  );

  const vocabularyMatcher = useMemo(
    () => buildVocabularyMatcher(orderedVocabulary),
    [orderedVocabulary],
  );

  useEffect(() => {
    return () => {
      if (sheetTimer.current) window.clearTimeout(sheetTimer.current);
      if (sheetFrame.current) window.cancelAnimationFrame(sheetFrame.current);
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    };
  }, []);

  useEffect(() => {
    return subscribeAudioPlayer((player) => {
      if (
        player.status === "idle" ||
        player.status === "paused" ||
        player.status === "error" ||
        !player.visible
      ) {
        setActiveAudioTarget(null);
      }
    });
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
    haptic("selection");
    if (visibleCn[paragraph.id]) {
      setVisibleCn((current) => ({ ...current, [paragraph.id]: false }));
      return;
    }

    const hadTranslation = Boolean(
      translations[paragraph.id] ||
        getParagraphTranslation(article.date, paragraph.id),
    );
    try {
      const translated = await ensureTranslation(paragraph);
      setVisibleCn((current) => ({ ...current, [paragraph.id]: true }));
      if (!hadTranslation) haptic(translated ? "success" : "warning");
    } catch {
      haptic("error");
    }
  }

  async function requestParagraphTranslation(paragraph: Paragraph) {
    haptic("selection");
    const hadTranslation = Boolean(
      translations[paragraph.id] ||
        getParagraphTranslation(article.date, paragraph.id),
    );
    try {
      const translated = await ensureTranslation(paragraph);
      if (!hadTranslation) haptic(translated ? "success" : "warning");
    } catch {
      haptic("error");
    }
  }

  function showVocabTip(vocab: VocabularyItem, shouldPlayAudio = false) {
    if (shouldPlayAudio) setActiveAudioTarget(null);
    if (shouldPlayAudio) {
      void playAudioUrl(vocab.audioUrl, {
        kind: "Word",
        title: vocab.word,
        subtitle: getWordSubtitle(vocab),
        description: vocab.cn,
      }).then((played) => {
        if (!played) void speakWordText(vocab.word, vocab.cn);
      });
    }
  }

  async function showPlainWordTip(word: string, pulseKey: string) {
    const cleanWord = cleanEnglishWord(word);
    if (!cleanWord) return;

    const normalized = cleanWord.toLowerCase();
    const vocab = orderedVocabulary.find(
      (item) => item.word.toLowerCase() === normalized,
    );
    setWordPulseKey(pulseKey);
    window.setTimeout(() => {
      setWordPulseKey((current) => (current === pulseKey ? "" : current));
    }, 360);

    if (vocab) {
      showVocabTip(vocab, true);
      return;
    }

    const cached = getWordMeaning(cleanWord);
    const audioPromise = speakWordText(cleanWord, cached || "查询中...");
    updateGlobalAudioMetadata({
      title: cleanWord,
      subtitle: "Word",
      description: cached || "查询中...",
    });

    if (cached) return;

    try {
      const cn = await requestBrowserTranslation(cleanWord);
      const description = cn || "暂无释义";
      setWordMeaning(cleanWord, description);
      updateGlobalAudioMetadata({ description });
      void audioPromise.then(() => updateGlobalAudioMetadata({ description }));
    } catch {
      const description = "释义查询失败，请稍后再试";
      haptic("error");
      updateGlobalAudioMetadata({ description });
      void audioPromise.then(() => updateGlobalAudioMetadata({ description }));
    }
  }

  async function readParagraphAloud(text: string, paragraphId: string) {
    haptic("play");
    setActiveAudioTarget({ kind: "paragraph", key: paragraphId });
    const ok = await playTtsText(text, {
      cacheKey: `paragraph:${article.date}:${paragraphId}`,
      kind: "Paragraph",
      title: "Paragraph reading",
      onState: (state) => {
        setPendingParagraphId(state === "loading" ? paragraphId : "");
      },
    });
    if (!ok) {
      haptic("error");
      setActiveAudioTarget(null);
    }
    return ok;
  }

  async function speakWordText(word: string, description = "") {
    const normalized = word.trim().toLowerCase();
    if (!normalized) return false;

    setActiveAudioTarget(null);
    const ok = await playTtsText(word, {
      cacheKey: `word:${normalized}`,
      kind: "Word",
      title: word,
      description,
      onState: (state) => {
        setTtsLoadingKey(state === "loading" ? normalized : "");
      },
    });
    if (!ok) haptic("error");
    return ok;
  }

  async function speakSentenceText(text: string, key: string) {
    haptic("play");
    setActiveAudioTarget({ kind: "sentence", key });
    const ok = await playTtsText(text, {
      cacheKey: `sentence:${key}`,
      kind: "Sentence",
      title: "Sentence reading",
      onState: (state) => {
        setPendingSentenceKey(state === "loading" ? key : "");
      },
    });
    if (!ok) {
      haptic("error");
      setActiveAudioTarget(null);
    }
    return ok;
  }

  function cancelWordLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    wordPressPoint.current = null;
  }

  function startWordLongPress(
    event: PointerEvent<HTMLElement>,
    word: string,
    pulseKey: string,
  ) {
    if (event.pointerType === "mouse") return;
    const normalized = word.trim();
    if (!normalized) return;
    cancelWordLongPress();
    wordPressPoint.current = { x: event.clientX, y: event.clientY };
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      haptic("play");
      void showPlainWordTip(normalized, pulseKey);
    }, 460);
  }

  function handleWordPressMove(event: PointerEvent<HTMLElement>) {
    const point = wordPressPoint.current;
    if (!point) return;
    const moved = Math.hypot(event.clientX - point.x, event.clientY - point.y);
    if (moved > 8) cancelWordLongPress();
  }

  async function copyArticle() {
    if (await copyText(buildArticleCopyText(article))) {
      haptic("success");
      setCopiedKey("article");
      window.setTimeout(() => {
        setCopiedKey((current) => (current === "article" ? "" : current));
      }, 1400);
    }
  }

  async function copyParagraph(text: string, id: string) {
    if (await copyText(text)) {
      haptic("success");
      const key = `paragraph:${id}`;
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current));
      }, 1400);
    }
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

  function openVocabularySheet() {
    haptic("sheet");
    if (sheetTimer.current) window.clearTimeout(sheetTimer.current);
    if (sheetFrame.current) window.cancelAnimationFrame(sheetFrame.current);
    setIsSheetMounted(true);
    sheetFrame.current = window.requestAnimationFrame(() => {
      sheetFrame.current = null;
      setIsSheetOpen(true);
    });
  }

  function closeVocabularySheet(withFeedback = true) {
    if (withFeedback) haptic("sheet");
    if (sheetFrame.current) window.cancelAnimationFrame(sheetFrame.current);
    setIsSheetOpen(false);
    if (sheetTimer.current) window.clearTimeout(sheetTimer.current);
    sheetTimer.current = window.setTimeout(() => {
      setIsSheetMounted(false);
    }, 260);
  }

  function jumpToVocabulary(vocab: VocabularyItem) {
    haptic("selection");
    const paragraph = findParagraphForVocabulary(vocab);
    showVocabTip(vocab);
    closeVocabularySheet(false);
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

  function handleAudioButtonHaptic(event: "play" | "pause" | "error") {
    if (event === "play") {
      setActiveAudioTarget(null);
      haptic("play");
    } else if (event === "pause") haptic("tap");
    else haptic("error");
  }

  function handlePlayerHaptic(
    event: "play" | "pause" | "loop" | "close" | "seek" | "speed",
  ) {
    if (event === "play") haptic("play");
    else if (event === "loop") haptic("toggle");
    else if (event === "seek" || event === "speed") haptic("scrub");
    else haptic("tap");
  }

  function answerQuiz(
    questionIndex: number,
    optionIndex: number,
    correctIndex: number,
  ) {
    setQuizAnswers((current) => {
      if (typeof current[questionIndex] !== "number") {
        haptic(optionIndex === correctIndex ? "success" : "warning");
        window.setTimeout(() => {
          quizFeedbackRefs.current[questionIndex]?.scrollIntoView({
            block: "center",
            behavior: "smooth",
          });
        }, 80);
      }
      return {
        ...current,
        [questionIndex]: optionIndex,
      };
    });
  }

  function renderHighlightedText(text: string) {
    const parts: ReactNode[] = [];
    const lowerText = text.toLowerCase();
    let index = 0;
    let plainIndex = 0;

    function pushPlainSegment(segment: string) {
      let cursor = 0;
      const wordPattern = /[A-Za-z][A-Za-z'-]*/g;
      for (const match of segment.matchAll(wordPattern)) {
        const start = match.index || 0;
        if (start > cursor) {
          parts.push(segment.slice(cursor, start));
        }

        const word = match[0];
        const pulseKey = `plain-${plainIndex}-${start}-${word.toLowerCase()}`;
        parts.push(
          <span
            key={pulseKey}
            onPointerDown={(event) => startWordLongPress(event, word, pulseKey)}
            onPointerUp={cancelWordLongPress}
            onPointerCancel={cancelWordLongPress}
            onPointerLeave={cancelWordLongPress}
            onPointerMove={handleWordPressMove}
            onContextMenu={(event) => event.preventDefault()}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              haptic("play");
              void showPlainWordTip(word, pulseKey);
            }}
            className={[
              "touch-callout-none inline cursor-pointer select-none rounded px-0.5 transition active:bg-brandSoft active:text-brand",
              wordPulseKey === pulseKey
                ? "word-pop bg-brandSoft text-brand"
                : "",
            ].join(" ")}
            title="Long press to hear and translate"
          >
            {word}
          </span>,
        );
        cursor = start + word.length;
      }

      if (cursor < segment.length) {
        parts.push(segment.slice(cursor));
      }
      plainIndex += 1;
    }

    while (index < text.length) {
      const match = vocabularyMatcher.find(({ lowerWord }) => {
        if (!lowerText.startsWith(lowerWord, index)) return false;
        const before = text[index - 1];
        const after = text[index + lowerWord.length];
        return !isLetter(before) && !isLetter(after);
      });

      if (!match) {
        let next = index + 1;
        while (next < text.length) {
          const hasVocabAtNext = vocabularyMatcher.some(({ lowerWord }) => {
            if (!lowerText.startsWith(lowerWord, next)) return false;
            const before = text[next - 1];
            const after = text[next + lowerWord.length];
            return !isLetter(before) && !isLetter(after);
          });
          if (hasVocabAtNext) break;
          next += 1;
        }
        pushPlainSegment(text.slice(index, next));
        index = next;
        continue;
      }

      const value = text.slice(index, index + match.lowerWord.length);
      const pulseKey = `vocab-${index}-${match.item.word.toLowerCase()}`;
      parts.push(
        <button
          type="button"
          key={`${match.item.word}-${index}`}
          onClick={() => {
            haptic("play");
            setWordPulseKey(pulseKey);
            window.setTimeout(() => {
              setWordPulseKey((current) =>
                current === pulseKey ? "" : current,
              );
            }, 360);
            showVocabTip(match.item, true);
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            haptic("play");
            void showPlainWordTip(value, pulseKey);
          }}
          onContextMenu={(event) => event.preventDefault()}
          className={[
            "touch-callout-none inline-flex cursor-pointer select-none items-center gap-1 rounded bg-brandSoft px-1 font-extrabold text-brand underline decoration-brand underline-offset-4",
            wordPulseKey === pulseKey ? "word-pop" : "",
          ].join(" ")}
        >
          {value}
          {ttsLoadingKey === match.item.word.toLowerCase() ? (
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent"
            />
          ) : null}
        </button>,
      );
      index += match.lowerWord.length;
    }

    return parts;
  }

  return (
    <main className="min-h-dvh pb-40">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
        <div className="safe-x mx-auto flex h-14 max-w-screen-sm items-center gap-3">
          <Link
            href="/"
            aria-label="返回首页"
            onClick={() => haptic("tap")}
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
          <button
            type="button"
            onClick={() => {
              haptic("tap");
              void copyArticle();
            }}
            aria-label="Copy full article"
            title="Copy full article"
            className={[
              "tap-highlight flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-sm font-black text-sub transition active:scale-95",
              copiedKey === "article" ? "border-good text-good" : "",
            ].join(" ")}
          >
            <span aria-hidden="true">
              {copiedKey === "article" ? "✓" : "⧉"}
            </span>
          </button>
          <HapticToggle compact />
          <ThemeToggle compact />
        </div>
      </header>

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
                onClick={() => {
                  if (activeTab !== tab.key) haptic("selection");
                  setActiveTab(tab.key);
                }}
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
              const isReadingParagraph = pendingParagraphId === paragraph.id;
              const isActiveParagraph =
                activeAudioTarget?.kind === "paragraph" &&
                activeAudioTarget.key === paragraph.id;
              return (
                <article
                  key={paragraph.id}
                  ref={(node) => {
                    paragraphRefs.current[paragraph.id] = node;
                  }}
                  className={[
                    "scroll-mt-36 rounded-[8px] border bg-panel p-4 transition",
                    pulseParagraphId === paragraph.id
                      ? "paragraph-pulse border-brand shadow-[0_0_0_3px_var(--brand-soft)]"
                      : isActiveParagraph
                        ? "border-brand shadow-[0_0_0_2px_var(--brand-soft)]"
                        : "border-line",
                  ].join(" ")}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-brand">
                      P{index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          haptic("tap");
                          void copyParagraph(
                            isShowingCn
                              ? translation || "暂无翻译"
                              : paragraph.en,
                            paragraph.id,
                          );
                        }}
                        aria-label={`Copy paragraph ${index + 1}`}
                        title={`Copy paragraph ${index + 1}`}
                        className={[
                          "inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-panel text-xs font-black text-sub transition active:scale-95",
                          copiedKey === `paragraph:${paragraph.id}`
                            ? "border-good text-good"
                            : "",
                        ].join(" ")}
                      >
                        <span aria-hidden="true">
                          {copiedKey === `paragraph:${paragraph.id}`
                            ? "✓"
                            : "⧉"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void readParagraphAloud(paragraph.en, paragraph.id)
                        }
                        aria-label={`Read paragraph ${index + 1}`}
                        title={`Read paragraph ${index + 1}`}
                        className={[
                          "inline-flex h-8 w-8 items-center justify-center rounded-full border bg-panel text-xs font-black transition active:scale-95",
                          isReadingParagraph
                            ? "border-brand text-brand"
                            : "border-line text-sub",
                        ].join(" ")}
                      >
                        {isReadingParagraph ? (
                          <span
                            aria-hidden="true"
                            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                          />
                        ) : (
                          <span aria-hidden="true">▶</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void toggleParagraphTranslation(paragraph)
                        }
                        aria-label={
                          isShowingCn ? "Show English" : "Translate paragraph"
                        }
                        title={
                          isShowingCn ? "Show English" : "Translate paragraph"
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-sub"
                      >
                        <span aria-hidden="true">
                          {loadingCn[paragraph.id] ? "…" : "⇄"}
                        </span>
                      </button>
                    </div>
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
                      onClick={() =>
                        void requestParagraphTranslation(paragraph)
                      }
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
            {orderedVocabulary.map((vocab) => (
              <article
                key={vocab.word}
                className="rounded-[8px] border border-line bg-panel p-4"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => jumpToVocabulary(vocab)}
                    className="min-w-0 flex-1 text-left transition active:scale-[0.99]"
                    aria-label={`Locate ${vocab.word}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-black text-text">
                          {vocab.word}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-sub">
                          {[
                            vocab.phonetic,
                            vocab.pos,
                            vocab.usage || vocab.level,
                            vocab.difficulty,
                            vocab.domain,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brandSoft text-sm font-black text-brand"
                      >
                        &gt;
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6 text-text">
                      {vocab.cn}
                    </p>
                    {vocab.en ? (
                      <p className="mt-2 text-sm leading-6 text-sub">
                        {vocab.en}
                      </p>
                    ) : null}
                  </button>
                  <AudioButton
                    className="h-8 w-8 shrink-0 rounded-full"
                    label={`Play ${vocab.word}`}
                    onHaptic={handleAudioButtonHaptic}
                    subtitle={getWordSubtitle(vocab)}
                    description={vocab.cn}
                    url={vocab.audioUrl}
                  />
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {activeTab === "sentences" ? (
          <section className="space-y-3">
            {article.sentences.map((sentence, index) => {
              const sentenceKey = `${article.date}:${index}`;
              const isLoading = pendingSentenceKey === sentenceKey;
              const isActiveSentence =
                activeAudioTarget?.kind === "sentence" &&
                activeAudioTarget.key === sentenceKey;
              return (
                <article
                  key={`${sentence.en}-${index}`}
                  className={[
                    "rounded-[8px] border bg-panel p-4 transition",
                    isActiveSentence
                      ? "border-brand shadow-[0_0_0_2px_var(--brand-soft)]"
                      : "border-line",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-brand">
                      S{index + 1}
                    </span>
                    <button
                      aria-label="Play sentence"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-panel text-xs font-black text-sub transition hover:border-brand hover:bg-brandSoft hover:text-brand"
                      onClick={() => {
                        void speakSentenceText(sentence.en, sentenceKey);
                      }}
                      title="Play sentence"
                      type="button"
                    >
                      {isLoading ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        "▶"
                      )}
                    </button>
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
              );
            })}
          </section>
        ) : null}

        {activeTab === "quiz" ? (
          <section className="space-y-3">
            {article.quiz.map((quiz, index) => {
              const selected = quizAnswers[index];
              const answered = typeof selected === "number";
              const answeredCorrect = selected === quiz.answer;

              return (
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
                    {quiz.options.map((option, optionIndex) => {
                      const correct = optionIndex === quiz.answer;
                      const chosen = selected === optionIndex;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            answerQuiz(index, optionIndex, quiz.answer)
                          }
                          className={[
                            "rounded-[8px] border p-3 text-left text-sm font-semibold leading-6 transition",
                            answered && correct
                              ? "choice-correct border-good bg-brandSoft text-text"
                              : answered && chosen
                                ? "choice-wrong border-bad bg-bg text-text"
                                : "border-line bg-bg text-sub",
                          ].join(" ")}
                        >
                          {option}
                          {answered ? (
                            <span className="ml-2 font-black">
                              {correct ? "✓" : chosen ? "×" : ""}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {answered ? (
                    <div
                      ref={(node) => {
                        quizFeedbackRefs.current[index] = node;
                      }}
                      className={[
                        "mt-3 rounded-[8px] border px-3 py-2 text-sm font-black",
                        answeredCorrect
                          ? "border-good bg-brandSoft text-good"
                          : "border-bad bg-bg text-bad",
                      ].join(" ")}
                    >
                      {answeredCorrect ? "答对了" : "再想想"}
                    </div>
                  ) : null}
                  {answered && quiz.explanation ? (
                    <p className="mt-3 text-sm leading-6 text-sub">
                      {quiz.explanation}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : null}
      </div>

      <button
        type="button"
        onClick={openVocabularySheet}
        aria-label="Open vocabulary index"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+9rem)] right-4 z-40 h-14 w-14 rounded-full bg-brand text-lg font-black text-white shadow-[var(--shadow)] active:scale-95"
      >
        词
      </button>

      {isSheetMounted ? (
        <div className="fixed inset-0 z-50" aria-hidden={!isSheetOpen}>
          <button
            type="button"
            aria-label="Close vocabulary index"
            className={[
              "absolute inset-0 bg-black/35 transition-opacity duration-300",
              isSheetOpen ? "opacity-100" : "opacity-0",
            ].join(" ")}
            onClick={() => closeVocabularySheet()}
          />
          <div
            className={[
              "absolute inset-x-0 bottom-0 max-h-[72dvh] rounded-t-[8px] border border-line bg-panel pb-safe shadow-[var(--shadow)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              isSheetOpen
                ? "translate-y-0 opacity-100"
                : "translate-y-full opacity-95",
            ].join(" ")}
          >
            <div className="mx-auto h-full max-w-screen-sm">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-base font-black text-text">词汇定位</h2>
                <button
                  type="button"
                  onClick={() => closeVocabularySheet()}
                  aria-label="Close"
                  title="Close"
                  className="h-9 w-9 rounded-full bg-muted text-sm font-black text-sub"
                >
                  X
                </button>
              </div>
              <div className="max-h-[calc(72dvh-4rem)] overflow-y-auto px-4 py-3">
                {orderedVocabulary.map((vocab) => (
                  <div
                    key={vocab.word}
                    className="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => jumpToVocabulary(vocab)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                      aria-label={`Locate ${vocab.word}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-text">
                          {vocab.word}
                        </span>
                        <span className="mt-1 line-clamp-1 block text-xs font-semibold text-sub">
                          {vocab.cn}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brandSoft text-sm font-black text-brand"
                      >
                        &gt;
                      </span>
                    </button>
                    <AudioButton
                      className="h-8 w-8 shrink-0 rounded-full"
                      label={`Play ${vocab.word}`}
                      onHaptic={handleAudioButtonHaptic}
                      subtitle={getWordSubtitle(vocab)}
                      description={vocab.cn}
                      url={vocab.audioUrl}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <GlobalAudioPlayer variant="mobile" onHaptic={handlePlayerHaptic} />
    </main>
  );
}
