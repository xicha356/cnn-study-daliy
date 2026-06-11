"use client";

export type HapticKind =
  | "tap"
  | "selection"
  | "play"
  | "success"
  | "warning"
  | "error"
  | "sheet"
  | "toggle"
  | "scrub";

const HAPTICS_KEY = "cnn_haptics";

const patterns: Record<HapticKind, number | number[]> = {
  tap: 8,
  selection: 12,
  play: 16,
  success: [12, 34, 12],
  warning: [24, 34, 24],
  error: [36, 36, 36],
  sheet: 14,
  toggle: [10, 28, 10],
  scrub: 7,
};

let lastHapticAt = 0;

function canAccessStorage() {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export function isHapticsSupported() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  );
}

export function getHapticsEnabled() {
  if (!canAccessStorage()) return true;
  try {
    return window.localStorage.getItem(HAPTICS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean) {
  if (!canAccessStorage()) return;
  try {
    window.localStorage.setItem(HAPTICS_KEY, enabled ? "on" : "off");
  } catch {}
}

export function haptic(kind: HapticKind) {
  if (!isHapticsSupported()) return false;
  if (!getHapticsEnabled()) return false;
  if (document.visibilityState !== "visible") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  const now = Date.now();
  const minimumGap =
    kind === "scrub"
      ? 420
      : kind === "success" || kind === "warning" || kind === "error"
        ? 0
        : 90;
  if (now - lastHapticAt < minimumGap) return false;
  lastHapticAt = now;

  return navigator.vibrate(patterns[kind]);
}
