import { compile, run } from "@mdx-js/mdx"
import * as runtime from "react/jsx-runtime"
import type { MDXComponents } from "mdx/types"
import type { ComponentType } from "react"

import { mdxComponents } from "@/mdx-components"
import { loadDoc } from "@/lib/docs/load-doc"
import { remarkPlugins, rehypePlugins } from "@/lib/docs/mdx-plugins"
import type { DocFrontmatter } from "@/lib/docs/types"

export type RenderedDoc = {
  Content: ComponentType
  frontmatter: DocFrontmatter
  relativePath: string
}

export async function renderDoc(
  relativePath: string,
  componentOverrides: MDXComponents = {},
): Promise<RenderedDoc> {
  const { content, frontmatter, relativePath: path } = loadDoc(relativePath)

  const compiled = await compile(content, {
    outputFormat: "function-body",
    remarkPlugins,
    rehypePlugins,
  })

  const { default: Content } = await run(compiled, {
    ...runtime,
    ...mdxComponents,
    ...componentOverrides,
  })

  return { Content, frontmatter, relativePath: path }
}
