import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isStaticExport = process.env.NEXT_OUTPUT_EXPORT === "true";

const nextConfig: NextConfig = {
  basePath,
  ...(isStaticExport ? { output: "export" } : {}),
  trailingSlash: true,
  reactStrictMode: true,
  transpilePackages: ["@study/core", "@study/ui"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
