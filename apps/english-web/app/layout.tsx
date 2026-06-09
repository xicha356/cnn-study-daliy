import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CNN Study Daily",
  description: "PC English study workspace for CNN daily articles",
};

function DeviceRedirectScript() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const h5Origin = process.env.NEXT_PUBLIC_H5_ORIGIN || "";
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
        if (!suffix || suffix === '/') suffix = '/';
        var target = (h5Origin || (base + '/h5')) + suffix + window.location.search + window.location.hash;
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
