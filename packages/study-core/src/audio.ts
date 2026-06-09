const DEFAULT_PLAYBACK_RATE = 0.7;

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

export async function playAudioUrl(
  url?: string,
  playbackRate = DEFAULT_PLAYBACK_RATE,
): Promise<boolean> {
  const src = normalizeAudioUrl(url);
  if (!src || typeof Audio === "undefined") return false;

  try {
    if (!sharedAudio) sharedAudio = new Audio();
    sharedAudio.pause();
    sharedAudio.currentTime = 0;
    sharedAudio.src = src;
    sharedAudio.playbackRate = playbackRate;
    await sharedAudio.play();
    return true;
  } catch {
    return false;
  }
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

async function playBlob(blob: Blob, playbackRate: number): Promise<boolean> {
  if (typeof Audio === "undefined") return false;

  try {
    if (!sharedAudio) sharedAudio = new Audio();
    const objectUrl = URL.createObjectURL(blob);
    sharedAudio.pause();
    sharedAudio.currentTime = 0;
    sharedAudio.src = objectUrl;
    sharedAudio.playbackRate = playbackRate;
    sharedAudio.onended = () => URL.revokeObjectURL(objectUrl);
    sharedAudio.onerror = () => URL.revokeObjectURL(objectUrl);
    await sharedAudio.play();
    return true;
  } catch {
    return false;
  }
}

export async function playTtsText(
  text: string,
  options: TtsOptions = {},
): Promise<boolean> {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return false;

  const playbackRate = options.playbackRate ?? DEFAULT_PLAYBACK_RATE;
  const hash = await digestText(normalized.toLowerCase());
  const cacheKey = options.cacheKey || `tts:${playbackRate}:${hash}`;
  const cached = await getCachedTts(cacheKey);

  if (cached) {
    options.onState?.("cache-hit");
    const ok = await playBlob(cached, playbackRate);
    options.onState?.(ok ? "playing" : "error");
    return ok;
  }

  options.onState?.("loading");

  try {
    const response = await fetch(getTtsEndpoint(options.endpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: normalized, playbackRate }),
    });

    if (!response.ok) throw new Error("TTS request failed");

    const blob = await response.blob();
    await setCachedTts(cacheKey, blob);
    const ok = await playBlob(blob, playbackRate);
    options.onState?.(ok ? "playing" : "error");
    return ok;
  } catch {
    options.onState?.("error");
    return speakEnglishText(normalized, playbackRate);
  }
}
