"use client";

import { useEffect, useState } from "react";
import {
  getHapticsEnabled,
  haptic,
  isHapticsSupported,
  setHapticsEnabled,
} from "../lib/haptics";

export function HapticToggle({ compact = false }: { compact?: boolean }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setSupported(isHapticsSupported());
    setEnabled(getHapticsEnabled());
  }, []);

  if (!supported) return null;

  function toggleHaptics() {
    const nextEnabled = !enabled;
    if (!nextEnabled) haptic("toggle");
    setHapticsEnabled(nextEnabled);
    setEnabled(nextEnabled);
    if (nextEnabled) haptic("toggle");
  }

  return (
    <button
      type="button"
      aria-label={enabled ? "关闭触感反馈" : "开启触感反馈"}
      aria-pressed={enabled}
      onClick={toggleHaptics}
      className={[
        "tap-highlight inline-flex shrink-0 items-center justify-center rounded-full border text-sm font-semibold shadow-sm transition active:scale-95",
        enabled
          ? "border-brand bg-brandSoft text-brand"
          : "border-line bg-panel text-sub",
        compact ? "h-9 w-9" : "h-10 gap-2 px-4",
      ].join(" ")}
      title={enabled ? "触感反馈已开启" : "触感反馈已关闭"}
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M7 9v6m5-9v12m5-9v6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
      {!compact ? <span>{enabled ? "触感" : "静音"}</span> : null}
    </button>
  );
}
