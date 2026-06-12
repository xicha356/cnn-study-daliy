import { getArticleList } from "@study/core/data";
import { SUPPORTED_LOCALES, localePath } from "@study/core/i18n";
import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_H5_ORIGIN || "https://english-h5.vercel.app";
const siteBase = siteUrl.replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getArticleList();
  return [
    {
      url: `${siteBase}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...SUPPORTED_LOCALES.map((locale) => ({
      url: `${siteBase}${localePath(locale)}/`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.95,
    })),
    ...SUPPORTED_LOCALES.flatMap((locale) =>
      ["/articles", "/settings"].map((path) => ({
        url: `${siteBase}${localePath(locale, path)}/`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ),
    ...SUPPORTED_LOCALES.flatMap((locale) =>
      articles.map((article) => ({
        url: `${siteBase}${localePath(locale, `/articles/${article.date}`)}/`,
        lastModified: new Date(`${article.date}T00:00:00.000Z`),
        changeFrequency: "weekly" as const,
        priority: 0.85,
      })),
    ),
    ...articles.map((article) => ({
      url: `${siteBase}/articles/${article.date}/`,
      lastModified: new Date(`${article.date}T00:00:00.000Z`),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
  ];
}
