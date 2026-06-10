"use client";

import type { VocabularyItem } from "@study/core/types";
import { AudioButton } from "./AudioButton";
import { cn } from "./utils";

export function WordPopup({
  word,
  visible,
  className,
}: {
  word: VocabularyItem | null;
  visible: boolean;
  className?: string;
}) {
  if (!word) return null;
  return (
    <div
      className={cn(
        "fixed left-1/2 top-[max(10px,calc(env(safe-area-inset-top)+10px))] z-50 max-h-[36vh] w-[calc(100vw-20px)] max-w-2xl -translate-x-1/2 overflow-auto rounded-xl border border-line bg-panel p-4 shadow-xl transition md:top-4 md:max-h-80",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-3 pointer-events-none opacity-0",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <strong className="text-xl text-text">{word.word}</strong>
            {word.phonetic ? (
              <span className="font-mono text-sm text-sub">
                {word.phonetic}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex gap-2 text-xs font-bold">
            {word.pos ? (
              <span className="rounded-full bg-brandSoft px-2 py-1 text-brand">
                {word.pos}
              </span>
            ) : null}
            {word.usage || word.level ? (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-warn">
                {word.usage || word.level}
              </span>
            ) : null}
            {word.difficulty ? (
              <span className="rounded-full bg-muted px-2 py-1 text-sub">
                {word.difficulty}
              </span>
            ) : null}
            {word.domain ? (
              <span className="rounded-full bg-muted px-2 py-1 text-sub">
                {word.domain}
              </span>
            ) : null}
          </div>
        </div>
        <AudioButton label="播放单词发音" url={word.audioUrl} />
      </div>
      <div className="mt-3 font-bold text-brand">{word.cn}</div>
      {word.en ? (
        <div className="mt-1 text-sm leading-6 text-sub">{word.en}</div>
      ) : null}
    </div>
  );
}
