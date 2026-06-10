import type { VocabStatus } from "./types";

const VOCAB_PREFIX = "cnn_vocab_status:";
const TRANSLATION_PREFIX = "cnn_para_cn:";
const WORD_MEANING_PREFIX = "cnn_word_cn:";
const STUDIED_PREFIX = "cnn_article_studied:";
const THEME_KEY = "cnn_theme";

function safeGet(key: string): string {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {}
}

export function getVocabStatus(word: string): VocabStatus {
  return safeGet(VOCAB_PREFIX + word) as VocabStatus;
}

export function setVocabStatus(word: string, status: VocabStatus): void {
  safeSet(VOCAB_PREFIX + word, status);
}

export function getParagraphTranslation(
  articleDate: string,
  paragraphId: string,
): string {
  return safeGet(`${TRANSLATION_PREFIX}${articleDate}:${paragraphId}`);
}

export function setParagraphTranslation(
  articleDate: string,
  paragraphId: string,
  cn: string,
): void {
  safeSet(`${TRANSLATION_PREFIX}${articleDate}:${paragraphId}`, cn);
}

export function getWordMeaning(word: string): string {
  return safeGet(WORD_MEANING_PREFIX + word.trim().toLowerCase());
}

export function setWordMeaning(word: string, cn: string): void {
  safeSet(WORD_MEANING_PREFIX + word.trim().toLowerCase(), cn);
}

export function markArticleStudied(date: string): void {
  safeSet(STUDIED_PREFIX + date, "1");
}

export function isArticleStudied(date: string): boolean {
  return safeGet(STUDIED_PREFIX + date) === "1";
}

export function getStoredTheme(): "light" | "dark" | "" {
  const theme = safeGet(THEME_KEY);
  return theme === "light" || theme === "dark" ? theme : "";
}

export function setStoredTheme(theme: "light" | "dark"): void {
  safeSet(THEME_KEY, theme);
}
