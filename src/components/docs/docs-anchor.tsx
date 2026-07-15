"use client"

import Link from "next/link"
import type { ComponentPropsWithoutRef } from "react"

import { useDocsFromPath } from "@/components/docs/docs-link-context"
import { resolveDocHref } from "@/lib/docs/resolve-doc-href"

export function DocsAnchor({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
  const fromPath = useDocsFromPath()

  if (!href) {
    return <a {...props}>{children}</a>
  }

  if (href.startsWith("#")) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }

  const internal =
    fromPath !== null ? resolveDocHref(fromPath, href) : href.startsWith("/") ? href : null

  if (internal) {
    return (
      <Link href={internal} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  )
}
