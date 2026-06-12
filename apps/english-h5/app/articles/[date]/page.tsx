import { getArticleByDate, getArticleList } from "@study/core/data";
import { DEFAULT_LOCALE } from "@study/core/i18n";
import { buildArticleJsonLd, trimSeoDescription } from "@study/core/seo";
import type { StudyArticle } from "@study/core/types";
import { LocaleRedirectScript } from "@study/ui/LocaleRedirectScript";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "../../components/JsonLd";
import { StudyArticleClient } from "../../components/StudyArticleClient";

const siteUrl =
  process.env.NEXT_PUBLIC_H5_ORIGIN || "https://english-h5.vercel.app";

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const articles = await getArticleList(DEFAULT_LOCALE);
    return articles.map((article) => ({ date: article.date }));
  } catch {
    return [];
  }
}

async function loadArticle(date: string): Promise<StudyArticle | null> {
  try {
    return await getArticleByDate(date, DEFAULT_LOCALE);
  } catch {
    return null;
  }
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
  const description = trimSeoDescription(article.summary);
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
      modifiedTime: article.date,
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
  const articles = await getArticleList(DEFAULT_LOCALE);
  const article = await loadArticle(date);

  if (!article) notFound();

  return (
    <>
      <LocaleRedirectScript path={`/articles/${article.date}`} />
      <JsonLd data={buildArticleJsonLd(article, siteUrl, DEFAULT_LOCALE)} />
      <StudyArticleClient
        article={article}
        articles={articles}
        locale={DEFAULT_LOCALE}
      />
    </>
  );
}
