import createMDX from "@next/mdx"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.34.252"],
}

// ponytail: string plugin names required for Turbopack serialization; runtime compile uses mdx-plugins.ts
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-slug"],
  },
})

export default withMDX(nextConfig)
