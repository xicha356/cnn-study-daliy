import { getArticleList } from "@study/core/data";
import { DEFAULT_LOCALE, getUiCopy } from "@study/core/i18n";
import { buildLearningAppJsonLd, buildWebsiteJsonLd } from "@study/core/seo";
import type { ArticleIndexItem } from "@study/core/types";
import { LocaleRedirectScript } from "@study/ui/LocaleRedirectScript";
import type { Metadata } from "next";
import { HomePage } from "./components/HomePage";
import { JsonLd } from "./components/JsonLd";

const siteUrl =
  process.env.NEXT_PUBLIC_H5_ORIGIN || "https://english-h5.vercel.app";

const copy = getUiCopy(DEFAULT_LOCALE);

export const metadata: Metadata = {
  title: copy.siteName,
  description: copy.siteDescription,
  alternates: {
    canonical: "/",
  },
};

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
  return (
    <>
      <LocaleRedirectScript />
      <JsonLd data={buildWebsiteJsonLd(siteUrl, DEFAULT_LOCALE)} />
      <JsonLd data={buildLearningAppJsonLd(siteUrl, DEFAULT_LOCALE)} />
      <HomePage articles={articles} locale={DEFAULT_LOCALE} />
    </>
  );
}
