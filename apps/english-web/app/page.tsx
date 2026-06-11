import { getArticleList } from "@study/core/data";
import { DEFAULT_LOCALE, getUiCopy } from "@study/core/i18n";
import { buildLearningAppJsonLd, buildWebsiteJsonLd } from "@study/core/seo";
import type { ArticleIndexItem } from "@study/core/types";
import { LocaleRedirectScript } from "@study/ui/LocaleRedirectScript";
import type { Metadata } from "next";
import { HomeClient } from "./components/HomeClient";
import { JsonLd } from "./components/JsonLd";

const siteUrl =
  process.env.NEXT_PUBLIC_WEB_ORIGIN || "https://english-web-phi.vercel.app";

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
    return await getArticleList(DEFAULT_LOCALE);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const articles = await loadArticles();
  return (
    <>
      <LocaleRedirectScript />
      <JsonLd data={buildWebsiteJsonLd(siteUrl, DEFAULT_LOCALE)} />
      <JsonLd data={buildLearningAppJsonLd(siteUrl, DEFAULT_LOCALE)} />
      <HomeClient articles={articles} locale={DEFAULT_LOCALE} />
    </>
  );
}
