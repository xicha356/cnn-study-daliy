import { getArticleList } from "@study/core/data";
import type { ArticleIndexItem } from "@study/core/types";
import { HomeClient } from "./components/HomeClient";

async function loadArticles(): Promise<ArticleIndexItem[]> {
  try {
    return await getArticleList();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const articles = await loadArticles();
  return <HomeClient articles={articles} />;
}
