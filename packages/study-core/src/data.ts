import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ArticleIndexItem, StudyArticle } from "./types";

const repoRoot = process.cwd().includes(`${path.sep}apps${path.sep}`)
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const dataRoot = path.join(repoRoot, "public", "data");

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function getArticleList(): Promise<ArticleIndexItem[]> {
  return readJson<ArticleIndexItem[]>(path.join(dataRoot, "articles.json"));
}

export async function getArticleByDate(date: string): Promise<StudyArticle> {
  return readJson<StudyArticle>(
    path.join(dataRoot, "articles", `${date}.json`),
  );
}

export function getArticleTitle(
  article: Pick<StudyArticle, "title" | "date">,
): string {
  return article.title || `CNN This Morning · ${article.date}`;
}
