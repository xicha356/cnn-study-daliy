import { getArticleList } from "@study/core/data";
import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_WEB_ORIGIN || "https://english-web-phi.vercel.app";
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
    ...articles.map((article) => ({
      url: `${siteBase}/articles/${article.date}/`,
      lastModified: new Date(`${article.date}T00:00:00.000Z`),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
  ];
}
