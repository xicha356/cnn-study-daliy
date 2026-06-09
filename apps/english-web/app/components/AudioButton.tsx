"use client";

import {
  normalizeAudioUrl,
  playAudioUrl,
  subscribeAudioPlayer,
  toggleGlobalAudioPlayback,
} from "@study/core/audio";
import { useEffect, useState } from "react";

type AudioStatus = "idle" | "loading" | "playing" | "error";

type AudioButtonProps = {
  url?: string;
  label?: string;
  playbackRate?: number;
};

const statusIcon: Record<AudioStatus, string> = {
  idle: "▶",
  loading: "…",
  playing: "❚❚",
  error: "!",
};

export function AudioButton({ url, label = "Play audio" }: AudioButtonProps) {
  const [status, setStatus] = useState<AudioStatus>("idle");
  const audioUrl = normalizeAudioUrl(url);

  useEffect(() => {
    return subscribeAudioPlayer((player) => {
      if (!audioUrl || player.src !== audioUrl) {
        setStatus((current) => (current === "loading" ? current : "idle"));
        return;
      }
      if (player.status === "playing") setStatus("playing");
      else if (player.status === "error") setStatus("error");
      else setStatus("idle");
    });
  }, [audioUrl]);

  async function toggleAudio() {
    if (!audioUrl) return;

    if (status === "playing") {
      void toggleGlobalAudioPlayback();
      setStatus("idle");
      return;
    }

    try {
      setStatus("loading");
      const ok = await playAudioUrl(url, { title: label, kind: "Audio" });
      setStatus(ok ? "playing" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <button
      type="button"
      onClick={toggleAudio}
      disabled={!audioUrl}
      className={[
        "focus-ring inline-flex items-center justify-center rounded-md border border-line bg-panel text-text transition hover:border-brand hover:text-brand",
        "h-9 w-9 text-xs",
      ].join(" ")}
      aria-label={status === "playing" ? "暂停音频" : label}
      title={status === "error" ? "音频不可用" : label}
    >
      <span aria-hidden>{audioUrl ? statusIcon[status] : "×"}</span>
    </button>
  );
}
