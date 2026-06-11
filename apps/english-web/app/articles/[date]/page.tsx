import { getArticleByDate, getArticleList } from "@study/core/data";
import { DEFAULT_LOCALE } from "@study/core/i18n";
import { buildArticleJsonLd, trimSeoDescription } from "@study/core/seo";
import type { ArticleIndexItem, StudyArticle } from "@study/core/types";
import { LocaleRedirectScript } from "@study/ui/LocaleRedirectScript";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleReader } from "../../components/ArticleReader";
import { JsonLd } from "../../components/JsonLd";

const siteUrl =
  process.env.NEXT_PUBLIC_WEB_ORIGIN || "https://english-web-phi.vercel.app";

export const dynamicParams = false;

async function loadArticleList(): Promise<ArticleIndexItem[]> {
  try {
    return await getArticleList(DEFAULT_LOCALE);
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
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const articles = await loadArticleList();
  const article = await loadArticle(date);

  if (!article) {
    notFound();
  }

  return (
    <>
      <LocaleRedirectScript path={`/articles/${article.date}`} />
      <JsonLd data={buildArticleJsonLd(article, siteUrl, DEFAULT_LOCALE)} />
      <ArticleReader
        article={article}
        articleList={articles}
        locale={DEFAULT_LOCALE}
      />
    </>
  );
}
