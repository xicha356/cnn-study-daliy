"use client";

import { normalizeAudioUrl } from "@study/core/audio";
import { useRef, useState } from "react";
import { cn } from "./utils";

type AudioState = "idle" | "loading" | "playing";

export function AudioButton({
  url,
  label = "播放音频",
  className,
  playbackRate = 0.8,
}: {
  url?: string;
  label?: string;
  className?: string;
  playbackRate?: number;
}) {
  const [state, setState] = useState<AudioState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function play() {
    const src = normalizeAudioUrl(url);
    if (!src) return;
    try {
      setState("loading");
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = src;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.onended = () => setState("idle");
      audioRef.current.onerror = () => setState("idle");
      await audioRef.current.play();
      setState("playing");
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      aria-label={
        state === "loading"
          ? "音频加载中"
          : state === "playing"
            ? "音频播放中"
            : label
      }
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-panel text-sm font-bold text-sub transition hover:border-brand hover:bg-brandSoft hover:text-brand disabled:cursor-not-allowed disabled:opacity-45",
        state === "playing" && "border-good bg-emerald-50 text-good",
        state === "loading" && "border-warn bg-amber-50 text-warn",
        className,
      )}
      disabled={!url}
      onClick={(event) => {
        event.stopPropagation();
        void play();
      }}
      title={label}
      type="button"
    >
      {state === "loading" ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : state === "playing" ? (
        "Ⅱ"
      ) : (
        "▶"
      )}
    </button>
  );
}
