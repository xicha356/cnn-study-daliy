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
import { HomePage } from "../components/HomePage";
import { JsonLd } from "../components/JsonLd";

const siteUrl =
  process.env.NEXT_PUBLIC_H5_ORIGIN || "https://english-h5.vercel.app";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

async function loadArticles(locale: LocaleCode): Promise<ArticleIndexItem[]> {
  try {
    const articles = await getArticleList(locale);
    return [...articles].sort((a, b) => b.date.localeCompare(a.date));
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
      <HomePage articles={articles} locale={locale} />
    </>
  );
}
