import { DEFAULT_LOCALE, normalizeLocale } from "./i18n";
import type { VocabStatus } from "./types";

const VOCAB_PREFIX = "cnn_vocab_status:";
const TRANSLATION_PREFIX = "cnn_para_cn:";
const WORD_MEANING_PREFIX = "cnn_word_cn:";
const LOCALE_TRANSLATION_PREFIX = "cnn_para_translation:";
const LOCALE_WORD_MEANING_PREFIX = "cnn_word_meaning:";
const STUDIED_PREFIX = "cnn_article_studied:";
const THEME_KEY = "cnn_theme";
const LOCALE_KEY = "cnn_locale";

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
  locale: string = DEFAULT_LOCALE,
): string {
  const normalized = normalizeLocale(locale);
  const localized = safeGet(
    `${LOCALE_TRANSLATION_PREFIX}${normalized}:${articleDate}:${paragraphId}`,
  );
  if (localized) return localized;
  if (normalized !== DEFAULT_LOCALE) return "";
  return safeGet(`${TRANSLATION_PREFIX}${articleDate}:${paragraphId}`);
}

export function setParagraphTranslation(
  articleDate: string,
  paragraphId: string,
  cn: string,
  locale: string = DEFAULT_LOCALE,
): void {
  const normalized = normalizeLocale(locale);
  safeSet(
    `${LOCALE_TRANSLATION_PREFIX}${normalized}:${articleDate}:${paragraphId}`,
    cn,
  );
  if (normalized === DEFAULT_LOCALE) {
    safeSet(`${TRANSLATION_PREFIX}${articleDate}:${paragraphId}`, cn);
  }
}

export function getWordMeaning(
  word: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const normalized = normalizeLocale(locale);
  const key = word.trim().toLowerCase();
  const localized = safeGet(
    `${LOCALE_WORD_MEANING_PREFIX}${normalized}:${key}`,
  );
  if (localized) return localized;
  if (normalized !== DEFAULT_LOCALE) return "";
  return safeGet(WORD_MEANING_PREFIX + word.trim().toLowerCase());
}

export function setWordMeaning(
  word: string,
  cn: string,
  locale: string = DEFAULT_LOCALE,
): void {
  const normalized = normalizeLocale(locale);
  const key = word.trim().toLowerCase();
  safeSet(`${LOCALE_WORD_MEANING_PREFIX}${normalized}:${key}`, cn);
  if (normalized === DEFAULT_LOCALE) {
    safeSet(WORD_MEANING_PREFIX + key, cn);
  }
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

export function getStoredLocale(): string {
  return normalizeLocale(safeGet(LOCALE_KEY));
}

export function setStoredLocale(locale: string): void {
  safeSet(LOCALE_KEY, normalizeLocale(locale));
}
