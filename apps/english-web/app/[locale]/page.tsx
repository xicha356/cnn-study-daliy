import { getArticleList } from "@study/core/data";
import {
  type LocaleCode,
  SUPPORTED_LOCALES,
  getLocaleConfig,
  getUiCopy,
  normalizeLocale,
} from "@study/core/i18n";
import {
  buildLanguageAlternates,
  buildLearningAppJsonLd,
  buildWebsiteJsonLd,
} from "@study/core/seo";
import type { ArticleIndexItem } from "@study/core/types";
import type { Metadata } from "next";
import { HomeClient } from "../components/HomeClient";
import { JsonLd } from "../components/JsonLd";

const siteUrl =
  process.env.NEXT_PUBLIC_WEB_ORIGIN || "https://english-web-phi.vercel.app";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

async function loadArticles(locale: LocaleCode): Promise<ArticleIndexItem[]> {
  try {
    return await getArticleList(locale);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const copy = getUiCopy(locale);
  const config = getLocaleConfig(locale);

  return {
    title: copy.siteName,
    description: copy.siteDescription,
    alternates: {
      canonical: `/${locale}`,
      languages: buildLanguageAlternates("/"),
    },
    openGraph: {
      title: copy.siteName,
      description: copy.siteDescription,
      url: `/${locale}`,
      locale: config.ogLocale,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: copy.siteName,
      description: copy.siteDescription,
    },
  };
}

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const articles = await loadArticles(locale);

  return (
    <>
      <JsonLd data={buildWebsiteJsonLd(siteUrl, locale)} />
      <JsonLd data={buildLearningAppJsonLd(siteUrl, locale)} />
      <HomeClient articles={articles} locale={locale} />
    </>
  );
}
