import { compile, run } from "@mdx-js/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentType } from "react";
import * as runtime from "react/jsx-runtime";
import { loadDoc } from "@/lib/docs/load-doc";
import { rehypePlugins, remarkPlugins } from "@/lib/docs/mdx-plugins";
import type { DocFrontmatter } from "@/lib/docs/types";
import { mdxComponents } from "@/mdx-components";

export type RenderedDoc = {
  Content: ComponentType<{ components?: MDXComponents }>;
  frontmatter: DocFrontmatter;
  relativePath: string;
  components: MDXComponents;
};

export async function renderDoc(
  relativePath: string,
  componentOverrides: MDXComponents = {},
): Promise<RenderedDoc> {
  const { content, frontmatter, relativePath: path } = loadDoc(relativePath);
  const components = { ...mdxComponents, ...componentOverrides };

  const compiled = await compile(content, {
    outputFormat: "function-body",
    remarkPlugins,
    rehypePlugins,
  });

  const { default: Content } = await run(compiled, {
    ...runtime,
    ...components,
  });

  return { Content, frontmatter, relativePath: path, components };
}
