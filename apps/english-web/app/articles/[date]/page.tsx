import { getArticleByDate, getArticleList } from "@study/core/data";
import type { ArticleIndexItem, StudyArticle } from "@study/core/types";
import type { Metadata } from "next";
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

function trimDescription(value: string) {
  return value.length > 150 ? `${value.slice(0, 147)}...` : value;
}

export async function generateStaticParams() {
  const articles = await loadArticleList();
  return articles.map((article) => ({ date: article.date }));
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
