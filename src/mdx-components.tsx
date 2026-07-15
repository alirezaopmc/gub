import type { MDXComponents } from "mdx/types"
import type { ComponentPropsWithoutRef } from "react"

import { DocsAnchor } from "@/components/docs/docs-anchor"
import { DocsPre } from "@/components/docs/docs-pre"

const components = {
  h1: ({ children, ...props }: ComponentPropsWithoutRef<"h1">) => (
    <h1 className="font-headline text-3xl" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="font-headline text-2xl" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="font-headline text-xl" {...props}>
      {children}
    </h3>
  ),
  a: DocsAnchor,
  pre: DocsPre,
} satisfies MDXComponents

export const mdxComponents: MDXComponents = components

export function useMDXComponents(overrides: MDXComponents = {}): MDXComponents {
  return { ...mdxComponents, ...overrides }
}
