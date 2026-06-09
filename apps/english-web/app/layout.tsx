import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CNN Study Daily",
  description: "PC English study workspace for CNN daily articles",
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
