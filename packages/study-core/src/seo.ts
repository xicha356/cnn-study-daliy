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

export function buildWebsiteJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: seoSiteName,
    alternateName: ["CNN Study", "CNN 英语精读"],
    url: siteUrl,
    inLanguage: "zh-CN",
    description: seoSiteDescription,
  };
}

export function buildLearningAppJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: seoSiteName,
    url: siteUrl,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    inLanguage: "zh-CN",
    description: seoSiteDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function buildArticleJsonLd(article: StudyArticle, siteUrl: string) {
  const url = `${siteUrl}/articles/${article.date}`;
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
    inLanguage: "zh-CN",
    isAccessibleForFree: true,
    articleSection: "新闻英语精读",
    keywords: [
      "CNN",
      "新闻英语",
      "英语精读",
      ...article.vocabulary.slice(0, 12).map((item) => item.word),
    ].join(", "),
    author: {
      "@type": "Organization",
      name: seoSiteName,
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: seoSiteName,
      url: siteUrl,
    },
    about: article.topics.slice(0, 5).map((topic) => ({
      "@type": "Thing",
      name: topic.title,
      description: topic.content,
    })),
    articleBody: getArticleText(article),
  };
}
