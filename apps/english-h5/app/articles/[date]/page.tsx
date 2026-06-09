import { getArticleByDate, getArticleList } from "@study/core/data";
import type { StudyArticle } from "@study/core/types";
import type { Metadata } from "next";
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

function trimDescription(value: string) {
  return value.length > 150 ? `${value.slice(0, 147)}...` : value;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  const article = await loadArticle(date);

  if (!article) {
    return {
      title: "文章不存在",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${article.date} · ${article.title}`;
  const description = trimDescription(article.summary);
  const url = `/articles/${article.date}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: article.date,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ArticlePage({
  params,
}: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const article = await loadArticle(date);

  if (!article) notFound();

  return <StudyArticleClient article={article} />;
}
