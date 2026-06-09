import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteName = "cnn 新闻精读";
const siteDescription =
  "每日 CNN 新闻英语精读，提供双语全文、重点词汇、难句解析、测验和美式发音练习。";
const siteUrl =
  process.env.NEXT_PUBLIC_WEB_ORIGIN || "https://english-web-phi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "CNN",
    "新闻英语",
    "英语精读",
    "英语学习",
    "重点词汇",
    "难句解析",
    "英语听力",
  ],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: "/",
    siteName,
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteName,
    description: siteDescription,
  },
};

function DeviceRedirectScript() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const h5Origin =
    process.env.NEXT_PUBLIC_H5_ORIGIN || "https://english-h5.vercel.app";
  const code = `
    (function () {
      try {
        var params = new URLSearchParams(window.location.search);
        if (params.get('force') === 'pc') return;
        var isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent)
          || window.matchMedia('(max-width: 767px)').matches;
        if (!isMobile) return;
        var base = ${JSON.stringify(basePath)};
        var h5Origin = ${JSON.stringify(h5Origin)};
        var path = window.location.pathname;
        var suffix = path.indexOf(base) === 0 ? path.slice(base.length) : path;
        while (suffix.indexOf('/h5/') === 0 || suffix === '/h5') {
          suffix = suffix.slice(3) || '/';
        }
        if (!suffix || suffix === '/') suffix = '/';
        var h5Base = h5Origin || (base ? base + '/h5' : '');
        if (!h5Base && (path.indexOf('/h5/') === 0 || path === '/h5')) return;
        var target = (h5Base || '/h5') + suffix + window.location.search + window.location.hash;
        if (target === window.location.pathname + window.location.search + window.location.hash) return;
        window.location.replace(target);
      } catch (_) {}
    })();
  `;

  // biome-ignore lint/security/noDangerouslySetInnerHtml: static-export device routing must run before React hydration.
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-theme="light">
      <body>
        <DeviceRedirectScript />
        {children}
      </body>
    </html>
  );
}
