import { getArticleList } from "@study/core/data";
import { buildLearningAppJsonLd, buildWebsiteJsonLd } from "@study/core/seo";
import type { ArticleIndexItem } from "@study/core/types";
import type { Metadata } from "next";
import { HomePage } from "./components/HomePage";
import { JsonLd } from "./components/JsonLd";

const siteUrl =
  process.env.NEXT_PUBLIC_H5_ORIGIN || "https://english-h5.vercel.app";

export const metadata: Metadata = {
  title: "cnn 新闻精读",
  description:
    "适合手机阅读的 CNN 新闻英语精读，包含双语全文、重点词汇、难句解析、测验和发音练习。",
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
      <JsonLd data={buildWebsiteJsonLd(siteUrl)} />
      <JsonLd data={buildLearningAppJsonLd(siteUrl)} />
      <HomePage articles={articles} />
    </>
  );
}
