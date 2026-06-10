export const DEFAULT_PLAYBACK_RATE = 1;
const SPEED_STORAGE_KEY = "cnn-study-audio-speed";
const LOOP_STORAGE_KEY = "cnn-study-audio-loop";

export type AudioPlayerStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error";

export type AudioPlayerState = {
  visible: boolean;
  status: AudioPlayerStatus;
  title: string;
  subtitle: string;
  src: string;
  currentTime: number;
  duration: number;
  speed: number;
  loop: boolean;
  error: string;
};

type PlayAudioOptions = {
  title?: string;
  subtitle?: string;
  kind?: string;
  playbackRate?: number;
};

type PlayAudioInput = number | PlayAudioOptions;

const initialPlayerState: AudioPlayerState = {
  visible: false,
  status: "idle",
  title: "",
  subtitle: "",
  src: "",
  currentTime: 0,
  duration: 0,
  speed: DEFAULT_PLAYBACK_RATE,
  loop: false,
  error: "",
};

let playerState = initialPlayerState;
let settingsHydrated = false;
let activeObjectUrl = "";
const playerListeners = new Set<(state: AudioPlayerState) => void>();

export function withBasePath(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${base}${normalized}`;
}

export function normalizeAudioUrl(url?: string): string {
  if (!url) return "";
  const clean = url.replace(/^output\/audio\//, "/audio/");
  return withBasePath(clean);
}

let sharedAudio: HTMLAudioElement | null = null;

function clampPlaybackRate(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_PLAYBACK_RATE;
  return Math.min(1.5, Math.max(0.5, value));
}

function readStoredNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const stored = Number(window.localStorage.getItem(key));
  return Number.isFinite(stored) ? stored : fallback;
}

function hydrateAudioSettings() {
  if (settingsHydrated || typeof window === "undefined") return;
  settingsHydrated = true;
  playerState = {
    ...playerState,
    loop: window.localStorage.getItem(LOOP_STORAGE_KEY) === "true",
    speed: clampPlaybackRate(
      readStoredNumber(SPEED_STORAGE_KEY, DEFAULT_PLAYBACK_RATE),
    ),
  };
}

function emitPlayerState(partial: Partial<AudioPlayerState>) {
  playerState = { ...playerState, ...partial };
  for (const listener of playerListeners) listener(playerState);
}

function formatSubtitle(options: PlayAudioOptions) {
  return options.subtitle || options.kind || "Audio";
}

function coercePlayOptions(input?: PlayAudioInput): PlayAudioOptions {
  return typeof input === "number" ? { playbackRate: input } : input || {};
}

function revokeActiveObjectUrl(nextUrl = "") {
  if (activeObjectUrl && activeObjectUrl !== nextUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = "";
  }
}

function ensureAudio() {
  if (typeof Audio === "undefined") return null;
  if (sharedAudio) return sharedAudio;

  sharedAudio = new Audio();
  sharedAudio.preload = "metadata";

  sharedAudio.addEventListener("loadedmetadata", () => {
    emitPlayerState({
      duration: Number.isFinite(sharedAudio?.duration)
        ? sharedAudio?.duration || 0
        : 0,
      currentTime: sharedAudio?.currentTime || 0,
    });
  });

  sharedAudio.addEventListener("timeupdate", () => {
    emitPlayerState({
      currentTime: sharedAudio?.currentTime || 0,
      duration: Number.isFinite(sharedAudio?.duration)
        ? sharedAudio?.duration || 0
        : playerState.duration,
    });
  });

  sharedAudio.addEventListener("play", () => {
    emitPlayerState({ visible: true, status: "playing", error: "" });
  });

  sharedAudio.addEventListener("pause", () => {
    if (playerState.status === "loading" || playerState.status === "idle") {
      return;
    }
    emitPlayerState({ status: "paused" });
  });

  sharedAudio.addEventListener("ended", () => {
    if (!playerState.loop) {
      emitPlayerState({
        status: "paused",
        currentTime: playerState.duration,
      });
    }
  });

  sharedAudio.addEventListener("error", () => {
    emitPlayerState({ status: "error", error: "Audio unavailable" });
  });

  return sharedAudio;
}

export function getAudioPlayerState() {
  hydrateAudioSettings();
  return playerState;
}

export function subscribeAudioPlayer(
  listener: (state: AudioPlayerState) => void,
) {
  hydrateAudioSettings();
  playerListeners.add(listener);
  listener(playerState);
  return () => {
    playerListeners.delete(listener);
  };
}

export function getGlobalPlaybackRate() {
  hydrateAudioSettings();
  return playerState.speed;
}

export function setGlobalPlaybackRate(value: number) {
  hydrateAudioSettings();
  const speed = clampPlaybackRate(value);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SPEED_STORAGE_KEY, speed.toString());
  }
  if (sharedAudio) sharedAudio.playbackRate = speed;
  emitPlayerState({ speed });
}

export function setGlobalAudioLoop(loop: boolean) {
  hydrateAudioSettings();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOOP_STORAGE_KEY, loop ? "true" : "false");
  }
  if (sharedAudio) sharedAudio.loop = loop;
  emitPlayerState({ loop });
}

export function seekGlobalAudio(time: number) {
  const audio = ensureAudio();
  if (!audio || !Number.isFinite(time)) return;
  audio.currentTime = Math.min(Math.max(time, 0), playerState.duration || time);
  emitPlayerState({ currentTime: audio.currentTime });
}

export async function toggleGlobalAudioPlayback() {
  const audio = ensureAudio();
  if (!audio || !playerState.src) return false;

  if (playerState.status === "playing") {
    audio.pause();
    return true;
  }

  try {
    audio.playbackRate = playerState.speed;
    audio.loop = playerState.loop;
    await audio.play();
    return true;
  } catch {
    emitPlayerState({ status: "error", error: "Audio unavailable" });
    return false;
  }
}

export function closeGlobalAudioPlayer() {
  const audio = ensureAudio();
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  revokeActiveObjectUrl();
  emitPlayerState({
    visible: false,
    status: "idle",
    title: "",
    subtitle: "",
    src: "",
    currentTime: 0,
    duration: 0,
    error: "",
  });
}

async function playResolvedSource(
  src: string,
  options: PlayAudioOptions,
  isObjectUrl = false,
) {
  hydrateAudioSettings();
  const audio = ensureAudio();
  if (!src || !audio) return false;

  try {
    revokeActiveObjectUrl(isObjectUrl ? src : "");
    if (isObjectUrl) activeObjectUrl = src;

    audio.pause();
    audio.src = src;
    audio.currentTime = 0;
    audio.loop = playerState.loop;
    audio.playbackRate = playerState.speed;

    emitPlayerState({
      visible: true,
      status: "loading",
      title: options.title || "Audio",
      subtitle: formatSubtitle(options),
      src,
      currentTime: 0,
      duration: 0,
      error: "",
    });

    await audio.play();
    return true;
  } catch {
    if (isObjectUrl) revokeActiveObjectUrl();
    emitPlayerState({ status: "error", error: "Audio unavailable" });
    return false;
  }
}

export async function playAudioUrl(
  url?: string,
  input?: PlayAudioInput,
): Promise<boolean> {
  const options = coercePlayOptions(input);
  const src = normalizeAudioUrl(url);
  return playResolvedSource(src, options);
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(
      (voice) =>
        voice.lang.toLowerCase().startsWith("en-us") &&
        /male|daniel|alex|david|fred|tom|google us english/i.test(voice.name),
    ) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en-us")) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
    null
  );
}

export function speakEnglishText(
  text: string,
  playbackRate = DEFAULT_PLAYBACK_RATE,
): boolean {
  if (
    typeof window === "undefined" ||
    !window.speechSynthesis ||
    !text.trim()
  ) {
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = playbackRate;
  utterance.voice = pickEnglishVoice();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

type TtsState = "cache-hit" | "loading" | "playing" | "error";

type TtsOptions = {
  cacheKey?: string;
  endpoint?: string;
  playbackRate?: number;
  title?: string;
  subtitle?: string;
  kind?: string;
  onState?: (state: TtsState) => void;
};

const TTS_DB_NAME = "cnn-study-tts";
const TTS_STORE = "audio";

function getTtsEndpoint(endpoint?: string) {
  if (endpoint) return endpoint;
  const env = process.env.NEXT_PUBLIC_TTS_API_BASE || "";
  return `${env}/api/tts`;
}

async function digestText(value: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function openTtsDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return null;

  return new Promise((resolve) => {
    const request = indexedDB.open(TTS_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(TTS_STORE);
    };
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getCachedTts(key: string): Promise<Blob | null> {
  const db = await openTtsDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const tx = db.transaction(TTS_STORE, "readonly");
    const request = tx.objectStore(TTS_STORE).get(key);
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve((request.result as Blob) || null);
    tx.oncomplete = () => db.close();
  });
}

async function setCachedTts(key: string, blob: Blob): Promise<void> {
  const db = await openTtsDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    const tx = db.transaction(TTS_STORE, "readwrite");
    tx.objectStore(TTS_STORE).put(blob, key);
    tx.onerror = () => resolve();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

async function playBlob(
  blob: Blob,
  options: PlayAudioOptions,
): Promise<boolean> {
  if (typeof Audio === "undefined") return false;
  return playResolvedSource(URL.createObjectURL(blob), options, true);
}

export async function playTtsText(
  text: string,
  options: TtsOptions = {},
): Promise<boolean> {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return false;

  const hash = await digestText(normalized.toLowerCase());
  const cacheKey = options.cacheKey || `tts:${hash}`;
  const cached = await getCachedTts(cacheKey);
  const playOptions = {
    title: options.title || normalized,
    subtitle: options.subtitle || options.kind || "TTS",
  };

  if (cached) {
    options.onState?.("cache-hit");
    const ok = await playBlob(cached, playOptions);
    options.onState?.(ok ? "playing" : "error");
    return ok;
  }

  options.onState?.("loading");

  try {
    const response = await fetch(getTtsEndpoint(options.endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: normalized,
        playbackRate: options.playbackRate ?? DEFAULT_PLAYBACK_RATE,
      }),
    });

    if (!response.ok) throw new Error("TTS request failed");

    const blob = await response.blob();
    await setCachedTts(cacheKey, blob);
    const ok = await playBlob(blob, playOptions);
    options.onState?.(ok ? "playing" : "error");
    return ok;
  } catch {
    options.onState?.("error");
    return speakEnglishText(normalized, getGlobalPlaybackRate());
  }
}
