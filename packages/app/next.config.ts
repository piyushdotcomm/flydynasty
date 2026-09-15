import type { NextConfig } from "next";

/**
 * Static export: the site is a pure client-side app that plays back
 * precomputed model traces (packages/app/public/data/). No server runtime is
 * claimed or needed. NEXT_PUBLIC_BASE_PATH supports GitHub Pages project sites
 * (e.g. /flydynasty); leave empty for a custom domain / root deploy.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
