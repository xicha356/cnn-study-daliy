import { getArticleList } from "@study/core/data";
import type { ArticleIndexItem } from "@study/core/types";
import { HomePage } from "./components/HomePage";

async function loadArticles(): Promise<ArticleIndexItem[]> {
  try {
    const articles = await getArticleList();
    return [...articles].sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export default async function Page() {
  const articles = await loadArticles();
  return <HomePage articles={articles} />;
}
