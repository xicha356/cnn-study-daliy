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

export type HapticResult = {
  ok: boolean;
  supported: boolean;
  enabled: boolean;
  visible: boolean;
  returned: boolean;
  reason:
    | "ok"
    | "unsupported"
    | "disabled"
    | "hidden"
    | "rate-limited"
    | "error";
  pattern?: number | number[];
};

const HAPTICS_KEY = "cnn_haptics";

const patterns: Record<HapticKind, number | number[]> = {
  tap: 45,
  selection: 38,
  play: 65,
  success: [35, 45, 70],
  warning: [55, 40, 55],
  error: [80, 45, 80],
  sheet: 55,
  toggle: [45, 55, 45],
  scrub: 35,
};

const testPattern = [90, 50, 90];
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

function vibratePattern(
  pattern: number | number[],
  options: { force?: boolean; kind?: HapticKind } = {},
): HapticResult {
  const supported = isHapticsSupported();
  const enabled = getHapticsEnabled();
  const visible =
    typeof document === "undefined" || document.visibilityState === "visible";
  const base = { supported, enabled, visible, pattern };

  if (!supported) {
    return { ...base, ok: false, returned: false, reason: "unsupported" };
  }
  if (!options.force && !enabled) {
    return { ...base, ok: false, returned: false, reason: "disabled" };
  }
  if (!visible) {
    return { ...base, ok: false, returned: false, reason: "hidden" };
  }

  const now = Date.now();
  const kind = options.kind;
  const minimumGap =
    kind === "scrub"
      ? 420
      : kind === "success" || kind === "warning" || kind === "error"
        ? 0
        : 90;
  if (!options.force && now - lastHapticAt < minimumGap) {
    return { ...base, ok: false, returned: false, reason: "rate-limited" };
  }
  lastHapticAt = now;

  try {
    navigator.vibrate(0);
    const returned = navigator.vibrate(pattern);
    return {
      ...base,
      ok: returned,
      returned,
      reason: returned ? "ok" : "error",
    };
  } catch {
    return { ...base, ok: false, returned: false, reason: "error" };
  }
}

export function haptic(kind: HapticKind) {
  return vibratePattern(patterns[kind], { kind }).ok;
}

export function testHaptic() {
  return vibratePattern(testPattern, { force: true });
}
