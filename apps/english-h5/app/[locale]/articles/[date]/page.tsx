import { getArticleByDate, getArticleList } from "@study/core/data";
import {
  type LocaleCode,
  SUPPORTED_LOCALES,
  getLocaleConfig,
  normalizeLocale,
} from "@study/core/i18n";
import {
  buildArticleJsonLd,
  buildLanguageAlternates,
  trimSeoDescription,
} from "@study/core/seo";
import type { StudyArticle } from "@study/core/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "../../../components/JsonLd";
import { StudyArticleClient } from "../../../components/StudyArticleClient";

const siteUrl =
  process.env.NEXT_PUBLIC_H5_ORIGIN || "https://english-h5.vercel.app";

export const dynamicParams = false;

async function loadArticleList(locale: LocaleCode) {
  try {
    return await getArticleList(locale);
  } catch {
    return [];
  }
}

async function loadArticle(
  date: string,
  locale: LocaleCode,
): Promise<StudyArticle | null> {
  try {
    return await getArticleByDate(date, locale);
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const articles = await loadArticleList("zh-CN");
  return SUPPORTED_LOCALES.flatMap((locale) =>
    articles.map((article) => ({ locale, date: article.date })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; date: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, date } = await params;
  const locale = normalizeLocale(rawLocale);
  const article = await loadArticle(date, locale);

  if (!article) {
    return {
      title: "Article not found",
      robots: { index: false, follow: false },
    };
  }

  const config = getLocaleConfig(locale);
  const title = `${article.date} · ${article.title}`;
  const description = trimSeoDescription(article.summary);
  const path = `/articles/${article.date}`;
  const url = `/${locale}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: buildLanguageAlternates(path),
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: config.ogLocale,
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

export default async function LocaleArticlePage({
  params,
}: {
  params: Promise<{ locale: string; date: string }>;
}) {
  const { locale: rawLocale, date } = await params;
  const locale = normalizeLocale(rawLocale);
  const articles = await loadArticleList(locale);
  const article = await loadArticle(date, locale);

  if (!article) notFound();

  return (
    <>
      <JsonLd data={buildArticleJsonLd(article, siteUrl, locale)} />
      <StudyArticleClient
        article={article}
        articles={articles}
        locale={locale}
      />
    </>
  );
}
