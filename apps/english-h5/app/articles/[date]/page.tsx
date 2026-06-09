import { getArticleByDate, getArticleList } from "@study/core/data";
import type { StudyArticle } from "@study/core/types";
import { notFound } from "next/navigation";
import { StudyArticleClient } from "../../components/StudyArticleClient";

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const articles = await getArticleList();
    return articles.map((article) => ({ date: article.date }));
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

export default async function ArticlePage({
  params,
}: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const article = await loadArticle(date);

  if (!article) notFound();

  return <StudyArticleClient article={article} />;
}
