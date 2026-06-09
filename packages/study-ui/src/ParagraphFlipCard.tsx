"use client";

import {
  getParagraphTranslation,
  setParagraphTranslation,
} from "@study/core/storage";
import { requestBrowserTranslation } from "@study/core/translation";
import type { Paragraph } from "@study/core/types";
import { useState } from "react";
import { cn } from "./utils";

export function ParagraphFlipCard({
  articleDate,
  paragraph,
  children,
  className,
}: {
  articleDate: string;
  paragraph: Paragraph;
  children: React.ReactNode;
  className?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const [cnText, setCnText] = useState(paragraph.cn || "");
  const [loading, setLoading] = useState(false);

  async function ensureCn() {
    if (cnText) return cnText;
    const cached = getParagraphTranslation(articleDate, paragraph.id);
    if (cached) {
      setCnText(cached);
      return cached;
    }
    setLoading(true);
    try {
      const translated = await requestBrowserTranslation(paragraph.en);
      if (translated) {
        setParagraphTranslation(articleDate, paragraph.id, translated);
        setCnText(translated);
      }
      return translated;
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    if (!flipped) await ensureCn();
    setFlipped((value) => !value);
  }

  return (
    <article
      className={cn(
        "group touch-pan-y border-b border-line py-5 [perspective:1200px]",
        className,
      )}
      onDoubleClick={() => void toggle()}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        {paragraph.speaker ? (
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-bold uppercase tracking-wide text-sub">
            {paragraph.speaker}
          </span>
        ) : (
          <span />
        )}
        <button
          className="rounded-full border border-line px-3 py-1 text-xs font-bold text-sub transition hover:border-brand hover:bg-brandSoft hover:text-brand"
          onClick={() => void toggle()}
          type="button"
        >
          {flipped ? "EN" : "译"}
        </button>
      </div>
      <div
        className={cn(
          "grid transition-transform duration-300 [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        <div className="col-start-1 row-start-1 min-w-0 [backface-visibility:hidden]">
          {children}
        </div>
        <div className="col-start-1 row-start-1 min-w-0 rounded-lg border border-line bg-muted p-4 leading-8 text-text [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {loading ? "正在加载中文翻译..." : cnText || "暂无中文翻译"}
        </div>
      </div>
    </article>
  );
}
