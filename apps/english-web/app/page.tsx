import { getArticleList } from "@study/core/data";
import { buildLearningAppJsonLd, buildWebsiteJsonLd } from "@study/core/seo";
import type { ArticleIndexItem } from "@study/core/types";
import type { Metadata } from "next";
import { HomeClient } from "./components/HomeClient";
import { JsonLd } from "./components/JsonLd";

const siteUrl =
  process.env.NEXT_PUBLIC_WEB_ORIGIN || "https://english-web-phi.vercel.app";

export const metadata: Metadata = {
  title: "cnn 新闻精读",
  description:
    "每日 CNN 新闻英语精读，按日期整理双语文章、重点词汇、难句解析、测验和美式发音。",
  alternates: {
    canonical: "/",
  },
};

async function loadArticles(): Promise<ArticleIndexItem[]> {
  try {
    return await getArticleList();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const articles = await loadArticles();
  return (
    <>
      <JsonLd data={buildWebsiteJsonLd(siteUrl)} />
      <JsonLd data={buildLearningAppJsonLd(siteUrl)} />
      <HomeClient articles={articles} />
    </>
  );
}
