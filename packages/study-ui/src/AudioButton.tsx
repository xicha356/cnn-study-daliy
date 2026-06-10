"use client";

import {
  normalizeAudioUrl,
  playAudioUrl,
  subscribeAudioPlayer,
  toggleGlobalAudioPlayback,
} from "@study/core/audio";
import { useEffect, useState } from "react";
import { cn } from "./utils";

type AudioState = "idle" | "loading" | "playing";

function getPlayerTitle(label: string) {
  return label.replace(/^Play\s+/i, "").replace(/^播放\s*/, "").trim() || label;
}

export function AudioButton({
  url,
  label = "播放音频",
  subtitle,
  description,
  className,
}: {
  url?: string;
  label?: string;
  subtitle?: string;
  description?: string;
  className?: string;
  playbackRate?: number;
}) {
  const [state, setState] = useState<AudioState>("idle");
  const audioUrl = normalizeAudioUrl(url);

  useEffect(() => {
    return subscribeAudioPlayer((player) => {
      if (!audioUrl || player.src !== audioUrl) {
        setState((current) => (current === "loading" ? current : "idle"));
        return;
      }
      setState(player.status === "playing" ? "playing" : "idle");
    });
  }, [audioUrl]);

  async function play() {
    if (!audioUrl) return;
    if (state === "playing") {
      void toggleGlobalAudioPlayback();
      setState("idle");
      return;
    }
    try {
      setState("loading");
      const ok = await playAudioUrl(url, {
        title: getPlayerTitle(label),
        subtitle,
        description,
        kind: "Audio",
      });
      setState(ok ? "playing" : "idle");
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
      disabled={!audioUrl}
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
