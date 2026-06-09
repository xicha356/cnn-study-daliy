import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
  output: "export",
  reactStrictMode: true,
  transpilePackages: ["@study/core", "@study/ui"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
