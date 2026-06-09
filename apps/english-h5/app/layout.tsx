import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteName = "cnn 新闻精读";
const siteDescription =
  "每日 CNN 新闻英语精读移动端，提供双语全文、重点词汇、难句解析、测验和美式发音练习。";
const siteUrl =
  process.env.NEXT_PUBLIC_H5_ORIGIN || "https://english-h5.vercel.app";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

function ThemeScript() {
  const code = `
    try {
      var stored = window.localStorage.getItem('cnn_theme');
      var theme = stored === 'dark' || stored === 'light'
        ? stored
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.dataset.theme = theme;
    } catch (_) {
      document.documentElement.dataset.theme = 'light';
    }
  `;

  // biome-ignore lint/security/noDangerouslySetInnerHtml: inline theme bootstrapping avoids a visible light/dark flash.
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

function DeviceRedirectScript() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const webOrigin =
    process.env.NEXT_PUBLIC_WEB_ORIGIN || "https://english-web-phi.vercel.app";
  const code = `
    (function () {
      try {
        var params = new URLSearchParams(window.location.search);
        if (params.get('force') === 'h5') return;
        var isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent)
          || window.matchMedia('(max-width: 767px)').matches;
        if (isMobile) return;
        var base = ${JSON.stringify(basePath)};
        var webOrigin = ${JSON.stringify(webOrigin)};
        var desktopBase = webOrigin || base.replace(/\\/h5\\/?$/, '');
        var path = window.location.pathname;
        var suffix = path.indexOf(base) === 0 ? path.slice(base.length) : '/';
        if (!suffix || suffix === '/') suffix = '/';
        var target = desktopBase + suffix + window.location.search + window.location.hash;
        window.location.replace(target);
      } catch (_) {}
    })();
  `;

  // biome-ignore lint/security/noDangerouslySetInnerHtml: static-export device routing must run before React hydration.
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <DeviceRedirectScript />
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
