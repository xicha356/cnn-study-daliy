import { getArticleByDate, getArticleList } from "@study/core/data";
import type { ArticleIndexItem, StudyArticle } from "@study/core/types";
import { notFound } from "next/navigation";
import { ArticleReader } from "../../components/ArticleReader";

export const dynamicParams = false;

async function loadArticleList(): Promise<ArticleIndexItem[]> {
  try {
    return await getArticleList();
  } catch {
    return [];
  }
}

async function loadArticle(date: string): Promise<StudyArticle | null> {
  try {
    return await getArticleByDate(date);
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const articles = await loadArticleList();
  return articles.map((article) => ({ date: article.date }));
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const articles = await loadArticleList();
  const article = await loadArticle(date);

  if (!article) {
    notFound();
  }

  return <ArticleReader article={article} articleList={articles} />;
}
