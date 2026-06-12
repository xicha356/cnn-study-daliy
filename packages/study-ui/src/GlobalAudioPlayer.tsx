"use client";

import {
  type AudioPlayerState,
  closeGlobalAudioPlayer,
  getAudioPlayerState,
  seekGlobalAudio,
  setGlobalAudioLoop,
  setGlobalPlaybackRate,
  subscribeAudioPlayer,
  toggleGlobalAudioPlayback,
} from "@study/core/audio";
import { useEffect, useState } from "react";
import { cn } from "./utils";

type GlobalAudioPlayerProps = {
  variant?: "desktop" | "mobile";
  className?: string;
  onHaptic?: (
    event: "play" | "pause" | "loop" | "close" | "seek" | "speed",
  ) => void;
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function GlobalAudioPlayer({
  variant = "desktop",
  className,
  onHaptic,
}: GlobalAudioPlayerProps) {
  const [player, setPlayer] = useState<AudioPlayerState>(() =>
    getAudioPlayerState(),
  );
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => subscribeAudioPlayer(setPlayer), []);

  useEffect(() => {
    if (player.visible) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setShown(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), 240);
    return () => window.clearTimeout(timer);
  }, [player.visible]);

  if (!mounted) return null;

  const isMobile = variant === "mobile";
  const canSeek = player.duration > 0;
  const isPlaying = player.status === "playing";
  const progress = canSeek ? Math.min(player.currentTime, player.duration) : 0;

  function handlePlaybackToggle() {
    onHaptic?.(isPlaying ? "pause" : "play");
    void toggleGlobalAudioPlayback();
  }

  function handleLoopToggle() {
    onHaptic?.("loop");
    setGlobalAudioLoop(!player.loop);
  }

  function handleClose() {
    onHaptic?.("close");
    closeGlobalAudioPlayer();
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-50 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isMobile
          ? "inset-x-3 bottom-[calc(var(--vv-bottom,0px)+env(safe-area-inset-bottom)+0.75rem)]"
          : "bottom-4 left-1/2 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2",
        shown
          ? "opacity-100"
          : isMobile
            ? "translate-y-8 opacity-0"
            : "translate-y-4 opacity-0",
        className,
      )}
    >
      <section
        className={cn(
          "pointer-events-auto rounded-md border border-line shadow-[var(--shadow)]",
          isMobile ? "bg-panel p-3" : "bg-panel/95 p-3 backdrop-blur-xl",
        )}
        aria-label="Global audio player"
      >
        <div
          className={cn(
            "flex gap-3",
            isMobile ? "items-start" : "items-center",
          )}
        >
          <button
            type="button"
            onClick={handlePlaybackToggle}
            className={cn(
              "focus-ring inline-flex shrink-0 items-center justify-center rounded-md border border-brand bg-brand font-black text-white transition active:scale-95",
              isMobile ? "h-10 w-10" : "h-10 w-10",
            )}
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
            title={isPlaying ? "Pause" : "Play"}
          >
            <span aria-hidden>{isPlaying ? "Ⅱ" : "▶"}</span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-text">
                  {player.title || "Audio"}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-sub">
                  {player.status === "loading"
                    ? "Loading"
                    : player.error || player.subtitle}
                </p>
                {player.description ? (
                  <p className="mt-1 whitespace-normal break-words text-sm font-semibold leading-5 text-text">
                    {player.description}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={handleLoopToggle}
                  className={cn(
                    "focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm font-black transition",
                    player.loop
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line bg-bg text-sub hover:border-brand hover:text-brand",
                  )}
                  aria-label={player.loop ? "Disable loop" : "Enable loop"}
                  title={player.loop ? "Loop on" : "Loop off"}
                >
                  <span aria-hidden>∞</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-bg text-sm font-black text-sub transition hover:border-bad hover:text-bad"
                  aria-label="Close player"
                  title="Close"
                >
                  <span aria-hidden>×</span>
                </button>
              </div>
            </div>

            <div className="mt-2 grid gap-1.5">
              <input
                type="range"
                min={0}
                max={canSeek ? player.duration : 1}
                value={canSeek ? progress : 0}
                step={0.1}
                disabled={!canSeek}
                onChange={(event) =>
                  seekGlobalAudio(Number(event.currentTarget.value))
                }
                onPointerUp={() => onHaptic?.("seek")}
                onKeyUp={(event) => {
                  if (
                    event.key === "ArrowLeft" ||
                    event.key === "ArrowRight" ||
                    event.key === "Home" ||
                    event.key === "End"
                  ) {
                    onHaptic?.("seek");
                  }
                }}
                className="h-1.5 w-full cursor-pointer accent-brand disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Audio progress"
              />
              <div
                className={cn(
                  "flex gap-3 text-xs font-semibold text-sub",
                  isMobile
                    ? "items-start justify-between"
                    : "items-center justify-between",
                )}
              >
                <span className="shrink-0">
                  {formatTime(player.currentTime)} /{" "}
                  {formatTime(player.duration)}
                </span>
                <label
                  className={cn(
                    "flex min-w-0 items-center gap-2",
                    isMobile ? "max-w-[145px]" : "w-48",
                  )}
                >
                  <span className="shrink-0 font-black text-brand">
                    {player.speed.toFixed(2)}x
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={player.speed}
                    onChange={(event) =>
                      setGlobalPlaybackRate(Number(event.currentTarget.value))
                    }
                    onPointerUp={() => onHaptic?.("speed")}
                    onKeyUp={(event) => {
                      if (
                        event.key === "ArrowLeft" ||
                        event.key === "ArrowRight" ||
                        event.key === "Home" ||
                        event.key === "End"
                      ) {
                        onHaptic?.("speed");
                      }
                    }}
                    className="min-w-0 flex-1 accent-brand"
                    aria-label="Playback speed"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
