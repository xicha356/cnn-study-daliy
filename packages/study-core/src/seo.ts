import {
  DEFAULT_LOCALE,
  type LocaleCode,
  SUPPORTED_LOCALES,
  getLocaleConfig,
  getUiCopy,
  localePath,
} from "./i18n";
import type { StudyArticle } from "./types";

export const seoSiteName = "cnn 新闻精读";

export const seoSiteDescription =
  "每日 CNN 新闻英语精读，提供双语全文、重点词汇、难句解析、测验和美式发音练习。";

export const seoKeywords = [
  "CNN",
  "CNN 新闻精读",
  "新闻英语",
  "英语精读",
  "英语学习",
  "重点词汇",
  "难句解析",
  "英语听力",
  "双语阅读",
];

export function trimSeoDescription(value: string, maxLength = 150) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > maxLength
    ? `${compact.slice(0, maxLength - 3)}...`
    : compact;
}

export function getArticleText(article: StudyArticle, maxLength = 4000) {
  return article.paragraphs
    .map((paragraph) => paragraph.en)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function siteText(locale: LocaleCode) {
  const copy = getUiCopy(locale);
  return {
    name: copy.siteName,
    description: copy.siteDescription,
  };
}

export function buildLanguageAlternates(path: string) {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, localePath(locale, path)]),
  );
}

export function buildWebsiteJsonLd(
  siteUrl: string,
  locale: LocaleCode = DEFAULT_LOCALE,
) {
  const config = getLocaleConfig(locale);
  const text = siteText(locale);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: text.name,
    alternateName: ["CNN Study", "CNN 英语精读"],
    url: `${siteUrl}${localePath(locale)}`,
    inLanguage: config.htmlLang,
    description: text.description,
  };
}

export function buildLearningAppJsonLd(
  siteUrl: string,
  locale: LocaleCode = DEFAULT_LOCALE,
) {
  const config = getLocaleConfig(locale);
  const text = siteText(locale);
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: text.name,
    url: `${siteUrl}${localePath(locale)}`,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    inLanguage: config.htmlLang,
    description: text.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function buildArticleJsonLd(
  article: StudyArticle,
  siteUrl: string,
  locale: LocaleCode = DEFAULT_LOCALE,
) {
  const config = getLocaleConfig(locale);
  const copy = getUiCopy(locale);
  const url = `${siteUrl}${localePath(locale, `/articles/${article.date}`)}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    name: `${article.date} · ${article.title}`,
    description: trimSeoDescription(article.summary),
    url,
    mainEntityOfPage: url,
    datePublished: article.date,
    dateModified: article.date,
    inLanguage: config.htmlLang,
    isAccessibleForFree: true,
    articleSection: copy.siteName,
    keywords: [
      "CNN",
      copy.siteName,
      ...article.vocabulary.slice(0, 12).map((item) => item.word),
    ].join(", "),
    author: {
      "@type": "Organization",
      name: copy.siteName,
      url: `${siteUrl}${localePath(locale)}`,
    },
    publisher: {
      "@type": "Organization",
      name: copy.siteName,
      url: `${siteUrl}${localePath(locale)}`,
    },
    about: article.topics.slice(0, 5).map((topic) => ({
      "@type": "Thing",
      name: topic.title,
      description: topic.content,
    })),
    articleBody: getArticleText(article),
  };
}
