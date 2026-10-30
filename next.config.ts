import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  allowedDevOrigins: ["192.168.34.252", "gub.manova.space"],
  experimental: {
    // Turbopack in-memory cache eviction (Next.js 16.3+). 'auto' evicts cached
    // computation results under OS memory pressure, lowering dev RSS.
    turbopackMemoryEviction: "auto",
  },
};

// ponytail: string plugin names required for Turbopack serialization; runtime compile uses mdx-plugins.ts
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-slug"],
  },
});

export default withMDX(nextConfig);
