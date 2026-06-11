import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_LOCALE,
  type LocaleCode,
  getLocaleConfig,
  normalizeLocale,
} from "./i18n";
import type { ArticleIndexItem, StudyArticle } from "./types";

const repoRoot = process.cwd().includes(`${path.sep}apps${path.sep}`)
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const dataRoot = path.join(repoRoot, "public", "data");

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function localeCandidates(locale?: string | null): LocaleCode[] {
  const normalized = normalizeLocale(locale);
  const fallback = getLocaleConfig(normalized).fallbackLocale;
  return Array.from(new Set([normalized, fallback, DEFAULT_LOCALE]));
}

async function readLocalizedJson<T>(
  locale: string | null | undefined,
  filename: string,
): Promise<T> {
  let lastError: unknown;
  for (const candidate of localeCandidates(locale)) {
    const filePath =
      candidate === DEFAULT_LOCALE
        ? path.join(dataRoot, filename)
        : path.join(dataRoot, candidate, filename);
    try {
      return await readJson<T>(filePath);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function getArticleList(
  locale?: string | null,
): Promise<ArticleIndexItem[]> {
  return readLocalizedJson<ArticleIndexItem[]>(locale, "articles.json");
}

export async function getArticleByDate(
  date: string,
  locale?: string | null,
): Promise<StudyArticle> {
  return readLocalizedJson<StudyArticle>(
    locale,
    path.join("articles", `${date}.json`),
  );
}

export function getArticleTitle(
  article: Pick<StudyArticle, "title" | "date">,
): string {
  return article.title || `CNN This Morning · ${article.date}`;
}
