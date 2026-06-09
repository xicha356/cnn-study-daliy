"use client";

import { normalizeAudioUrl } from "@study/core/audio";
import { useEffect, useRef, useState } from "react";

type AudioStatus = "idle" | "loading" | "playing" | "error";

type AudioButtonProps = {
  url?: string;
  label?: string;
};

const statusIcon: Record<AudioStatus, string> = {
  idle: "▶",
  loading: "…",
  playing: "❚❚",
  error: "!",
};

export function AudioButton({ url, label = "播放音频" }: AudioButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const audioUrl = normalizeAudioUrl(url);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  async function toggleAudio() {
    if (!audioUrl) return;

    if (status === "playing") {
      audioRef.current?.pause();
      setStatus("idle");
      return;
    }

    let audio = audioRef.current;

    if (!audio) {
      audio = new Audio(audioUrl);
      audio.addEventListener("ended", () => setStatus("idle"));
      audio.addEventListener("error", () => setStatus("error"));
      audioRef.current = audio;
    }

    try {
      setStatus("loading");
      await audio.play();
      setStatus("playing");
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
