import { getArticleList } from "@study/core/data";
import {
  type LocaleCode,
  SUPPORTED_LOCALES,
  getUiCopy,
  normalizeLocale,
} from "@study/core/i18n";
import { buildLanguageAlternates } from "@study/core/seo";
import type { ArticleIndexItem } from "@study/core/types";
import type { Metadata } from "next";
import { ArticleListPage } from "../../components/ArticleListPage";

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

  return {
    title: copy.articleLibrary,
    description: copy.siteDescription,
    alternates: {
      canonical: `/${locale}/articles`,
      languages: buildLanguageAlternates("/articles"),
    },
  };
}

export default async function LocaleArticlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const articles = await loadArticles(locale);

  return <ArticleListPage articles={articles} locale={locale} />;
}
