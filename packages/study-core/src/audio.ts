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
  playbackRate = 0.8,
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

export function speakEnglishText(text: string, playbackRate = 0.8): boolean {
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
